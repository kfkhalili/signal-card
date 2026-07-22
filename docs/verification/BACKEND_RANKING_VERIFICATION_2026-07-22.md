# Backend and Ranking Verification — 2026-07-22

## Outcome

The full migration chain and the targeted backend verification suite pass after
the corrections recorded below.

- PostgreSQL: 15.8
- Supabase CLI: 2.33.9
- Applied migrations: 92
- First migration: `20250126000000`
- Last migration: `20260722010000`
- Deterministic database suite: PASS
- Sanitized production-snapshot migration rehearsal: PASS
- Public-schema database lint at error level: PASS
- Heartbeat unit suite: 10/10 tests PASS
- FMP requests made by verification: 0

Two volume profiles were tested: an 18,000-symbol deterministic synthetic
worst-case fixture and a sanitized, data-only production snapshot containing
17,983 listed symbols and 5,271 scored symbols. No upstream data was hydrated.

## Zero-FMP controls

The verification database used a separate temporary Supabase project ID. The
pre-existing local PostgreSQL 15 volume was not modified or deleted.

Before database tests and again after each reset:

1. All rows in `cron.job` were set to `active = false`.
2. The Edge Runtime and other API-facing Supabase services were stopped; only
   the isolated PostgreSQL container was running.
3. The local Vault was checked for `project_url`, Supabase authorization keys,
   and FMP key names. No matching secrets existed.
4. `net._http_response` contained zero rows.
5. The test suite asserted the disabled-cron and empty-secret conditions before
   loading any fixtures.

The final preflight result was 0 active jobs, 0 callable secrets, and 0 queued
HTTP responses.

## Production-like snapshot rehearsal

The repository is linked to `Tickered-PROD`; no separate staging project was
available. A guarded script was run from an authenticated terminal to create a
data-only snapshot through PostgreSQL. It did not invoke Edge Functions or FMP.

`scripts/export-ranking-snapshot.sh`:

- verifies the expected linked project reference;
- discovers all remote `public` tables from a schema-only dump;
- excludes every table except `profiles`, `listed_symbols`,
  `exchange_variants`, and `compass_pillar_scores` before the data dump;
- rejects unexpected table targets and protected schemas, and strips unrelated
  sequence state emitted by `pg_dump` for excluded tables;
- removes PostgreSQL 17 `psql` restrict wrappers so the data-only file restores
  through the project's PostgreSQL 15 client, removes the PostgreSQL 17-only
  `transaction_timeout` session setting, and rejects any other psql
  meta-command outside a `COPY` payload;
- refuses to write production-derived data inside the repository;
- writes the dump and checksum manifest with mode `0600`.

The 29.7 MB snapshot contained only:

| Table | Rows |
| --- | ---: |
| `profiles` | 17,980 |
| `listed_symbols` | 17,983 |
| `exchange_variants` | 20,616 |
| `compass_pillar_scores` | 5,271 |

The checksum matched its manifest. Two unrelated sequence-state statements,
two PostgreSQL 17 `psql` restrict wrappers, and one PostgreSQL 17-only session
setting were removed before restoring through PostgreSQL 15. The compatible
copy was validated to contain no other psql meta-command outside `COPY` data.

After restore, `auth.users`, `public.user_profiles`, and `api_call_queue_v2`
all contained zero rows. Exchange variants had zero orphaned profile references;
score rows had zero missing listing references and zero inactive listings.

## Migration order and reproducibility

The original clean replay stopped on migrations that relied on an implicit
`search_path`. Corrections were made to:

- schema-qualify and make the `exchange_variants` Realtime publication update
  idempotent;
- schema-qualify historical function DDL and related grants/comments;
- schema-qualify the `deactivate_problematic_symbols` data migration.

After these corrections, the chain applied from the first migration through
`20260722010000` on a clean database. A subsequent `supabase db reset` rebuilt
the database and replayed all 92 migrations successfully.

The production-like migration rehearsal then reset the isolated database only
through `20260719222320`, restored the sanitized snapshot, and applied the two
pending migrations with `supabase migration up --local`. Both
`20260722000000` and `20260722010000` applied cleanly over the populated tables,
and all four snapshot row counts were unchanged afterward.

