# Monitoring Queries for On-Demand API System

**Purpose:** SQL queries for monitoring system health, performance, and operational metrics.

---

## Queue Health Monitoring

### 1. Queue Success Rate

**Alert Threshold:** <90% success rate

```sql
-- Calculate queue success rate over last 24 hours
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) as success_rate_percent,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Alert Condition:**
```sql
-- Returns rows if success rate < 90%
SELECT
  'ALERT: Queue success rate below 90%' as alert,
  success_rate_percent,
  completed_count,
  failed_count
FROM (
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) as success_rate_percent,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
  FROM api_call_queue_v2
  WHERE created_at > NOW() - INTERVAL '24 hours'
) sub
WHERE success_rate_percent < 90;
```

### 2. Failed Jobs Analysis

```sql
-- Analyze failed jobs by data type
SELECT
  data_type,
  COUNT(*) as failed_count,
  COUNT(DISTINCT symbol) as affected_symbols,
  STRING_AGG(DISTINCT LEFT(error_message, 100), '; ') as error_samples
FROM api_call_queue_v2
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
ORDER BY failed_count DESC;
```

### 3. Stuck Jobs Detection

**Alert Threshold:** >10 stuck jobs

```sql
-- Find jobs stuck in processing state for >10 minutes
SELECT
  COUNT(*) as stuck_jobs_count,
  COUNT(DISTINCT data_type) as affected_data_types,
  COUNT(DISTINCT symbol) as affected_symbols,
  MIN(processed_at) as oldest_stuck_job,
  MAX(processed_at) as newest_stuck_job
FROM api_call_queue_v2
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '10 minutes';
```

**Alert Query:**
```sql
-- Returns rows if >10 stuck jobs
SELECT
  'ALERT: Stuck jobs detected' as alert,
  COUNT(*) as stuck_jobs_count,
  COUNT(DISTINCT data_type) as affected_data_types
FROM api_call_queue_v2
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '10 minutes'
HAVING COUNT(*) > 10;
```

---

## Quota Monitoring

### 1. Quota Usage

**Alert Threshold:** >80% of 20 GB monthly limit

```sql
-- Calculate current quota usage (rolling 30 days)
SELECT
  date,
  total_bytes,
  ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2) as usage_percent,
  is_quota_exceeded_v2() as quota_exceeded
FROM api_data_usage_v2
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

**Alert Query:**
```sql
-- Returns rows if quota usage >80%
SELECT
  'ALERT: Quota usage above 80%' as alert,
  date,
  total_bytes,
  ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2) as usage_percent
FROM api_data_usage_v2
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  AND total_bytes > (20.0 * 1024 * 1024 * 1024 * 0.8)
ORDER BY date DESC
LIMIT 1;
```

### 2. Daily Data Transfer Trends

```sql
-- Daily data transfer for last 7 days
SELECT
  date,
  total_bytes,
  ROUND(total_bytes / (1024 * 1024), 2) as mb_transferred,
  ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2) as cumulative_usage_percent
FROM api_data_usage_v2
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

---

## Performance Monitoring

### 1. Queue Processing Rate

```sql
-- Jobs processed per minute (last hour)
SELECT
  DATE_TRUNC('minute', processed_at) as minute,
  COUNT(*) as jobs_processed,
  AVG(actual_data_size_bytes) as avg_size_bytes,
  SUM(actual_data_size_bytes) as total_bytes
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', processed_at)
ORDER BY minute DESC;
```

### 2. Staleness Checker Performance

```sql
-- Check staleness checker execution time (from logs/notices)
-- Note: This requires logging to be enabled
SELECT
  'Staleness checker should complete within 50 seconds' as note,
  'Check pg_stat_activity for running queries' as monitoring_method;
```

### 3. Partition Maintenance Performance

```sql
-- Check partition sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE tablename LIKE 'api_call_queue_v2%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 4. Processor Batch Sizes

```sql
-- Analyze batch processing patterns
SELECT
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as jobs_completed,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds,
  COUNT(*) / 60.0 as jobs_per_minute
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour DESC;
```

---

## Data Type Health

### 1. Data Type Success Rates

```sql
-- Success rate by data type (last 24 hours)
SELECT
  data_type,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0),
    2
  ) as success_rate_percent
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
ORDER BY success_rate_percent ASC;
```

### 2. Estimate Accuracy

