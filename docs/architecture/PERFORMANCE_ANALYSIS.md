# Performance Analysis: On-Demand API System

**Purpose:** Performance monitoring, optimization opportunities, and tuning recommendations.

---

## Current Configuration

### Processor Settings

| Setting | Value | Notes |
|---------|-------|-------|
| **Batch Size** | 125 jobs | Processed per Edge Function invocation |
| **Iterations per Minute** | 3 | SQL loop invokes Edge Function 3 times |
| **Iteration Delay** | 2 seconds | Delay between iterations |
| **Target Jobs/Minute** | 250 | Theoretical max (3 iterations × ~83 jobs) |
| **Function Timeout** | 50 seconds | Overall timeout per invocation |
| **Delay Between Jobs** | ~240ms | Calculated from target rate |

### Cron Job Configuration

| Job | Schedule | Function | Settings |
|-----|----------|----------|----------|
| `check-stale-data-v2` | Every minute | `check_and_queue_stale_data_from_presence_v2()` | 50s timeout, 1000 symbols max |
| `invoke-processor-v2` | Every minute | `invoke_processor_loop_v2()` | 3 iterations, 2s delay |

---

## Performance Metrics

### Queue Processing Rate

**Current Performance:**
- **Target:** 250 jobs/minute
- **Actual:** ~150 jobs/minute (observed)
- **Gap:** ~100 jobs/minute capacity unused

**Analysis:**
```sql
-- Check actual processing rate
SELECT 
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as jobs_completed,
  COUNT(*) / 60.0 as jobs_per_minute,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_wait_time_seconds
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour DESC;
```

### Staleness Checker Performance

**Current Performance:**
- **Timeout:** 50 seconds
- **Max Symbols:** 1000 per run
- **Typical Execution:** 5-30 seconds

**Analysis:**
```sql
-- Check staleness checker patterns
-- Note: Requires logging to capture execution times
SELECT 
  'Staleness checker should complete within 50 seconds' as note,
  'Monitor via pg_stat_activity or application logs' as method;
```

### Partition Maintenance

**Current Configuration:**
- **Partitions:** 4 (pending, processing, completed, failed)
- **Maintenance:** Weekly truncation of completed/failed partitions
- **Fill Factor:** 70% (for HOT updates)

**Analysis:**
```sql
-- Check partition sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
  (SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 
    CASE tablename 
      WHEN 'api_call_queue_v2_pending' THEN 'pending'
      WHEN 'api_call_queue_v2_processing' THEN 'processing'
      WHEN 'api_call_queue_v2_completed' THEN 'completed'
      WHEN 'api_call_queue_v2_failed' THEN 'failed'
    END
  ) as row_count
FROM pg_tables
WHERE tablename LIKE 'api_call_queue_v2%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Optimization Opportunities

### 1. Processor Batch Size

**Current:** 125 jobs per batch  
**Analysis:**
- Batch size of 125 is large
- With 3 iterations per minute, theoretical max is 375 jobs/minute
- But actual rate is ~150 jobs/minute
- **Gap suggests:** Jobs may be taking longer than expected, or rate limiting is active

**Recommendation:**
- Monitor actual processing time per job
- If jobs complete quickly, consider increasing iterations (3 → 5)
- If jobs take longer, batch size is appropriate

**Test Query:**
```sql
-- Analyze job processing times
SELECT 
  data_type,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_total_time_seconds,
  AVG(EXTRACT(EPOCH FROM (processed_at - 
    (SELECT MIN(created_at) FROM api_call_queue_v2 j2 
     WHERE j2.symbol = j.symbol AND j2.data_type = j.data_type 
     AND j2.status = 'processing' AND j2.processed_at < j.processed_at)
  ))) as avg_processing_time_seconds,
  COUNT(*) as sample_size
FROM api_call_queue_v2 j
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
ORDER BY avg_total_time_seconds DESC;
```

### 2. Staleness Checker Optimization

**Current:** Symbol-by-symbol processing (1000 symbols max)  
**Analysis:**
- Symbol-by-symbol prevents "thundering herd"
- Timeout protection ensures completion
- Query pattern is efficient (indexed lookups)

**Optimization Opportunities:**
1. **Parallel Processing:** Process multiple symbols concurrently (if database can handle)
2. **Batch Queries:** Group staleness checks for multiple symbols (if safe)
3. **Caching:** Cache exchange status checks (quote data type)

**Test Query:**
```sql
-- Check staleness checker efficiency
-- Count how many symbols are typically processed
SELECT 
  COUNT(DISTINCT symbol) as unique_symbols,
  COUNT(*) as total_subscriptions