There are no duplicate migration versions. The unusually early
`20250126000000` migration defines a PL/pgSQL function whose referenced tables
are created later. PostgreSQL defers validation of those function-body table
references, and later migrations replace the function, so the clean replay is
successful. Renaming an already-deployed migration is not recommended.

### Idempotency interpretation

Operational idempotency is provided by the Supabase migration-history table:
already recorded versions are not applied again. Individual historical SQL
files are not all safe to execute manually twice outside the migration runner.
The clean reset/replay and scheduler-uniqueness checks passed; raw repeated
execution of every historical file is not a supported deployment procedure.

## Rollback audit

The repository does not contain a complete set of down migrations. The safe
rollback model is therefore backup/restore or a tested roll-forward migration,
not reverse execution of historical files.

Recommended deployment procedure:

1. Record the current migration version and take a database backup/snapshot.
2. Quiesce application schedulers and queue consumers for migrations that
   replace queue or ranking functions.
3. Apply migrations with the Supabase migration runner.
4. Run the deterministic smoke suite against a restored/staging database.
5. If validation fails before production traffic resumes, restore the snapshot.
   After traffic resumes, prefer a corrective forward migration to avoid losing
   newly written data.
6. Re-enable schedulers only after checking job uniqueness, Vault configuration,
   and queue health.

This lack of automated down migrations is a remaining operational limitation,
not a clean-replay failure.

## Ranking verification

`20260722000000_harden_compass_leaderboard.sql` addresses findings from the
manual fixture:

- excludes inactive symbols even if stale rows remain in
  `compass_pillar_scores`;
- sorts incomplete/null composite scores after complete scores;
- makes tie ordering deterministic by symbol;
- treats exchange filter values case-insensitively;
- preserves null and empty-array filter semantics.

The fixture manually calculated eight equally weighted normalized metrics:

- `VFY_ALPHA`: eight scores of 80, expected composite 80.00;
- `VFY_GAMMA`: alternating 100 and 0, expected composite 50.00;
- `VFY_BETA`: excluded because `listed_symbols.is_active = false`;
- `VFY_NULL`: retained but sorted after complete scores.

Both manual scores matched exactly. Industry-only, exchange-only, combined,
null, and empty-array filters passed on both the clean and populated databases.
The transactional fixture uses verification-only industry names so production
top-50 cutoff behavior cannot hide its manually calculated rows.

## Scheduler, queue, freshness, and stale quotes

The final schema contains 12 uniquely named cron jobs and no duplicate names.
The verification database kept all 12 inactive.

Lock contracts:

- staleness checker: advisory lock 42;
- scheduled refresh queueing: advisory lock 43;
- processor invoker: advisory lock 44;
- per-symbol/data-type queue creation: transaction-scoped advisory lock derived
  from the symbol and data type.

Actual contention was tested by holding advisory lock 43 in a second database
session. `queue_scheduled_refreshes_v2()` returned 0 within a two-second
statement timeout rather than waiting or creating overlapping work.

`20260722010000_harden_queue_scheduler.sql` fixes runtime issues found by the
database linter and then confirmed against the function definitions:

- creates the missing per-minute `api_calls_rate_tracker` table;
- supplies a durable 20 GiB quota fallback when no database setting exists;
- removes ambiguous output-column references from atomic queue claiming;
- fixes multi-row stuck-job recovery;
- serializes concurrent queue creation for the same symbol/data type;
- treats `pg_net.http_post` as asynchronous and returns its request ID;
- calculates quota alerts from `data_size_bytes` and `recorded_at`.

Runtime tests passed for 300-calls/minute enforcement, safety-buffer behavior,
queue idempotency, priority promotion, two-job atomic claiming, stuck-job
recovery, quota reporting, and quota alerts.

The heartbeat unit suite passed all 10 cases for one-minute heartbeats,
five-minute cleanup, unmount behavior, and stale detection. The current database
presence adapter was also called successfully on an empty Realtime subscription
set.

Freshness was verified by inserting a deterministic successful cron-history row
inside a rolled-back test transaction. `get_compass_freshness()` returned the
exact expected `end_time`.

