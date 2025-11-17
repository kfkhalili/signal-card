# Implementation Plan: Backend-Controlled Refresh System

**Status:** Ready to Build
**Approach:** Parallel System with Feature Flags
**Timeline:** 6-8 weeks (conservative, safe)

---

## Scope of Work

I will build **the entire backend-controlled refresh system** as specified in `MASTER-ARCHITECTURE.md`, including:

### Database Layer
- ✅ `data_type_registry_v2` table (metadata-driven system)
- ✅ `api_call_queue_v2` table (partitioned by status)
- ✅ `api_data_usage_v2` table (quota tracking)
- ✅ `active_subscriptions_v2` table (analytics)
- ✅ All SQL functions (staleness checks, queue management, quota enforcement)
- ✅ All cron jobs (5 generic jobs replacing 11+ individual jobs)

### Backend Layer
- ✅ `track-subscription-v2` Edge Function (event-driven staleness check)
- ✅ `queue-processor-v2` Edge Function (monofunction architecture)
- ✅ `health-check` Edge Function (pg_cron monitoring)
- ✅ All worker functions in `/lib/` directory (fetch-fmp-* logic)
- ✅ Feature flags system

### Frontend Layer
- ✅ Realtime Presence integration
- ✅ Update `RealtimeStockManager` to use Presence
- ✅ Call `track-subscription-v2` on channel join
- ✅ Remove frontend staleness checking logic

### Migration
- ✅ Build new system alongside old (parallel)
- ✅ Migrate one data type at a time
- ✅ Remove old cron jobs
- ✅ Clean up `_v2` suffixes
- ✅ Remove feature flags

---

## Implementation Phases

### Phase 0: Safety Infrastructure (Week 0)
**Goal:** Set up safety mechanisms before building

**Tasks:**
1. Create `feature_flags` table
2. Create monitoring/logging infrastructure
3. Create manual testing checklists
4. Document rollback procedures
5. Document current system behavior (baseline)
6. Set up health check Edge Function
7. Configure external monitoring

**Deliverables:**
- Feature flags system working
- Monitoring dashboard ready
- Rollback procedures tested
- Baseline metrics recorded

---

### Phase 1: Foundation (Week 1)
**Goal:** Build core infrastructure (parallel, disabled)

**Database:**
1. Create `data_type_registry_v2` table
   - GRANT/REVOKE permissions (read-only)
   - CHECK constraints (TTL > 0)
2. Create `is_valid_identifier()` helper function
3. Create `active_subscriptions_v2` table
4. Create `api_call_queue_v2` table (partitioned)
   - Partitions: pending, processing, completed, failed
   - Indexes on each partition
   - FILLFACTOR = 70
5. Create `is_data_stale_v2()` function (no DEFAULT values)
6. Create `is_profile_stale_v2()` function

**Testing:**
- Manual test: Can insert/query all tables
- Verify no impact on existing system

**Deliverables:**
- All foundation tables created
- Helper functions working
- Feature flag: `use_queue_system = false` (disabled)

---

### Phase 2: Queue System (Week 2)
**Goal:** Build queue processing (parallel, disabled)

**Database:**
1. Create `api_data_usage_v2` table
2. Create `is_quota_exceeded_v2()` function
3. Create `get_queue_batch_v2()` function
   - Atomic batch claiming
   - Predictive quota check
   - FOR UPDATE SKIP LOCKED
4. Create `complete_queue_job_v2()` function
   - Auto-correction logic (random sampling)
   - Zero-start case handling
5. Create `fail_queue_job_v2()` function
6. Create `reset_job_immediate_v2()` function
7. Create `recover_stuck_jobs_v2()` function
   - FOR UPDATE SKIP LOCKED
8. Create `queue_refresh_if_not_exists_v2()` function
9. Create `invoke_processor_loop_v2()` function
   - Circuit breaker logic
   - Advisory lock (ID 44)
   - Recovery integration
10. Create `maintain_queue_partitions_v2()` function

**Edge Functions:**
1. Create `supabase/functions/lib/` directory structure
2. Move all `fetch-fmp-*` logic to `/lib/` as exportable functions
3. Create `queue-processor-v2` Edge Function
   - Monofunction architecture
   - Switch statement routing
   - Deadlock handling
   - Aggressive timeouts (10s)
   - All validations (data_type, shape, sanity, source timestamp)

**Testing:**
- Manual test: Can queue jobs
- Manual test: Can process jobs
- Verify no impact on existing system

**Deliverables:**
- Queue system fully functional
- Processor can handle jobs
- Feature flag: `use_queue_system = false` (still disabled)

---

### Phase 3: Staleness System (Week 2-3)
**Goal:** Build staleness checking (parallel, disabled)

**Infrastructure:**
1. Enable `pg_net` extension (if using "All in Postgres")
2. Grant `USAGE ON SCHEMA net` to cron job role
3. Verify outbound network access

**Database:**
1. Create `check_and_queue_stale_batch_v2()` function
   - SECURITY DEFINER
   - Fault tolerance
   - Fail-safe to stale
   - Identifier validation
