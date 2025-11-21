# Build Readiness Assessment

**Date:** 2025-01-XX
**Status:** ⚠️ **Ready with Safety Measures Required**

## 1. Current State Analysis

### ✅ What Exists
- **11+ Individual Cron Jobs:** Currently calling Edge Functions directly
- **Edge Functions:** All `fetch-fmp-*` functions exist and work
- **Database Tables:** All data tables exist (profiles, live_quote_indicators, etc.)
- **Frontend Realtime:** Basic Realtime subscriptions working
- **Migrations System:** Supabase migrations in place

### ❌ What's Missing
- **No `data_type_registry` table** - Core metadata system
- **No queue system** (`api_call_queue`, functions)
- **No Realtime Presence** - Frontend not using Presence
- **No quota tracking** - No `api_data_usage` table
- **No tests** - Zero test coverage
- **No monitoring** - No health checks or observability

### ⚠️ Risk Assessment

**High Risk:**
- No tests = breaking changes will only be discovered in production
- Current cron jobs are working - replacing them could break data fetching
- Frontend depends on current Realtime behavior

**Medium Risk:**
- Edge Functions need refactoring to work with queue system
- Migration is complex (many moving parts)

**Low Risk:**
- Database migrations are reversible
- Edge Functions can be updated incrementally

---

## 2. Readiness Score: **6/10**

**Ready to build?** ✅ **YES, with safety measures**

