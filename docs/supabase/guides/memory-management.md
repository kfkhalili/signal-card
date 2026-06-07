# Supabase Memory Management Guide

> **Last updated:** 2026-06-07
> **Compute plan:** Micro (1 GB RAM, 60 max_connections)
> **Instance:** `fqrdybodxzjnhklzsgxx`

## Memory Architecture on Supabase Micro

### What consumes memory (and how much)

| Component | Approx. Commitment | Controllable? |
|-----------|-------------------|---------------|
| PostgreSQL shared memory (`shared_buffers` 256 MB + WAL + locks) | ~310 MB | No |
| PostgreSQL backend processes (~18 total × ~8-10 MB incremental each) | ~150-180 MB | Partially |
| Supabase services (PostgREST, Realtime BEAM VM, GoTrue, Kong, Storage API, Supavisor) | ~800+ MB | No |
| 11 `shared_preload_libraries` loaded per backend | Included above | No |
| **Total baseline commitment** | **~1.5-1.6 GB** | — |
| **Commitment limit** | **1.44 GB** | Upgrade only |

### Key insight (empirically validated 2026-06-07)

**Memory commitment on Micro is determined by the platform's process footprint, NOT by database content.** The following were tested and had **zero measurable impact** on memory commitment:

- Dropping 93 MB of unused indexes
- VACUUM on tables with 490,000 dead tuples
- VACUUM FULL reclaiming ~200 MB of disk space
- Reducing database size from 2,346 MB → 1,540 MB
- Truncating a 647 MB bloated table (`net._http_response`)

The system functions despite exceeding the commitment limit because Linux overcommits memory. The real risk is OOM kills under peak load.

### What DOES move the needle

| Action | Measured impact |
|--------|----------------|
| Reducing PostgreSQL backend connections | ~8-10 MB per backend |
| Upgrading compute plan | Direct RAM increase |
| Contacting Supabase support to tune PostgREST pool | Unknown (not tested) |

### Typical backend connections (steady-state)

```
postgrest                      6-7 backends   (Supabase-managed)
realtime_*                     5-6 backends   (partially configurable)
realtime_replication_connection  1 walsender   (Supabase-managed)
Supabase Storage API             2 backends   (Supabase-managed)
postgres_exporter                1 backend    (Supabase-managed)
(anonymous admin)                1 backend    (Supabase-managed)
────────────────────────────────────────────
Total:                         ~16-18 client backends + 9 background workers
```

## Recurring Maintenance

### Autovacuum tuning (applied 2026-06-07)

Default `autovacuum_vacuum_scale_factor` is 0.2 (20%). For large tables, this means autovacuum doesn't trigger until hundreds of thousands of dead tuples accumulate. Per-table overrides were set:

```sql
-- Large tables: vacuum at 2% dead tuples instead of 20%
ALTER TABLE public.insider_transactions SET (autovacuum_vacuum_scale_factor = 0.02);
ALTER TABLE public.shares_float SET (autovacuum_vacuum_scale_factor = 0.02);

-- Medium tables: vacuum at 5% dead tuples
ALTER TABLE public.grades_historical SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE public.dividend_history SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE public.financial_statements SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE public.live_quote_indicators SET (autovacuum_vacuum_scale_factor = 0.05);
```

### `net._http_response` cleanup

The `pg_net` extension stores HTTP responses from `net.http_post()` calls. Without cleanup, this table bloats rapidly (reached 647 MB with only 1,074 live rows). A cron job cleans it every 5 minutes:

```sql
-- Cron job: clean-pg-net-responses (every 5 min)
DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '5 minutes';
```

**Monitor:** If CPU baseline suddenly climbs back to 40-50%, check `net._http_response` size first:
```sql
SELECT pg_size_pretty(pg_total_relation_size('net._http_response'));
```

### Index hygiene

Unused indexes waste shared_buffers space and slow down writes. Check periodically:

```sql
-- Stats have been tracking since 2025-11-22
SELECT
  schemaname || '.' || indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Dropped on 2026-06-07** (zero scans in 6.5 months):
- `idx_shares_float_updated_at` (38 MB)
- `idx_insider_transactions_reporting_name` (17 MB)
- `idx_api_data_usage_v2_job_id` (9.4 MB)
- `idx_dividend_history_updated_at` (8.9 MB)
- `idx_dividend_history_record_date` (7.0 MB)
- `idx_dividend_history_payment_date` (6.9 MB)
- `idx_grades_historical_updated_at` (5.3 MB)

## Settings Reference

### Realtime settings (dashboard)

| Setting | Value | Notes |
|---------|-------|-------|
| Database connection pool size | **1** | Reduced from 2 (2026-06-07). Controls `realtime_connect` count. |
| Max concurrent clients | 10000 | Default |

### Supavisor pool (dashboard)

| Setting | Value | Notes |
|---------|-------|-------|
| Pool size | **3** | Reduced from 15 (2026-06-07). Max backends per user+db via pooler. |

### Key PostgreSQL settings

| Setting | Value | Notes |
|---------|-------|-------|
| `shared_buffers` | 256 MB | Platform-managed, cannot change |
| `work_mem` | 3.5 MB | Default per-sort operation |
| `maintenance_work_mem` | 64 MB | Used by VACUUM, index builds |
| `max_connections` | 60 | Platform-managed for Micro |
| `effective_cache_size` | 768 MB | Planner hint only, not allocation |
| `statement_timeout` | 2 min | |

## Diagnostic Queries

### Quick health check

```sql
-- Connection count and breakdown
SELECT application_name, COUNT(*) AS backends, string_agg(DISTINCT state, ', ') AS states
FROM pg_stat_activity WHERE backend_type = 'client backend'
GROUP BY application_name ORDER BY backends DESC;

-- Dead tuple accumulation (should be near zero)
SELECT schemaname || '.' || relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables WHERE n_dead_tup > 1000 ORDER BY n_dead_tup DESC;

-- net._http_response size (should be < 10 MB)
SELECT pg_size_pretty(pg_total_relation_size('net._http_response')) AS size,
       (SELECT COUNT(*) FROM net._http_response) AS rows;

-- Cron job health (last 10 minutes)
SELECT j.jobname, d.status, d.start_time,
       EXTRACT(EPOCH FROM (d.end_time - d.start_time))::int AS duration_s,
       LEFT(d.return_message, 80) AS message
FROM cron.job_run_details d JOIN cron.job j ON j.jobid = d.jobid
WHERE d.start_time > NOW() - INTERVAL '10 minutes'
ORDER BY d.start_time DESC LIMIT 20;
```

## Known Gotchas

1. **`SET LOCAL work_mem` in functions** — If a function sets `work_mem` to a high value, every sort/hash in that query can allocate up to that amount. With N window functions, peak is N × work_mem. Keep it ≤ 32 MB on Micro.

2. **`realtime.subscription.created_at` type** — The column is `timestamp` (without TZ), but Supabase docs imply `timestamptz`. Functions reading from this table must cast explicitly: `rs.created_at::timestamptz`.

3. **Cron job startup timeouts** — When PostgreSQL is under memory pressure, pg_cron can't spawn backends, causing "job startup timeout" errors. This cascades: all per-minute cron jobs fail simultaneously. If you see timeout clusters in cron logs, check memory pressure.

4. **`api_call_queue_v2_pending` index bloat** — This table has 0 rows but 18 MB of indexes (from constant INSERT/DELETE churn). The indexes maintain their file size even when empty. Run `REINDEX TABLE CONCURRENTLY public.api_call_queue_v2_pending;` if it grows excessive.
