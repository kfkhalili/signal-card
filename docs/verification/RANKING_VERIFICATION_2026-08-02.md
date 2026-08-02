# Compass Ranking Verification — 2026-08-02

## Outcome

The current Compass ranking function passed deterministic score, eligibility,
filter, and missing-data checks on both a clean PostgreSQL 17 database and a
fresh allowlisted production-like snapshot. The snapshot benchmark also
establishes a new query-plan and server-side latency baseline.

- PostgreSQL: 17.6
- Supabase CLI used by the project: 2.111.0
- FMP requests made: 0
- Clean-database ranking verification: PASS
- Production-like snapshot ranking verification: PASS
- Synthetic and snapshot benchmarks: COMPLETE

The snapshot export contained only `profiles`, `listed_symbols`,
`exchange_variants`, and `compass_pillar_scores`. Cron, Edge Runtime, and
callable Vault secrets were disabled or absent throughout local execution.

## Manual score calculations

The fixture validates the exact metric-to-weight mapping rather than trusting
the leaderboard output as its own oracle.

| Symbol | Calculation | Expected | Actual |
| --- | --- | ---: | ---: |
| `VFY_ALPHA` | Eight normalized metrics at 80, each weighted 0.125 | 80.00 | 80.00 |
| `VFY_GAMMA` | Four metrics at 100 and four at 0, each weighted 0.125 | 50.00 | 50.00 |
| `VFY_WEIGHTED` | `10×.05 + 20×.10 + 30×.15 + 40×.20 + 50×.10 + 60×.15 + 70×.10 + 80×.15` | 48.00 | 48.00 |

The expected order was `VFY_ALPHA`, `VFY_GAMMA`, `VFY_WEIGHTED`, then
`VFY_NULL`; it matched exactly on the clean and populated databases.

## Filters, eligibility, and missing data

The following contracts passed:

- industry-only, exchange-only, and combined filters;
- case-insensitive exchange values;
- `NULL` and empty filter arrays both mean no filter;
- nonmatching filters return no rows;
- curated inactive symbols are excluded;
- symbols confirmed inactive by the FMP universe snapshot are excluded;
- eligible symbols without a score row are excluded;
- a row with one missing normalized metric receives a null composite score and
  sorts after complete scores.

The fresh snapshot contained:

| Measure | Rows |
| --- | ---: |
| Profiles | 17,980 |
| Listed symbols | 17,983 |
| Curated active symbols | 5,271 |
| Leaderboard-eligible after FMP status | 5,168 |
| FMP-confirmed inactive among curated active | 103 |
| Exchange variants | 23,745 |
| Scored symbols | 5,271 |
| Incomplete normalized score rows | 0 |
| Orphan score / variant rows | 0 / 0 |
| Auth users / queued jobs in snapshot database | 0 / 0 |

## Query plan and latency baseline

All timings are server-side warm-cache measurements on the same local host.
They are regression baselines, not public API SLOs.

### Production-like snapshot

The filtered case used the two largest industries (`Biotechnology` and
`Banks - Regional`) and exchanges (`NASDAQ` and `NYSE`). One hundred samples of each
shape were alternated after warm-up.

| Query | Samples | p50 | p95 | Maximum | Recorded plan time |
| --- | ---: | ---: | ---: | ---: | ---: |
| Unfiltered | 100 | 4.546 ms | 5.834 ms | 11.498 ms | 4.586 ms |
| Top-two industries and exchanges | 100 | 15.207 ms | 19.568 ms | 26.155 ms | 15.050 ms |

The unfiltered nested plan uses sequential scans of the 5,271 score rows and
17,983 listing rows, a hash join producing 5,168 eligible rows, and a 45 KB
top-N heapsort for the best 50.

The filtered nested plan scans the eligible listing set, probes the score
primary key, and uses an index-only exchange-variant lookup for matching
industries. It produced 912 candidates before a 42 KB top-N sort. PostgreSQL
estimated only 7 candidates, so filtered cardinality estimation is the main
plan characteristic to watch as the universe grows; current latency remains
well within the recorded baseline.

### Synthetic 18,000-symbol stress fixture

| Query | Rows returned | Execution time | Shared-buffer hits |
| --- | ---: | ---: | ---: |
| Unfiltered | 50 | 18.711 ms | 989 |
| Two industries and two exchanges | 50 | 36.574 ms | 75,815 |

For comparable future local runs, investigate if snapshot p95 exceeds roughly
twice this baseline (12 ms unfiltered or 39 ms filtered), or if the filtered
plan stops using indexed symbol/exchange lookups. These are regression review
triggers, not user-facing latency guarantees.

## Reproducible checks

- `supabase/tests/backend_ranking_verification.sql` contains the transactional
  manual calculations and behavior checks.
- `supabase/tests/backend_ranking_benchmark.sql` contains the rolled-back
  18,000-symbol stress benchmark.
- `supabase/tests/backend_ranking_snapshot_benchmark.sql` contains the guarded
  100-sample production-like benchmark.
- `scripts/export-ranking-snapshot.sh` creates the four-table data-only export,
  rejects protected schemas, and records `fmp_requests=0` in its manifest.

Do not run these fixture files against a linked or production database. They
are intended only for an isolated local database with outbound execution paths
disabled.
