# Build Progress Tracking

**Last Updated:** 2025-01-XX
**Current Phase:** Phase 0 - Safety Infrastructure

## Progress Overview

```
Phase 0: Safety Infrastructure        [░░░░░░░░░░] 0%
Phase 1: Foundation (Parallel)        [░░░░░░░░░░] 0%
Phase 2: Queue System (Parallel)      [░░░░░░░░░░] 0%
Phase 3: Staleness System (Parallel)  [░░░░░░░░░░] 0%
Phase 4: Frontend Integration         [░░░░░░░░░░] 0%
Phase 5: Migration (One Type)         [░░░░░░░░░░] 0%
Phase 6: Full Migration               [░░░░░░░░░░] 0%
```

**Overall Progress:** 0% (0/7 phases complete)

---

## Phase 0: Safety Infrastructure

**Status:** 🔴 Not Started
**Target:** Week 0
**Blockers:** None

### Tasks

- [ ] Create `feature_flags` table
- [ ] Create monitoring/logging infrastructure
- [ ] Create manual testing checklists document
- [ ] Document rollback procedures
- [ ] Document current system behavior (baseline)
- [ ] Set up health check Edge Function
- [ ] Configure external monitoring (UptimeRobot/GitHub Actions)

### Notes
_Add notes here as you work..._

---

## Phase 1: Foundation (Parallel)

**Status:** 🔴 Not Started
**Target:** Week 1
**Blockers:** Phase 0 must be complete

### Tasks

- [ ] Create `data_type_registry_v2` table
  - [ ] Add GRANT/REVOKE permissions (read-only)
  - [ ] Add CHECK constraints (TTL > 0)
- [ ] Create `is_valid_identifier()` helper function
- [ ] Create `active_subscriptions_v2` table
- [ ] Create `api_call_queue_v2` table (partitioned)
  - [ ] Create partitions (pending, processing, completed, failed)
  - [ ] Add indexes
  - [ ] Set FILLFACTOR = 70
- [ ] Create `is_data_stale_v2()` function
  - [ ] No DEFAULT values (prevents split-brain)
  - [ ] TTL validation
- [ ] Create `is_profile_stale_v2()` function
- [ ] Manual test: Can insert/query all tables ✅/❌

### Notes
_Add notes here as you work..._

---

## Phase 2: Queue System (Parallel)

**Status:** 🔴 Not Started
**Target:** Week 2
**Blockers:** Phase 1 must be complete

### Tasks

- [ ] Create `api_data_usage_v2` table
- [ ] Create `is_quota_exceeded_v2()` function
- [ ] Create `get_queue_batch_v2()` function
  - [ ] Atomic batch claiming
  - [ ] Predictive quota check
  - [ ] FOR UPDATE SKIP LOCKED
- [ ] Create `complete_queue_job_v2()` function
  - [ ] Auto-correction logic (random sampling)
  - [ ] Zero-start case handling
- [ ] Create `fail_queue_job_v2()` function
- [ ] Create `reset_job_immediate_v2()` function
- [ ] Create `recover_stuck_jobs_v2()` function
  - [ ] FOR UPDATE SKIP LOCKED
- [ ] Create `queue_refresh_if_not_exists_v2()` function
- [ ] Create `invoke_processor_loop_v2()` function
  - [ ] Circuit breaker logic
  - [ ] Advisory lock (ID 44)
  - [ ] Recovery integration
- [ ] Create `queue-processor-v2` Edge Function
  - [ ] Monofunction architecture
  - [ ] Import logic from `/lib/`
  - [ ] Switch statement routing
  - [ ] Deadlock handling
  - [ ] Aggressive timeouts (10s)
- [ ] Create `maintain_queue_partitions_v2()` function
- [ ] Manual test: Can queue and process jobs ✅/❌

### Notes
_Add notes here as you work..._

---

## Phase 3: Staleness System (Parallel)

**Status:** 🔴 Not Started
**Target:** Week 2-3
**Blockers:** Phase 2 must be complete

### Tasks

- [ ] Enable `pg_net` extension (if using "All in Postgres")
- [ ] Grant `USAGE ON SCHEMA net` to cron job role
- [ ] Create `check_and_queue_stale_batch_v2()` function
  - [ ] SECURITY DEFINER
  - [ ] Fault tolerance (exception handling)
  - [ ] Fail-safe to stale
  - [ ] Identifier validation
- [ ] Create `check_and_queue_stale_data_from_presence_v2()` function
  - [ ] HTTP error checking
  - [ ] Symbol-by-Symbol pattern
  - [ ] Temp table indexes
  - [ ] Advisory lock (ID 42)
  - [ ] Quota check
- [ ] Create `refresh_analytics_from_presence_v2()` function
- [ ] Create `track-subscription-v2` Edge Function
  - [ ] Rate limiting configured
  - [ ] Single batch RPC call
  - [ ] Silent failure handling
- [ ] Create `queue_scheduled_refreshes_v2()` function
  - [ ] Throttling logic
  - [ ] TABLESAMPLE
  - [ ] Priority = -1 (hardcoded)
  - [ ] Advisory lock (ID 43)
- [ ] Manual test: Staleness checks work ✅/❌
- [ ] Manual test: Queue gets populated ✅/❌

### Notes
_Add notes here as you work..._

---

## Phase 4: Frontend Integration

**Status:** 🔴 Not Started
**Target:** Week 3
**Blockers:** Phase 3 must be complete