Closed-market quote behavior passed:

- a five-minute-old quote was skipped;
- a 25-hour-old quote bypassed the closed-market gate and queued;
- a missing quote queued regardless of exchange status;
- repeating the stale request kept one active queue job and promoted priority.

## Query plans and latency baseline

The synthetic benchmark transaction generated and analyzed 18,000 symbols,
with 95% active symbols, four industries, three exchanges, and deterministic
score distributions. The transaction was rolled back afterward.

| Synthetic query | Rows | Execution time | Shared buffers |
| --- | ---: | ---: | ---: |
| Unfiltered leaderboard | 50 | 13.039 ms | 955 hits |
| Technology/Healthcare + NASDAQ/NYSE | 50 | 58.263 ms | 75,819 hits |

The sanitized snapshot had 5,271 active and scored symbols, 20,616 exchange
variants, and zero incomplete score rows. The repeated filtered case selected
the two largest industries (`Biotechnology` and `Banks - Regional`) and the two
largest exchanges (`NASDAQ` and `NYSE`). Thirty warm-cache samples of each query
shape were alternated to reduce ordering bias.

| Snapshot query | Samples | p50 | p95 | Maximum | Plan time | Shared buffers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unfiltered | 30 | 4.307 ms | 4.503 ms | 4.590 ms | 4.500 ms | 198 hits |
| Top-2 industries + exchanges | 30 | 8.937 ms | 9.032 ms | 9.652 ms | 9.288 ms | 329 hits |

The plans appear as `Function Scan on get_weighted_leaderboard` because the RPC
is implemented in PL/pgSQL. The 18,000-scored-symbol synthetic case remains a
useful stress baseline; the actual production data distribution is materially
faster. These are server-side, single-host regression measurements, not an API
p95/p99 SLO.

## Updated readiness assessment

Overall technical readiness increases from 8.1/10 to **8.6/10**.

| Area | Score | Evidence / remaining gap |
| --- | ---: | --- |
| Migration safety | 9.0 | Clean replay plus pre-hardening snapshot restore and forward migration passed. |
| Ranking correctness | 9.2 | Manual scores, active/missing-data behavior, and all filter forms pass on clean and populated data. |
| Scheduler and concurrency | 8.8 | Uniqueness, advisory-lock contention, rate limiting, recovery, and stale-quote paths pass. |
| Leaderboard performance | 8.8 | Snapshot p95 is below 10 ms for both measured query shapes; API/network SLO remains unmeasured. |
| Data/quota safety | 9.0 | Allowlisted export, zero user/auth/queue rows, APIs stopped, and zero FMP requests. |
| Rollback and operations | 7.2 | Backup/restore procedure is documented, but automated down migrations and a real staging canary are absent. |

The immediate next step is a reviewable commit/PR followed by a non-production
deployment canary: quiesce schedulers, take a restore point, apply the two
migrations, run the deterministic smoke suite and API-level latency sampling,
then re-enable schedulers after queue/Vault checks. If no staging project is
available, use the same gates in a controlled production maintenance window.

## Reproducible checks

- `supabase/tests/backend_ranking_verification.sql` contains the transactional
  deterministic verification suite and rolls back all fixtures.
- `supabase/tests/backend_ranking_benchmark.sql` contains the transactional
  18,000-symbol benchmark and query-plan capture.
- `supabase/tests/backend_ranking_snapshot_benchmark.sql` contains the guarded
  snapshot coverage check, 30-sample latency run, and query-plan capture.
- `scripts/export-ranking-snapshot.sh` creates the data-only allowlisted snapshot
  without invoking FMP or writing production-derived data into the repository.
- `npm test -- --runInBand supabase/functions/__tests__/heartbeat-system.test.ts`
  runs the heartbeat unit contract.
- `supabase db lint --local --schema public --level error --fail-on error`
  checks project-owned functions. Full-schema lint also reports issues inside
  the installed pgTAP extension; those extension-owned results were excluded
  from the project lint gate.

Do not run any database test SQL file against a linked or production project.
They are intended for an isolated local/restored database with cron disabled
and callable project/FMP secrets absent.
