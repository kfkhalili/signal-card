# Safety Mechanisms for Build (No Tests)

**Purpose:** Since we don't have automated tests, these safety mechanisms prevent breaking production.

---

## 1. Feature Flags System

### Implementation

```sql
-- Create feature flags table
CREATE TABLE feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial flags
INSERT INTO feature_flags (flag_name, enabled) VALUES
  ('use_queue_system', false),
  ('use_presence_tracking', false),
  ('use_new_staleness_check', false),
  ('migrate_quote_type', false),
  ('migrate_profile_type', false)
  -- Add more as needed
ON CONFLICT (flag_name) DO NOTHING;

-- Helper function to check flags
CREATE OR REPLACE FUNCTION is_feature_enabled(p_flag_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT enabled FROM feature_flags WHERE flag_name = p_flag_name;
$$ LANGUAGE sql STABLE;
```

### Usage in Code

**SQL Functions:**
```sql
-- In queue functions
IF is_feature_enabled('use_queue_system') THEN
  -- Use new queue system
ELSE
  -- Use old system (or fail gracefully)
END IF;
```

**Edge Functions:**
```typescript
// In track-subscription-v2
const { data: flag } = await supabase
  .from('feature_flags')
  .select('enabled')
  .eq('flag_name', 'use_presence_tracking')
  .single();

if (!flag?.enabled) {
  // Fall back to old behavior or skip
  return;
}
```

**Frontend:**
```typescript
// Check flag before using new system
const { data: flag } = await supabase
  .from('feature_flags')
  .select('enabled')
  .eq('flag_name', 'use_presence_tracking')
  .single();

if (flag?.enabled) {
  // Use Presence tracking
} else {
  // Use old Realtime (no Presence)
}
```

---

## 2. Parallel System Pattern

### Naming Convention

**All new components use `_v2` suffix:**
- `data_type_registry_v2`
- `api_call_queue_v2`
- `check_and_queue_stale_batch_v2`
- `queue-processor-v2` (Edge Function)

**Benefits:**
- Old and new systems can coexist
- Easy to identify new vs old
- Simple rollback (just use old names)

### Migration Strategy

1. **Build Phase:** Everything uses `_v2` suffix
2. **Testing Phase:** Test `_v2` system thoroughly
3. **Migration Phase:** Switch over gradually
4. **Cleanup Phase:** Remove `_v2` suffix and old system

---

## 3. Manual Testing Checklists

### Pre-Deployment Checklist (Every Phase)

- [ ] Code reviewed by team
- [ ] SQL syntax validated (no syntax errors)
- [ ] Edge Function deploys successfully
- [ ] Feature flags table exists
- [ ] Monitoring/logging in place
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

### Post-Deployment Checklist (Every Phase)

- [ ] Tables/functions created successfully
- [ ] Can query new tables
- [ ] Feature flags working
- [ ] No errors in logs
- [ ] Old system still working (if applicable)
- [ ] Monitoring shows expected behavior

### Per-Data-Type Migration Checklist

- [ ] Added to `data_type_registry_v2`
- [ ] Feature flag created for this type
- [ ] Old cron job disabled
- [ ] New system enabled for this type
- [ ] Monitor for 24-48 hours:
  - [ ] Queue depth reasonable (< 1000)
  - [ ] Jobs processing successfully
  - [ ] Data updating correctly (check `fetched_at` timestamps)
  - [ ] No errors in logs
  - [ ] No user complaints
- [ ] If issues: Rollback immediately
- [ ] If successful: Mark as complete

---

## 4. Monitoring & Observability

### Required Metrics

**Queue Health:**
```sql
-- Queue depth
SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 'pending';

-- Processing rate
SELECT COUNT(*) FROM api_call_queue_v2
WHERE status = 'completed'
AND processed_at > NOW() - INTERVAL '1 minute';

-- Error rate
SELECT COUNT(*) FROM api_call_queue_v2
WHERE status = 'failed'
AND processed_at > NOW() - INTERVAL '1 hour';
```

**Data Freshness:**
```sql
-- Check if data is updating
SELECT
  symbol,
  MAX(fetched_at) as last_fetched,
  NOW() - MAX(fetched_at) as age
FROM live_quote_indicators
GROUP BY symbol
ORDER BY age DESC
LIMIT 10;
```

**Cron Job Health:**
```sql
-- Check cron job execution
SELECT
  jobname,
  MAX(end_time) as last_run,
  NOW() - MAX(end_time) as time_since_run
FROM pg_cron.job_run_details
WHERE jobname LIKE '%v2%'
GROUP BY jobname;
```

### Alert Thresholds

**Critical (P0):**
- Queue depth > 10,000
- No jobs processed in 10 minutes (with pending jobs)
- Cron job hasn't run in 2x schedule interval
- Error rate > 10% in last hour

**Warning (P1):**
- Queue depth > 1,000
- Processing rate < 10 jobs/minute
- Data older than 2x TTL

