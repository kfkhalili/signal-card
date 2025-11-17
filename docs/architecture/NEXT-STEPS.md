# Next Steps - Queue System Migration

## ✅ Current Status

**Completed:**
- ✅ All Phase 0-3 migrations applied successfully
- ✅ 15 v2 functions created and tested
- ✅ 5 cron jobs scheduled and active
- ✅ Feature flag bug fixed (`is_enabled` → `enabled`)
- ✅ Regression testing passed (old system works correctly)
- ✅ App running and functional

**System Readiness:**
- ✅ Profile data type registered
- ✅ Queue system fully operational
- ✅ Staleness checking ready
- ✅ Frontend integration complete

---

## 🎯 Next Steps: Test New Queue System

### Step 1: Enable Feature Flags (5 minutes)

Enable the new system for testing:

```sql
UPDATE feature_flags
SET enabled = true
WHERE flag_name IN ('use_queue_system', 'use_presence_tracking');
```

**What this does:**
- Activates the new queue-based refresh system
- Enables Realtime Presence tracking
- Profile cards will now use the new system

---

### Step 2: Test Subscription Tracking (10 minutes)

1. **Add a Profile Card:**
   - Navigate to workspace
   - Add Profile card for "AAPL" (or any symbol)

2. **Verify Subscription Created:**
   ```sql
   SELECT * FROM active_subscriptions_v2
   WHERE symbol = 'AAPL' AND data_type = 'profile';
   ```
   - Should see a subscription record
   - Should include your user_id

3. **Check Queue:**
   ```sql
   SELECT * FROM api_call_queue_v2
   WHERE symbol = 'AAPL' AND data_type = 'profile'
   ORDER BY created_at DESC;
   ```
   - Should see a job with `status = 'pending'` or `'processing'`
   - Priority should be calculated (based on viewer count)

---

### Step 3: Monitor Job Processing (5-10 minutes)

1. **Wait 1-2 minutes** for cron job to process

2. **Check Queue Status:**
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     AVG(priority) as avg_priority
   FROM api_call_queue_v2
   GROUP BY status;
   ```

3. **Verify Job Completed:**
   ```sql
   SELECT
     symbol,
     data_type,
     status,
     priority,
     created_at,
     processed_at,
     actual_data_size_bytes
   FROM api_call_queue_v2
   WHERE symbol = 'AAPL' AND data_type = 'profile'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Job should be `'completed'`
   - `processed_at` should be recent
   - `actual_data_size_bytes` should be populated

4. **Verify Data Updated:**
   ```sql
   SELECT
     symbol,
     fetched_at,
     NOW() - fetched_at as age
   FROM profiles
   WHERE symbol = 'AAPL';
   ```
   - `fetched_at` should be recent (within last few minutes)

---

### Step 4: Test Multiple Cards (10 minutes)

1. **Add Multiple Profile Cards:**
   - Add Profile cards for: AAPL, MSFT, TSLA

2. **Verify All Subscriptions:**
   ```sql
   SELECT
     symbol,
     data_type,
     COUNT(DISTINCT user_id) as users
   FROM active_subscriptions_v2
   GROUP BY symbol, data_type
   ORDER BY users DESC;
   ```

3. **Verify All Jobs Queued:**
   ```sql
   SELECT
     symbol,
     data_type,
     status,
     priority
   FROM api_call_queue_v2
   WHERE symbol IN ('AAPL', 'MSFT', 'TSLA')
   ORDER BY priority DESC, created_at ASC;
   ```

4. **Wait and Verify Processing:**
   - Wait 2-3 minutes
   - Check that all jobs are processed
   - Verify no jobs stuck in `'processing'`

---

### Step 5: Monitor for Issues (30 minutes - 1 hour)

**Watch for:**
- ✅ Jobs processing successfully
- ✅ No jobs stuck in `'processing'` state
- ✅ No excessive `'failed'` jobs
- ✅ Data refreshing correctly
- ✅ Cards displaying updated data
- ✅ No console errors

**Monitoring Queries:**

```sql
-- Check queue health
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM api_call_queue_v2
GROUP BY status;

-- Check for stuck jobs
SELECT COUNT(*) as stuck_jobs
FROM api_call_queue_v2
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '5 minutes';

-- Check quota usage
SELECT * FROM get_quota_usage_v2();

-- Check recent activity
SELECT
  symbol,
  data_type,
  status,
  priority,
  created_at,
  processed_at
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 20;
```

---

### Step 6: If Issues Found

**Rollback (if needed):**
```sql
UPDATE feature_flags
SET enabled = false
WHERE flag_name IN ('use_queue_system', 'use_presence_tracking');
```

**Investigate:**
- Check Edge Function logs
- Check cron job execution
- Review queue status
- Check for errors in database

---

## 📊 Success Criteria

**Phase 2 Testing is Successful When:**
- ✅ Subscriptions created correctly
- ✅ Jobs queued with correct priority
- ✅ Jobs processed within 1-2 minutes
- ✅ Data refreshed in database
- ✅ Cards display updated data
- ✅ No stuck or failed jobs
- ✅ No console errors
- ✅ System handles multiple cards correctly

---

## 🚀 After Successful Testing

Once Phase 2 testing is successful:

1. **Monitor for 24-48 hours**
   - Watch for any edge cases
   - Monitor quota usage
   - Check for performance issues

2. **Document Learnings**
   - Note any issues found
   - Document performance metrics
   - Update testing plan with findings

3. **Proceed to Full Migration (Phase 6)**
   - Migrate remaining data types
   - Remove old cron jobs
   - Clean up `_v2` suffixes

---

## 🛠️ Quick Commands

**Enable Feature Flags:**
```sql
UPDATE feature_flags SET enabled = true
WHERE flag_name IN ('use_queue_system', 'use_presence_tracking');
```

**Disable Feature Flags (Rollback):**
```sql
UPDATE feature_flags SET enabled = false
WHERE flag_name IN ('use_queue_system', 'use_presence_tracking');
```

**Check System Status:**
```sql
SELECT
  (SELECT COUNT(*) FROM active_subscriptions_v2) as subscriptions,
  (SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 'pending') as pending,
  (SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 'processing') as processing,
  (SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 'completed') as completed,
  (SELECT enabled FROM feature_flags WHERE flag_name = 'use_queue_system') as queue_enabled;
```

---

**Ready to proceed?** Enable the feature flags and start testing! 🎉