```sql
-- Compare estimates vs actuals by data type
SELECT
  r.data_type,
  r.estimated_data_size_bytes as estimate,
  AVG(j.actual_data_size_bytes) as avg_actual,
  ROUND(100.0 * (AVG(j.actual_data_size_bytes) - r.estimated_data_size_bytes) /
    NULLIF(r.estimated_data_size_bytes, 0), 2) as percent_diff,
  COUNT(j.id) as sample_size
FROM public.data_type_registry_v2 r
LEFT JOIN api_call_queue_v2 j ON j.data_type = r.data_type
  AND j.status = 'completed'
  AND j.actual_data_size_bytes IS NOT NULL
  AND j.processed_at > NOW() - INTERVAL '7 days'
WHERE r.refresh_strategy = 'on-demand'
GROUP BY r.data_type, r.estimated_data_size_bytes
HAVING COUNT(j.id) > 0
ORDER BY ABS(percent_diff) DESC;
```

---

## Subscription Monitoring

### 1. Active Subscriptions

```sql
-- Count active subscriptions from realtime.subscription
SELECT
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT
    SUBSTRING(filters::text FROM 'symbol,eq,([^)]+)')
  ) as unique_symbols,
  COUNT(DISTINCT entity) as unique_data_types
FROM realtime.subscription
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### 2. Subscription Distribution

```sql
-- Subscriptions by data type
SELECT
  entity as data_type,
  COUNT(*) as subscription_count,
  COUNT(DISTINCT
    SUBSTRING(filters::text FROM 'symbol,eq,([^)]+)')
  ) as unique_symbols
FROM realtime.subscription
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY entity
ORDER BY subscription_count DESC;
```

---

## Cron Job Health

### 1. Cron Job Status

```sql
-- Check cron job configuration
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE '%v2%'
ORDER BY jobname;
```

### 2. Recent Cron Executions

```sql
-- Check recent cron job runs (requires logging)
-- Note: This may require custom logging setup
SELECT
  'Check Supabase logs for cron job execution' as note,
  'Use Supabase Dashboard → Logs → Postgres' as method;
```

---

## Alert Summary Query

**Run this query regularly to check all alert conditions:**

```sql
-- Comprehensive alert check
WITH alerts AS (
  -- Queue success rate alert
  SELECT
    'queue_success_rate' as alert_type,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'completed') * 100.0 /
           NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) < 90
      THEN 'ALERT: Queue success rate below 90%'
      ELSE NULL
    END as message,
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) as metric_value
  FROM api_call_queue_v2
  WHERE created_at > NOW() - INTERVAL '24 hours'

  UNION ALL

  -- Stuck jobs alert
  SELECT
    'stuck_jobs' as alert_type,
    CASE
      WHEN COUNT(*) > 10 THEN 'ALERT: More than 10 stuck jobs'
      ELSE NULL
    END as message,
    COUNT(*)::numeric as metric_value
  FROM api_call_queue_v2
  WHERE status = 'processing'
    AND processed_at < NOW() - INTERVAL '10 minutes'

  UNION ALL

  -- Quota usage alert
  SELECT
    'quota_usage' as alert_type,
    CASE
      WHEN total_bytes > (20.0 * 1024 * 1024 * 1024 * 0.8)
      THEN 'ALERT: Quota usage above 80%'
      ELSE NULL
    END as message,
    ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2) as metric_value
  FROM api_data_usage_v2
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY date DESC
  LIMIT 1
)
SELECT * FROM alerts
WHERE message IS NOT NULL;
```

---

## Quick Health Check

**Run this for a quick system health overview:**

```sql
-- Quick health check
SELECT
  'Queue Health' as category,
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) as success_rate,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT
  'Quota Status' as category,
  ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2) as usage_percent,
  CASE WHEN is_quota_exceeded_v2() THEN 1 ELSE 0 END as quota_exceeded,
  NULL
FROM api_data_usage_v2
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC
LIMIT 1

UNION ALL

SELECT
  'Stuck Jobs' as category,
  COUNT(*) as stuck_count,
  NULL,
  NULL
FROM api_call_queue_v2
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '10 minutes';
```

---

## Usage Notes

- **Run alerts every 5-15 minutes** via monitoring service
- **Store results** in monitoring dashboard or alerting system
- **Set up notifications** for critical alerts (queue success <90%, quota >80%, stuck jobs >10)
- **Review trends** daily to identify patterns

---

## Integration with Monitoring Services

These queries can be integrated with:
- **Supabase Dashboard** - SQL Editor for manual checks
- **UptimeRobot** - External monitoring service
- **Custom monitoring script** - Automated alerting
- **pg_cron** - Scheduled monitoring queries (store results in monitoring table)