### Tasks

- [ ] Update `RealtimeStockManager` to use Presence
  - [ ] Join channels with Presence config
  - [ ] Track presence with metadata (symbol, dataTypes, userId)
  - [ ] Keep existing Realtime subscriptions (parallel)
- [ ] Call `track-subscription-v2` on channel join
  - [ ] Feature-flagged
  - [ ] Error handling (silent failure)
- [ ] Call `untrack-subscription-v2` on channel leave (optional)
- [ ] Test: Presence tracking works ✅/❌
- [ ] Test: Existing Realtime still works ✅/❌
- [ ] Test: Can disable via feature flag ✅/❌

### Notes
_Add notes here as you work..._

---

## Phase 5: Migration (One Type at a Time)

**Status:** 🔴 Not Started
**Target:** Week 4
**Blockers:** Phase 4 must be complete

### Migration Order (Recommended)

1. **`quote`** (highest volume, most critical)
2. **`profile`** (high volume)
3. **`financial-statements`** (lower volume)
4. **`ratios-ttm`** (lower volume)
5. **`dividend-history`** (lower volume)
6. **`shares-float`** (lower volume)
7. **`revenue-segmentation`** (lower volume)
8. **`grades-historical`** (lower volume)
9. **`exchange-variants`** (lower volume)
10. **`available-exchanges`** (lowest volume)
11. **`exchange-market-status`** (scheduled, not on-demand)

### Per-Type Checklist

For each data type:

- [ ] Add to `data_type_registry_v2`
- [ ] Enable feature flag for this type
- [ ] Disable old cron job for this type
- [ ] Monitor for 24-48 hours
  - [ ] Queue depth reasonable
  - [ ] Jobs processing successfully
  - [ ] Data updating correctly
  - [ ] No errors in logs
- [ ] If issues: Rollback (re-enable old cron, disable new system)
- [ ] If successful: Mark as migrated ✅

### Migration Status

| Data Type | Status | Migrated Date | Notes |
|-----------|--------|---------------|-------|
| `quote` | 🔴 Not Started | - | - |
| `profile` | 🔴 Not Started | - | - |
| `financial-statements` | 🔴 Not Started | - | - |
| `ratios-ttm` | 🔴 Not Started | - | - |
| `dividend-history` | 🔴 Not Started | - | - |
| `shares-float` | 🔴 Not Started | - | - |
| `revenue-segmentation` | 🔴 Not Started | - | - |
| `grades-historical` | 🔴 Not Started | - | - |
| `exchange-variants` | 🔴 Not Started | - | - |
| `available-exchanges` | 🔴 Not Started | - | - |
| `exchange-market-status` | 🔴 Not Started | - | Scheduled type |

---

## Phase 6: Full Migration

**Status:** 🔴 Not Started
**Target:** Week 5+
**Blockers:** Phase 5 must be complete (all types migrated)

### Tasks

- [ ] All data types migrated ✅/❌
- [ ] Remove all old cron jobs
- [ ] Remove `_v2` suffixes (rename tables/functions)
- [ ] Update frontend to remove feature flag checks
- [ ] Clean up feature flags table
- [ ] Update documentation
- [ ] Final testing
- [ ] Production deployment

### Notes
_Add notes here as you work..._

---

## Critical Issues & Blockers

### Current Blockers
_List any blockers preventing progress..._

### Known Issues
_List any known issues that need resolution..._

### Risks
_List any risks that need monitoring..._

---

## Daily Standup Template

**Date:** YYYY-MM-DD

**Yesterday:**
- Completed: _list tasks_
- Issues: _list issues_

**Today:**
- Plan: _list tasks_
- Blockers: _list blockers_

**Notes:**
_Any additional notes..._

---

## Weekly Review Template

**Week:** Week X (YYYY-MM-DD to YYYY-MM-DD)

**Completed:**
- Phase: _phase name_
- Tasks: _list completed tasks_
- Progress: _X%_

**Issues:**
- _List any issues encountered_

**Next Week:**
- Phase: _next phase_
- Tasks: _planned tasks_
- Risks: _identified risks_

**Metrics:**
- Queue depth: _X jobs_
- Processing rate: _X jobs/minute_
- Error rate: _X%_
- Data freshness: _X% stale_

---

## Quick Reference

### Feature Flags
```sql
-- Check flag
SELECT enabled FROM feature_flags WHERE flag_name = 'use_queue_system';

-- Enable flag
UPDATE feature_flags SET enabled = true WHERE flag_name = 'use_queue_system';

-- Disable flag (rollback)
UPDATE feature_flags SET enabled = false WHERE flag_name = 'use_queue_system';
```

### Manual Testing Commands
```sql
-- Test queue system
INSERT INTO api_call_queue_v2 (symbol, data_type, priority) VALUES ('AAPL', 'quote', 1);
SELECT * FROM api_call_queue_v2 WHERE status = 'pending';

-- Test staleness check
SELECT check_and_queue_stale_batch_v2('AAPL', ARRAY['quote'], 1);

-- Check queue depth
SELECT COUNT(*) FROM api_call_queue_v2 WHERE status = 'pending';
```

### Rollback Commands
```sql
-- Disable new system
UPDATE feature_flags SET enabled = false WHERE flag_name = 'use_queue_system';

-- Re-enable old cron job (example)
-- (Re-run old cron job migration)
```