2. Create `check_and_queue_stale_data_from_presence_v2()` function
   - HTTP error checking
   - Symbol-by-Symbol pattern
   - Temp table indexes
   - Advisory lock (ID 42)
   - Quota check
3. Create `refresh_analytics_from_presence_v2()` function
4. Create `queue_scheduled_refreshes_v2()` function
   - Throttling logic
   - TABLESAMPLE
   - Priority = -1 (hardcoded)
   - Advisory lock (ID 43)

**Edge Functions:**
1. Create `track-subscription-v2` Edge Function
   - Rate limiting configured
   - Single batch RPC call
   - Silent failure handling

**Testing:**
- Manual test: Staleness checks work
- Manual test: Queue gets populated
- Verify no impact on existing system

**Deliverables:**
- Staleness system fully functional
- Feature flags: All still disabled

---

### Phase 4: Frontend Integration (Week 3)
**Goal:** Add Presence tracking (parallel to existing Realtime)

**Frontend:**
1. Update `RealtimeStockManager` to use Presence
   - Join channels with Presence config
   - Track presence with metadata (symbol, dataTypes, userId)
   - Keep existing Realtime subscriptions (parallel)
2. Call `track-subscription-v2` on channel join
   - Feature-flagged
   - Error handling (silent failure)
3. Call `untrack-subscription-v2` on channel leave (optional)

**Testing:**
- Test: Presence tracking works
- Test: Existing Realtime still works
- Test: Can disable via feature flag

**Deliverables:**
- Frontend integrated with Presence
- Feature flag: `use_presence_tracking = false` (disabled initially)

---

### Phase 5: Migration (One Type at a Time) (Week 4)
**Goal:** Migrate one data type to new system

**Migration Order:**
1. `quote` (highest volume, most critical)
2. `profile` (high volume)
3. `financial-statements` (lower volume)
4. `ratios-ttm` (lower volume)
5. `dividend-history` (lower volume)
6. `shares-float` (lower volume)
7. `revenue-segmentation` (lower volume)
8. `grades-historical` (lower volume)
9. `exchange-variants` (lower volume)
10. `available-exchanges` (lower volume)
11. `exchange-market-status` (scheduled, not on-demand)

**Per-Type Process:**
1. Add to `data_type_registry_v2`
2. Enable feature flag for this type
3. Disable old cron job for this type
4. Monitor for 24-48 hours
5. If issues: Rollback
6. If successful: Mark as migrated

**Deliverables:**
- One data type fully migrated
- Monitoring shows healthy operation
- Can rollback if needed

---

### Phase 6: Full Migration (Week 5+)
**Goal:** Migrate all data types and clean up

**Tasks:**
1. Migrate remaining data types one by one
2. Remove all old cron jobs
3. Remove `_v2` suffixes (rename tables/functions)
4. Update frontend to remove feature flag checks
5. Clean up feature flags table
6. Update documentation
7. Final testing
8. Production deployment

**Deliverables:**
- All data types migrated
- Old system fully removed
- New system is production-ready
- Documentation updated

---

## Implementation Approach

### Safety First
- ✅ Parallel system (old + new)
- ✅ Feature flags control everything
- ✅ Manual testing checklists
- ✅ Monitoring & alerts
- ✅ Rollback procedures

### Code Quality
- ✅ Follow MASTER-ARCHITECTURE.md exactly
- ✅ All Sacred Contracts enforced
- ✅ No shortcuts or "temporary" hacks
- ✅ Clean, maintainable code

### Testing Strategy
- ✅ Manual testing (comprehensive checklists)
- ✅ Monitor metrics (queue depth, processing rate, errors)
- ✅ Test each phase before moving to next
- ✅ Test rollback procedures

---

## Success Criteria

### Phase 0
- [ ] Feature flags working
- [ ] Monitoring active
- [ ] Rollback tested
- [ ] Baseline recorded

### Phase 1
- [ ] All tables created
- [ ] Can query data
- [ ] No impact on existing

### Phase 2
- [ ] Jobs can be queued
- [ ] Jobs can be processed
- [ ] No impact on existing

### Phase 3
- [ ] Staleness checks work
- [ ] Queue populated correctly
- [ ] No impact on existing

### Phase 4
- [ ] Presence tracking works
- [ ] Existing Realtime works
- [ ] Can disable via flag

### Phase 5
- [ ] One type migrated
- [ ] Data updating correctly
- [ ] Can rollback

### Phase 6
- [ ] All types migrated
- [ ] Old system removed
- [ ] Production ready

---

## Timeline

**Conservative (Recommended):**
- Phase 0: 3-5 days
- Phase 1: 5-7 days
- Phase 2: 5-7 days
- Phase 3: 5-7 days
- Phase 4: 3-5 days
- Phase 5: 7-10 days (one type at a time)
- Phase 6: 7-10 days (remaining types)

**Total: 6-8 weeks**

---

## Next Steps

1. **Start with Phase 0** - Set up safety infrastructure
2. **Follow BUILD-TRACKING.md** - Track progress daily
3. **Reference MASTER-ARCHITECTURE.md** - Implementation details
4. **Use SAFETY-MECHANISMS.md** - Safety procedures

**Ready to begin Phase 0!** 🚀