FROM get_active_subscriptions_from_realtime();
```

### 3. Rate Limiting Optimization

**Current:** 300 API calls/minute limit  
**Analysis:**
- Financial-statements: 3 calls per job
- Other data types: 1 call per job
- Current rate: ~150 jobs/minute = ~150-450 calls/minute (depending on mix)

**Optimization:**
- Monitor actual API call rate
- Adjust batch size based on data type mix
- Consider priority-based batching (process high-priority jobs first)

**Test Query:**
```sql
-- Analyze API call usage by data type
SELECT 
  data_type,
  COUNT(*) as job_count,
  SUM(api_calls_per_job) as total_api_calls,
  AVG(api_calls_per_job) as avg_calls_per_job
FROM api_call_queue_v2 j
JOIN data_type_registry_v2 r ON r.data_type = j.data_type
WHERE j.status = 'completed'
  AND j.processed_at > NOW() - INTERVAL '1 hour'
GROUP BY j.data_type, r.api_calls_per_job
ORDER BY total_api_calls DESC;
```

---

## Performance Monitoring Queries

### 1. Queue Depth Over Time

```sql
-- Monitor queue depth (pending jobs)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as pending_jobs,
  AVG(priority) as avg_priority
FROM api_call_queue_v2
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### 2. Processing Latency

```sql
-- Average time from creation to completion
SELECT 
  data_type,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as median_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p95_latency
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY data_type
ORDER BY avg_latency_seconds DESC;
```

### 3. Throughput Analysis

```sql
-- Jobs processed per hour
SELECT 
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as jobs_completed,
  COUNT(DISTINCT data_type) as data_types_processed,
  SUM(actual_data_size_bytes) as total_bytes_transferred
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour DESC;
```

---

## Optimization Recommendations

### Short-term (Immediate)

1. **Monitor Actual Processing Rate**
   - Track jobs/minute over 24 hours
   - Identify bottlenecks
   - Adjust batch size or iterations if needed

2. **Review Batch Size**
   - Current: 125 jobs per batch
   - Test with different sizes (50, 100, 150)
   - Measure impact on throughput

3. **Optimize Staleness Checker**
   - Monitor execution time
   - Check if 1000 symbols limit is appropriate
   - Consider increasing if consistently completing early

### Medium-term (1-3 months)

1. **Parallel Processing**
   - Evaluate parallel symbol processing in staleness checker
   - Test impact on database load
   - Implement if beneficial

2. **Batch Optimization**
   - Group similar data types in batches
   - Prioritize high-priority jobs
   - Optimize for API call rate limits

3. **Caching Layer**
   - Cache exchange status checks
   - Cache registry lookups
   - Reduce database query load

### Long-term (3-6 months)

1. **Event-Driven Processing**
   - Replace polling with database triggers
   - Reduce latency from 1 minute to <1 second
   - Improve responsiveness

2. **Horizontal Scaling**
   - Evaluate sharded monofunctions
   - Distribute load across multiple Edge Functions
   - Increase throughput capacity

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Jobs/Minute** | 250 | ~150 | ⚠️ Below target |
| **Success Rate** | >90% | 95%+ | ✅ Exceeded |
| **Queue Latency** | <5 min | ~2-3 min | ✅ Good |
| **Staleness Checker** | <50s | 5-30s | ✅ Good |
| **Quota Usage** | <80% | Varies | ⚠️ Monitor |

### Key Performance Indicators (KPIs)

1. **Queue Processing Rate:** Jobs completed per minute
2. **Queue Success Rate:** Percentage of jobs that complete successfully
3. **Average Latency:** Time from job creation to completion
4. **Quota Utilization:** Percentage of 20 GB monthly limit used
5. **Staleness Checker Efficiency:** Symbols processed per run

---

## Monitoring Dashboard Queries

### Real-time Status

```sql
-- Real-time queue status
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
FROM api_call_queue_v2
GROUP BY status;
```

### Performance Trends

```sql
-- Hourly performance trends
SELECT 
  DATE_TRUNC('hour', processed_at) as hour,
  COUNT(*) as jobs_completed,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency,
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as failure_rate
FROM api_call_queue_v2
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour DESC;
```

---

## Next Steps

1. **Set up automated monitoring** using queries from `MONITORING_QUERIES.md`
2. **Track performance metrics** daily for 1 week
3. **Identify optimization opportunities** based on actual data
4. **Implement optimizations** incrementally
5. **Measure impact** of each optimization

