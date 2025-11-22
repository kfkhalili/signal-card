# Operational Runbook: On-Demand API System

**Purpose:** Step-by-step troubleshooting guides for common operational issues.

---

## Table of Contents

1. [Queue Health Issues](#queue-health-issues)
2. [Quota Exceeded](#quota-exceeded)
3. [Stuck Jobs](#stuck-jobs)
4. [High Failure Rate](#high-failure-rate)
5. [Performance Degradation](#performance-degradation)
6. [Data Type Specific Issues](#data-type-specific-issues)

---

## Queue Health Issues

### Symptom: Queue Success Rate <90%

**Diagnosis:**
```sql
-- Check success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) as success_rate
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Investigation Steps:**

1. **Check failure patterns:**
```sql
SELECT 
  data_type,
  COUNT(*) as failed_count,
  STRING_AGG(DISTINCT LEFT(error_message, 100), '; ') as error_samples
FROM api_call_queue_v2
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
ORDER BY failed_count DESC;
```

2. **Check for specific error patterns:**
   - Foreign key violations → Profile data missing
   - Zod validation errors → Schema mismatch
   - Stale data rejections → Expected behavior (source timestamp validation)
   - Empty API responses → Symbol has no data

**Resolution:**

- **Foreign Key Violations:** Ensure profile data exists before dependent data types
- **Zod Validation Errors:** Update schema in Edge Function
- **Stale Data:** Expected - system correctly rejecting stale API responses
- **Empty Responses:** Expected - some symbols have no data

**Prevention:**
- Monitor error patterns daily
- Set up alerts for new error types
- Review failed jobs weekly

---

## Quota Exceeded

### Symptom: `is_quota_exceeded_v2()` returns `true`

**Diagnosis:**
```sql
-- Check quota status
SELECT 
  date,
  total_bytes,
  ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2) as usage_percent,
  is_quota_exceeded_v2() as quota_exceeded
FROM api_data_usage_v2
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

**Investigation Steps:**

1. **Check daily transfer trends:**
```sql
SELECT 
  date,
  total_bytes,
  ROUND(total_bytes / (1024 * 1024), 2) as mb_transferred
FROM api_data_usage_v2
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

2. **Identify high-volume data types:**
```sql
SELECT 
  data_type,
  COUNT(*) as job_count,
  SUM(actual_data_size_bytes) as total_bytes,
  AVG(actual_data_size_bytes) as avg_size
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '7 days'
GROUP BY data_type
ORDER BY total_bytes DESC;
```

**Resolution:**

1. **Immediate:** System automatically stops creating new jobs when quota exceeded
2. **Short-term:** Wait for rolling 30-day window to clear old data
3. **Long-term:** 
   - Review data type estimates (may be too low)
   - Optimize data fetching (reduce unnecessary refreshes)
   - Consider data compression

**Prevention:**
- Monitor quota usage daily
- Set alert at 80% usage
- Review data type estimates monthly

---

## Stuck Jobs

### Symptom: Jobs in `processing` state for >10 minutes

**Diagnosis:**
```sql
-- Find stuck jobs
SELECT 
  id,
  symbol,
  data_type,
  processed_at,
  EXTRACT(EPOCH FROM (NOW() - processed_at)) / 60 as minutes_stuck,
  retry_count
FROM api_call_queue_v2
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '10 minutes'
ORDER BY processed_at ASC;
```

**Investigation Steps:**

1. **Check if Edge Function is running:**
   - Check Supabase Dashboard → Edge Functions → Logs
   - Look for `queue-processor-v2` execution logs
   - Check for timeouts or errors

2. **Check for deadlocks:**
```sql
-- Check for blocking queries
SELECT 
  pid,
  state,
  query,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE state != 'idle'
  AND query LIKE '%api_call_queue_v2%';
```

**Resolution:**

1. **Automatic Recovery:** `recover_stuck_jobs_v2()` runs every minute via processor invoker
2. **Manual Recovery:**
```sql
-- Reset stuck jobs manually
SELECT recover_stuck_jobs_v2();
```

3. **If recovery doesn't work:**
```sql
-- Force reset specific jobs
UPDATE api_call_queue_v2
SET 
  status = 'pending',
  processed_at = NULL,
  retry_count = retry_count + 1
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '10 minutes'
  AND retry_count < max_retries;
```

**Prevention:**
- Monitor stuck jobs daily
- Set alert for >10 stuck jobs
- Review Edge Function timeout settings

---

## High Failure Rate

### Symptom: Failure rate >10% for a specific data type

**Diagnosis:**
```sql
-- Check failure rate by data type
SELECT 
  data_type,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0),
    2
  ) as failure_rate
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
HAVING COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / 
  NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) > 10
ORDER BY failure_rate DESC;
```

**Investigation Steps:**

1. **Analyze error messages:**
```sql
SELECT 
  data_type,
  error_message,
  COUNT(*) as occurrence_count
FROM api_call_queue_v2
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type, error_message
ORDER BY occurrence_count DESC;
```

2. **Check affected symbols:**
```sql
SELECT 
  symbol,
  data_type,
  error_message,
  retry_count
FROM api_call_queue_v2
WHERE status = 'failed'
  AND data_type = '[DATA_TYPE]'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

**Common Issues & Resolutions:**

1. **Foreign Key Violations:**
   - **Cause:** Profile data missing
   - **Fix:** Ensure profile job completes before dependent data types
   - **Prevention:** Check profile job status before queueing dependent jobs

2. **Zod Validation Errors:**
   - **Cause:** API response doesn't match schema
   - **Fix:** Update Zod schema in Edge Function
   - **Prevention:** Review API responses for schema changes

3. **Stale Data Rejections:**
   - **Cause:** FMP API returning cached/stale data
   - **Fix:** Expected behavior - system correctly rejecting stale data
   - **Prevention:** None needed (this is a feature, not a bug)

---

## Performance Degradation

### Symptom: Jobs taking longer to process

**Diagnosis:**
```sql
-- Check processing times
SELECT 
  data_type,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as median_time,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_time
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
ORDER BY avg_processing_time_seconds DESC;
```

**Investigation Steps:**

1. **Check queue depth:**
```sql
SELECT 
  status,
  COUNT(*) as job_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_wait_time_seconds
FROM api_call_queue_v2
GROUP BY status;
```

2. **Check processor throughput:**
```sql
SELECT 
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as jobs_completed,
  COUNT(*) / 60.0 as jobs_per_minute
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour DESC;
```

**Resolution:**

1. **Increase processor iterations:**
   - Current: 3 iterations per minute
   - Can increase to 5 if needed (watch rate limits)

2. **Check rate limiting:**
```sql
-- Check if rate limiting is active
SELECT 
  should_stop_processing_api_calls() as rate_limit_active;
```

3. **Review batch sizes:**
   - Current batch size: 10 jobs
   - Can increase if processor can handle more

---

## Data Type Specific Issues

### Profile Data Type

**Common Issues:**
- Zod validation errors (null fields)
- Foreign key violations (missing profile data)

**Resolution:**
- Update Zod schema to handle null fields
- Ensure profile job completes before dependent jobs

### Quote Data Type

**Common Issues:**
- Jobs created when exchange is closed
- Stale data during market hours

**Resolution:**
- System already checks exchange status
- Verify `is_exchange_open_for_symbol_v2()` function

### Financial-Statements Data Type

**Common Issues:**
- Stale data rejections (source timestamp validation)
- Large data sizes (600KB per job)

**Resolution:**
- Stale rejections are expected (data integrity protection)
- Monitor quota usage (financial-statements use significant quota)

---

## Emergency Procedures

### Stop All Processing

```sql
-- Disable cron jobs temporarily
SELECT cron.unschedule('check-stale-data-v2');
SELECT cron.unschedule('invoke-processor-v2');
```

### Resume Processing

```sql
-- Re-enable cron jobs
SELECT cron.schedule(
  'check-stale-data-v2',
  '* * * * *',
  $$SELECT check_and_queue_stale_data_from_presence_v2()$$
);

SELECT cron.schedule(
  'invoke-processor-v2',
  '* * * * *',
  $$SELECT invoke_processor_loop_v2(p_max_iterations := 3, p_iteration_delay_seconds := 2)$$
);
```

### Clear Stuck Jobs

```sql
-- Run recovery function
SELECT recover_stuck_jobs_v2();
```

### Reset Failed Jobs

```sql
-- Reset failed jobs (use with caution)
UPDATE api_call_queue_v2
SET 
  status = 'pending',
  processed_at = NULL,
  error_message = NULL,
  retry_count = 0
WHERE status = 'failed'
  AND retry_count < max_retries
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## Monitoring Checklist

**Daily:**
- [ ] Check queue success rate
- [ ] Review failed jobs
- [ ] Check quota usage
- [ ] Monitor stuck jobs

**Weekly:**
- [ ] Analyze error patterns
- [ ] Review data type success rates
- [ ] Check estimate accuracy
- [ ] Review performance metrics

**Monthly:**
- [ ] Review quota trends
- [ ] Analyze processing patterns
- [ ] Update documentation
- [ ] Review and optimize estimates

---

## Contact & Escalation

- **Critical Issues:** Check Supabase Dashboard → Logs
- **Performance Issues:** Review Edge Function logs
- **Data Issues:** Check database logs and error messages
- **System Issues:** Review cron job status and execution logs

