# Testing Plan for Queue System

## Current Status
- ✅ Backend queue system fully built and deployed
- ✅ Feature flags: **DISABLED** (old system active)
- ✅ Registry: 1 entry (profile data type)
- ✅ Cron jobs: 5 jobs scheduled and active
- ✅ Frontend: `useTrackSubscription` hook integrated

## Phase 1: Regression Testing (Feature Flags OFF)

**Goal:** Verify old system still works correctly

### Test Scenarios

1. **Basic Card Loading**
   - [ ] Navigate to app: http://localhost:3000
   - [ ] Add a Profile card for a symbol (e.g., "AAPL", "MSFT", "TSLA")
   - [ ] Verify card displays correctly
   - [ ] Verify company name, logo, website appear
   - [ ] Check browser console for errors

2. **Card Interactions**
   - [ ] Click on metrics/interactive elements
   - [ ] Verify interactions work as expected
   - [ ] Add multiple cards to workspace
   - [ ] Verify cards can be reordered/moved

3. **Data Freshness**
   - [ ] Verify data appears current
   - [ ] Check that data loads without errors
   - [ ] Verify no broken images or missing data

### Expected Results
- ✅ All existing functionality works
- ✅ No console errors
- ✅ Cards load and display correctly
- ✅ No regressions from old system

---

## Phase 2: New System Testing (Feature Flags ON)

**Goal:** Test the new queue system with one data type (profile)

### Pre-Test Setup

Enable feature flags:
```sql
UPDATE feature_flags
SET enabled = true
WHERE flag_name IN ('use_queue_system', 'use_presence_tracking');
```

### Test Scenarios

1. **Subscription Tracking**
   - [ ] Add a Profile card for "AAPL"
   - [ ] Check database: `SELECT * FROM active_subscriptions_v2 WHERE symbol = 'AAPL'`
   - [ ] Verify subscription was created
   - [ ] Verify `data_type` includes 'profile'

2. **Staleness Check & Queueing**
   - [ ] Add a Profile card for a symbol with stale data (or new symbol)
   - [ ] Check queue: `SELECT * FROM api_call_queue_v2 WHERE symbol = 'AAPL' AND data_type = 'profile'`
   - [ ] Verify job was queued with correct priority
   - [ ] Verify job status is 'pending'

3. **Job Processing**
   - [ ] Wait 1-2 minutes for cron job to process
   - [ ] Check queue: `SELECT * FROM api_call_queue_v2 WHERE symbol = 'AAPL'`
   - [ ] Verify job status changed to 'processing' or 'completed'
   - [ ] Check for any 'failed' jobs

4. **Data Refresh**
   - [ ] Verify profile data was updated in `profiles` table
   - [ ] Verify card displays updated data
   - [ ] Check `fetched_at` timestamp is recent

5. **Multiple Cards**
   - [ ] Add Profile cards for multiple symbols (AAPL, MSFT, TSLA)
   - [ ] Verify all subscriptions created
   - [ ] Verify all jobs queued
   - [ ] Verify all jobs processed

6. **Edge Cases**
   - [ ] Add card for invalid symbol (should handle gracefully)
   - [ ] Add same card twice (should deduplicate)
   - [ ] Remove card and re-add (should re-subscribe)

### Monitoring Queries

```sql
-- Check subscriptions
SELECT symbol, data_type, COUNT(*) as user_count
FROM active_subscriptions_v2
GROUP BY symbol, data_type
ORDER BY user_count DESC;

-- Check queue status
SELECT
  status,
  COUNT(*) as count,
  AVG(priority) as avg_priority
FROM api_call_queue_v2
GROUP BY status;

-- Check recent jobs
SELECT
  symbol,
  data_type,
  status,
  priority,
  created_at,
  processed_at
FROM api_call_queue_v2
ORDER BY created_at DESC
LIMIT 20;

-- Check quota usage
SELECT * FROM get_quota_usage_v2();
```

### Expected Results
- ✅ Subscriptions created in `active_subscriptions_v2`
- ✅ Jobs queued in `api_call_queue_v2`
- ✅ Jobs processed by cron jobs
- ✅ Data refreshed in `profiles` table
- ✅ Cards display updated data
- ✅ No duplicate jobs
- ✅ Priority calculated correctly

---

## Phase 3: Performance & Scale Testing

### Test Scenarios

1. **Concurrent Subscriptions**
   - [ ] Add 10+ cards simultaneously
   - [ ] Verify all subscriptions created
   - [ ] Verify queue handles batch correctly
   - [ ] Check processing time

2. **Queue Depth**
   - [ ] Add many cards to create queue backlog
   - [ ] Verify throttling works (scheduled refreshes skip if queue full)
   - [ ] Verify high-priority jobs processed first

3. **Quota Management**
   - [ ] Check quota usage: `SELECT * FROM get_quota_usage_v2()`
   - [ ] Verify quota check prevents over-queueing
   - [ ] Verify quota tracking accurate

---

## Phase 4: Error Handling

### Test Scenarios

1. **Invalid Symbol**
   - [ ] Add card for non-existent symbol
   - [ ] Verify error handled gracefully
   - [ ] Verify no infinite retries

2. **API Failures**
   - [ ] Simulate API failure (if possible)
   - [ ] Verify retry logic works
   - [ ] Verify failed jobs marked correctly

3. **Network Issues**
   - [ ] Test with slow connection
   - [ ] Verify timeouts work
   - [ ] Verify recovery after reconnection

---

## Success Criteria

### Phase 1 (Regression)
- ✅ Zero regressions
- ✅ All existing features work
- ✅ No console errors

### Phase 2 (New System)
- ✅ Subscriptions tracked correctly
- ✅ Jobs queued and processed
- ✅ Data refreshed automatically
- ✅ No duplicate jobs
- ✅ Priority system works

### Phase 3 (Performance)
- ✅ Handles 10+ concurrent cards
- ✅ Queue processes efficiently
- ✅ Throttling prevents bloat

### Phase 4 (Error Handling)
- ✅ Errors handled gracefully
- ✅ Retry logic works
- ✅ No infinite loops

---

## Rollback Plan

If issues found:
1. Disable feature flags:
   ```sql
   UPDATE feature_flags
   SET enabled = false
   WHERE flag_name IN ('use_queue_system', 'use_presence_tracking');
   ```
2. Old system resumes immediately
3. Investigate issues
4. Fix and retest

---

## Next Steps After Testing

1. ✅ Document findings
2. ✅ Fix any issues found
3. ✅ Enable for production (if all tests pass)
4. ✅ Monitor for 24-48 hours
5. ✅ Proceed with full migration (Phase 6)