**Why not 10/10?**
- No tests (critical for safety)
- Complex migration (many dependencies)
- Production system (can't break existing functionality)

**Mitigation Strategy:**
- Build in parallel (new system alongside old)
- Feature flags for gradual rollout
- Manual testing checklists
- Rollback plan for each phase

---

## 3. Safety Measures Required

### A. Parallel System Approach
**Strategy:** Build new system alongside old, switch over gradually

**Benefits:**
- Old system continues working during build
- Can test new system without risk
- Easy rollback (just disable new system)
- Zero downtime migration

**Implementation:**
1. New tables/functions have `_v2` suffix initially
2. Feature flag controls which system is active
3. Both systems run in parallel during testing
4. Switch over one data type at a time

### B. Feature Flags
**Strategy:** Use database settings to control system behavior

```sql
-- Feature flag table
CREATE TABLE feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Example flags
INSERT INTO feature_flags VALUES
  ('use_queue_system', false),
  ('use_presence_tracking', false),
  ('use_new_staleness_check', false);
```

**Usage:**
- Check flags before using new system
- Enable one flag at a time
- Monitor before enabling next flag

### C. Manual Testing Checklists
**Strategy:** Since no automated tests, create comprehensive manual test plans

**For Each Phase:**
- ✅ Pre-deployment checklist
- ✅ Post-deployment verification
- ✅ Rollback procedure
- ✅ Success criteria

### D. Monitoring & Observability
**Strategy:** Add logging and monitoring BEFORE migration

**Required:**
- Log all queue operations
- Track queue depth over time
- Monitor cron job execution
- Alert on failures

---

## 4. Recommended Build Strategy

### Option A: "Big Bang" (NOT RECOMMENDED)
- Build everything, deploy all at once
- **Risk:** High - breaks everything if something fails
- **Time:** Fastest
- **Suitable for:** Systems with comprehensive tests

### Option B: "Parallel System" (RECOMMENDED) ✅
- Build new system alongside old
- Test thoroughly
- Switch over gradually
- **Risk:** Low - old system still works
- **Time:** Slower but safer
- **Suitable for:** Production systems without tests

### Option C: "Shadow Mode"
- New system processes queue but doesn't update data
- Compare outputs with old system
- Switch when confident
- **Risk:** Very Low
- **Time:** Slowest
- **Suitable for:** Critical systems

**Recommendation:** **Option B (Parallel System)** with feature flags

---

## 5. Build Phases (Safe Approach)

### Phase 0: Safety Infrastructure (Week 0)
**Goal:** Set up safety mechanisms before building

**Tasks:**
1. Create feature flags table
2. Add logging/monitoring infrastructure
3. Create manual testing checklists
4. Set up rollback procedures
5. Document current system behavior (baseline)

**Success Criteria:**
- Feature flags working
- Can monitor current system
- Rollback plan documented

### Phase 1: Foundation (Parallel) (Week 1)
**Goal:** Build core infrastructure without touching existing system

**Tasks:**
1. Create `data_type_registry_v2` table
2. Create `api_call_queue_v2` table (partitioned)
3. Create helper functions (`is_data_stale_v2`, etc.)
4. Create `active_subscriptions_v2` table
5. **DO NOT** modify existing cron jobs yet

**Success Criteria:**
- All tables created
- Can manually insert/query data
- No impact on existing system

### Phase 2: Queue System (Parallel) (Week 2)
**Goal:** Build queue processing without using it

**Tasks:**
1. Create queue functions (`get_queue_batch_v2`, etc.)
2. Create processor Edge Function (`queue-processor-v2`)
3. Create cron job invoker (`invoke_processor_loop_v2`)
4. **DO NOT** enable cron job yet
5. Test manually by inserting jobs

**Success Criteria:**
- Can manually insert jobs into queue
- Processor can process jobs manually
- No impact on existing system

### Phase 3: Staleness System (Parallel) (Week 2-3)
**Goal:** Build staleness checking without using it

**Tasks:**
1. Create `check_and_queue_stale_batch_v2` function
2. Create `check_and_queue_stale_data_from_presence_v2` function
3. Create `refresh-analytics-from-presence-v2` Edge Function
4. **DO NOT** enable feature flag yet
5. Test manually with test symbols

**Success Criteria:**
- Can manually trigger staleness checks
- Queue gets populated correctly
- No impact on existing system

### Phase 4: Frontend Integration (Gradual) (Week 3)
**Goal:** Add Presence tracking without breaking Realtime

**Tasks:**
1. Add Presence to Realtime channels (alongside existing subscriptions)
2. Track presence with metadata (no Edge Function calls)
3. Keep existing Realtime subscriptions active
4. Monitor both systems

**Success Criteria:**
- Presence tracking works
- Existing Realtime still works
- Can disable new system via feature flag

### Phase 5: Migration (One Type at a Time) (Week 4)
**Goal:** Migrate one data type to new system

**Tasks:**
1. Pick one data type (e.g., `quote`)
2. Enable feature flag for that type only
3. Disable old cron job for that type
4. Monitor for 24-48 hours
5. If successful, migrate next type

**Success Criteria:**
- One data type fully migrated
- No data gaps
- Can rollback if needed

### Phase 6: Full Migration (Week 5+)
**Goal:** Migrate all data types

**Tasks:**
1. Migrate remaining data types one by one
2. Remove old cron jobs
3. Remove `_v2` suffixes (rename tables)
4. Clean up feature flags

**Success Criteria:**
- All data types migrated
- Old system fully removed
- New system is production-ready

---

## 6. Risk Mitigation Checklist

### Before Starting Build
- [ ] Feature flags table created
- [ ] Monitoring/logging infrastructure ready
- [ ] Rollback procedures documented
- [ ] Current system behavior documented (baseline)
- [ ] Manual testing checklists created

### During Each Phase
- [ ] New code has `_v2` suffix (parallel system)
- [ ] Feature flags control new system
- [ ] Old system continues working
- [ ] Manual testing completed
- [ ] Monitoring shows no errors

### Before Enabling New System
- [ ] All manual tests passed
- [ ] Monitoring infrastructure ready
- [ ] Rollback plan tested
- [ ] Team notified of change
- [ ] Feature flag ready to disable

### After Enabling New System
- [ ] Monitor for 24-48 hours
- [ ] Verify data is updating correctly
- [ ] Check queue depth is reasonable
- [ ] Verify no errors in logs
- [ ] Confirm old system can be disabled

---

## 7. Success Metrics

### Phase 0 (Safety)
- Feature flags working: ✅/❌
- Monitoring active: ✅/❌
- Rollback tested: ✅/❌

### Phase 1 (Foundation)
- Tables created: ✅/❌
- Can query data: ✅/❌
- No impact on existing: ✅/❌

### Phase 2 (Queue)
- Jobs can be queued: ✅/❌
- Jobs can be processed: ✅/❌
- No impact on existing: ✅/❌

### Phase 3 (Staleness)
- Staleness checks work: ✅/❌
- Queue populated correctly: ✅/❌
- No impact on existing: ✅/❌

### Phase 4 (Frontend)
- Presence tracking works: ✅/❌
- Existing Realtime works: ✅/❌
- Can disable via flag: ✅/❌

### Phase 5 (Migration)
- One type migrated: ✅/❌
- Data updating correctly: ✅/❌
- Can rollback: ✅/❌

### Phase 6 (Complete)
- All types migrated: ✅/❌
- Old system removed: ✅/❌
- Production ready: ✅/❌

---

## 8. Rollback Procedures

### For Each Phase

**Phase 1-3 (Foundation/Queue/Staleness):**
- Disable feature flags
- Old system continues working
- No rollback needed (parallel system)

**Phase 4 (Frontend):**
- Disable `use_presence_tracking` flag
- Frontend falls back to old Realtime
- No data loss

**Phase 5-6 (Migration):**
- Re-enable old cron job for affected type
- Disable new system for that type
- Data continues updating via old system

---

## 9. Timeline Estimate

**Conservative (Safe):**
- Phase 0: 3-5 days
- Phase 1: 5-7 days
- Phase 2: 5-7 days
- Phase 3: 5-7 days
- Phase 4: 3-5 days
- Phase 5: 7-10 days (one type at a time)
- Phase 6: 7-10 days (remaining types)

**Total: 6-8 weeks**

**Aggressive (Risky):**
- Combine phases, reduce testing
- **Total: 3-4 weeks**
- **Not recommended without tests**

---

## 10. Final Recommendation

**✅ PROCEED with build using:**
1. **Parallel System Approach** (Option B)
2. **Feature Flags** for gradual rollout
3. **Manual Testing Checklists** for each phase
4. **One Type at a Time** migration strategy
5. **Conservative Timeline** (6-8 weeks)

**Critical Success Factors:**
- Never break existing system
- Test thoroughly before enabling
- Monitor closely after enabling
- Have rollback ready at all times

**You are ready to build, but safety is paramount.**