**Info (P2):**
- Queue depth > 100
- Processing rate < 50 jobs/minute

---

## 5. Rollback Procedures

### Quick Rollback (Feature Flag)

**Disable new system:**
```sql
UPDATE feature_flags
SET enabled = false
WHERE flag_name = 'use_queue_system';
```

**Re-enable old cron job:**
```sql
-- Re-run old cron job migration
-- (Keep old migrations in version control)
```

### Full Rollback (Remove New System)

**If new system is completely broken:**

1. **Disable all feature flags:**
```sql
UPDATE feature_flags SET enabled = false;
```

2. **Re-enable all old cron jobs:**
```sql
-- Re-run: supabase/migrations/20251116161200_schedule_cron_jobs.sql
```

3. **Drop new tables (if safe):**
```sql
-- Only if you're sure old system is working
DROP TABLE IF EXISTS api_call_queue_v2 CASCADE;
DROP TABLE IF EXISTS data_type_registry_v2 CASCADE;
-- etc.
```

4. **Monitor old system:**
- Verify cron jobs running
- Verify data updating
- Check for errors

---

## 6. Gradual Rollout Strategy

### Stage 1: Internal Testing (Week 1-2)
- Enable for test symbols only
- Monitor closely
- Fix any issues

### Stage 2: Canary (Week 3)
- Enable for 1 real user
- Monitor for 24-48 hours
- If successful, enable for 10% of users

### Stage 3: Gradual Expansion (Week 4)
- 10% → 25% → 50% → 100%
- Monitor at each stage
- Rollback if issues

### Stage 4: Full Migration (Week 5+)
- All users on new system
- Old system disabled
- Monitor for 1 week
- Remove old system

---

## 7. Data Validation

### Before Migration

**Baseline Metrics:**
```sql
-- Record current state
CREATE TABLE migration_baseline AS
SELECT
  'quote' as data_type,
  COUNT(*) as row_count,
  MAX(fetched_at) as latest_fetch,
  MIN(fetched_at) as oldest_fetch
FROM live_quote_indicators;
-- Repeat for each data type
```

### During Migration

**Compare Old vs New:**
```sql
-- Check if new system is updating data
SELECT
  symbol,
  MAX(fetched_at) as new_system_latest,
  (SELECT MAX(fetched_at) FROM migration_baseline WHERE data_type = 'quote') as old_system_latest
FROM live_quote_indicators
WHERE fetched_at > (SELECT MAX(fetched_at) FROM migration_baseline WHERE data_type = 'quote')
GROUP BY symbol;
```

### After Migration

**Verify Data Continuity:**
- No gaps in `fetched_at` timestamps
- Row counts similar (allowing for natural growth)
- No missing symbols

---

## 8. Error Handling

### Graceful Degradation

**If new system fails, fall back to old:**

```typescript
// In track-subscription-v2
try {
  if (await isFeatureEnabled('use_queue_system')) {
    await checkAndQueueStaleBatch(symbol, dataTypes);
  }
} catch (error) {
  console.error('New system failed, falling back to old:', error);
  // Old system continues working
  // Or: trigger old cron job manually
}
```

### Silent Failure Mode

**For non-critical operations:**
```typescript
// Analytics update (non-critical)
try {
  await updateAnalytics(symbol, userId);
} catch (error) {
  // Log but don't fail
  console.warn('Analytics update failed:', error);
}
```

---

## 9. Communication Plan

### Before Each Phase
- [ ] Notify team of upcoming changes
- [ ] Document what will change
- [ ] Set expectations for monitoring

### During Migration
- [ ] Daily status updates
- [ ] Share metrics dashboard
- [ ] Report any issues immediately

### After Migration
- [ ] Celebrate success! 🎉
- [ ] Document lessons learned
- [ ] Update runbooks

---

## 10. Emergency Contacts

**Who to contact if things break:**
- Primary: _[Your name/contact]_
- Secondary: _[Backup contact]_
- Escalation: _[Manager/CTO]_

**How to contact:**
- Slack: `#tickered-alerts`
- Email: `alerts@tickered.com`
- Phone: _[Emergency number]_

---

## Quick Reference Card

**Enable new system:**
```sql
UPDATE feature_flags SET enabled = true WHERE flag_name = 'use_queue_system';
```

**Disable new system (rollback):**
```sql
UPDATE feature_flags SET enabled = false WHERE flag_name = 'use_queue_system';
```

**Check queue health:**
```sql
SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 'pending';
```

**Check if data is updating:**
```sql
SELECT MAX(fetched_at) FROM live_quote_indicators WHERE symbol = 'AAPL';
```

**Check cron job health:**
```sql
SELECT jobname, MAX(end_time) FROM pg_cron.job_run_details GROUP BY jobname;
```

**Emergency rollback:**
1. Disable feature flags
2. Re-enable old cron jobs
3. Monitor old system
4. Investigate issue

---

**Remember: Safety first. It's better to go slow than to break production.**

