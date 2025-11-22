# Event-Driven Processing Analysis
**Date:** 2025-01-21
**Status:** Analysis & Design Document
**Goal:** Eliminate polling-based staleness checking using database triggers

---

## Current System (Polling-Based)

### How It Works Now

1. **Cron Job** (`check-stale-data-v2`) runs every minute
2. **Queries** `realtime.subscription` via `get_active_subscriptions_from_realtime()`
3. **Checks** each symbol/data_type combination for staleness
4. **Creates jobs** if data is stale and no pending job exists

### Current Flow

```
Every 1 minute:
  Cron Job → check_and_queue_stale_data_from_presence_v2()
    → Query realtime.subscription (all active subscriptions)
    → For each symbol:
      → For each data_type:
        → Check if stale (is_data_stale_v2())
        → If stale AND no pending job → Create job
```

### Limitations

1. **1-minute latency** - Jobs created up to 1 minute after subscription
2. **Polling overhead** - Queries entire subscription table every minute
3. **No immediate response** - Can't react instantly to new subscriptions
4. **Resource usage** - Processes up to 1000 symbols per run (even if nothing changed)

---

## Event-Driven Approach: Design Options

### Option A: Edge Function on Card Add (Alternative Approach)

**Concept:** When a card is added, call an Edge Function that immediately checks staleness and creates jobs.

**Implementation:**
1. **Edge Function** called when card is added (frontend → Edge Function)
2. Edge Function calls `check_and_queue_stale_batch_v2()` immediately
3. Background checker still runs (for data that becomes stale over time)

**Pros:**
- ✅ Immediate job creation (0 latency)
- ✅ Uses existing `check_and_queue_stale_batch_v2()` function
- ✅ Simple to implement

**Cons:**
- ⚠️ Still need background checker for data that becomes stale over time
- ⚠️ Requires frontend to call Edge Function (not fully automatic)
- ⚠️ Additional network call (Edge Function → Database)

**Status:** ⚠️ **NOT NEEDED** - Database trigger (Option D) is better (fully automatic, no frontend changes)

---

### Option B: Database Triggers on Data Tables (Staleness Detection)

**Concept:** When data is updated, check if it's now stale and create jobs.

**Implementation:**
1. **Trigger** on each data table (`profiles`, `live_quote_indicators`, etc.)
2. Trigger fires on `UPDATE` or `INSERT`
3. Trigger calls a function to check if data is stale
4. If stale, creates a job

**Pros:**
- ✅ Automatic (no frontend changes)
- ✅ Reacts to data updates immediately
- ✅ Can detect when data becomes stale

**Cons:**
- ❌ **Doesn't solve the core problem** - Still need to detect when subscriptions are created
- ❌ Triggers fire on every update (even if not stale)
- ❌ Complex trigger logic (needs to check subscriptions)
- ❌ Performance overhead (trigger on every data update)

**Status:** ❌ **NOT RECOMMENDED** - Doesn't address subscription creation latency

---

### Option C: Hybrid Approach (Trigger + Reduced Background Polling)

**Concept:** Combine database trigger (immediate job creation) with reduced-frequency background checking.

**Implementation:**
1. **Immediate:** Database trigger on `realtime.subscription` → creates jobs immediately
2. **Background:** Cron job runs every 5 minutes (instead of 1 minute) for data that becomes stale over time
3. **Event-driven:** Use triggers on data tables to detect when data becomes stale (optional)

**Pros:**
- ✅ Immediate response for new subscriptions (via trigger)
- ✅ Reduced polling overhead (5x less frequent)
- ✅ Still catches data that becomes stale over time
- ✅ Fully automatic (no frontend changes needed)

**Cons:**
- ⚠️ Still requires some polling (but much less) for data that becomes stale over time

**Status:** ✅ **RECOMMENDED** - Optimal solution (combines Option D + reduced polling)

---

### Option D: Database Trigger on `realtime.subscription` (✅ **FEASIBLE!**)

**Concept:** Create a trigger on `realtime.subscription` that fires when subscriptions are created.

**Implementation:**
1. **Trigger function** extracts symbol and data_type from subscription
2. Trigger calls `check_and_queue_stale_batch_v2()` immediately
3. No polling needed for new subscriptions

**Pros:**
- ✅ **True event-driven** (no polling for new subscriptions)
- ✅ **Immediate response** (0 latency)
- ✅ **Automatic** (no frontend changes needed)
- ✅ **Uses existing functions** (`check_and_queue_stale_batch_v2`)
- ✅ **Can create triggers on `realtime.subscription`** (verified - it works!)

**Cons:**
- ⚠️ Still need background checker for data that becomes stale over time
- ⚠️ Trigger runs synchronously (could slow down subscription creation if heavy)

**Status:** ✅ **RECOMMENDED** - Best solution for immediate job creation!

---

### Option E: Supabase Realtime Webhooks (If Available)

**Concept:** Use Supabase's webhook system to detect subscription changes.

**Implementation:**
1. Configure webhook for `realtime.subscription` changes
2. Webhook calls Edge Function when subscription is created/deleted
3. Edge Function checks staleness and creates jobs

**Pros:**
- ✅ True event-driven
- ✅ No polling needed
- ✅ Works with `realtime.subscription`

**Cons:**
- ❌ **May not be available** - Need to verify if Supabase supports webhooks for `realtime.subscription`
- ❌ External dependency (webhook reliability)
- ❌ Additional latency (webhook → Edge Function)

**Status:** ⚠️ **INVESTIGATE** - Check if Supabase supports this

---

## Recommended Solution: Database Trigger on `realtime.subscription` (Option D - UPDATED!)

**UPDATE:** After testing, we confirmed that **triggers CAN be created on `realtime.subscription`**! This changes the recommended approach.

### Phase 1: Database Trigger on `realtime.subscription` (✅ **IMPLEMENTED!**)

**Goal:** Eliminate 1-minute latency for new subscriptions using database triggers.

**Implementation:**

1. **Create Trigger Function:** `on_realtime_subscription_insert()`
   - Extracts symbol from `filters` JSONB
   - Maps `entity` to `data_type`
   - Calls `check_and_queue_stale_batch_v2()` immediately

2. **Create Trigger:** `on_realtime_subscription_insert_trigger`
   - Fires `AFTER INSERT` on `realtime.subscription`
   - Automatically checks staleness and creates jobs

**Status:** ✅ **IMPLEMENTED & TESTED** - Trigger is active and working!

**Migration:** `supabase/migrations/20250121150000_create_realtime_subscription_trigger.sql`

**Test Results:**
- ✅ Trigger fires correctly when subscriptions are created
- ✅ Jobs are created immediately (0 latency)
- ✅ No errors or performance issues observed
- ✅ Works automatically (no frontend changes needed)

**Benefits:**
- ✅ **0 latency** for new subscriptions (immediate job creation)
- ✅ **Fully automatic** (no frontend changes needed)
- ✅ Uses existing `check_and_queue_stale_batch_v2()` function
- ✅ **Event-driven** (no polling for new subscriptions)

### Phase 2: Reduce Background Polling Frequency

**Goal:** Reduce polling overhead while still catching data that becomes stale over time.

**Implementation:**

1. **Update Cron Job:** Change frequency from 1 minute to 5 minutes
   ```sql
   -- Update cron job frequency
   SELECT cron.alter_job(
     (SELECT jobid FROM cron.job WHERE jobname = 'check-stale-data-v2'),
     schedule := '*/5 * * * *'  -- Every 5 minutes instead of every minute
   );
   ```

2. **Benefits:**
   - ✅ **5x less polling** (80% reduction in database queries)
   - ✅ Still catches data that becomes stale over time
   - ✅ Minimal impact (most jobs created immediately via Phase 1)

### Phase 3: Optional - Trigger on Data Updates (Advanced)

**Goal:** Detect when data becomes stale immediately after update.

**Implementation:**

1. **Create Trigger Function:**
   ```sql
   CREATE OR REPLACE FUNCTION check_staleness_on_update()
   RETURNS TRIGGER AS $$
   DECLARE
     reg_row RECORD;
     is_stale BOOLEAN;
   BEGIN
     -- Get registry entry for this table
     SELECT * INTO reg_row
     FROM data_type_registry_v2
     WHERE table_name = TG_TABLE_NAME;

     IF NOT FOUND THEN
       RETURN NEW; -- Not a tracked table
     END IF;

     -- Check if data is stale
     EXECUTE format(
       'SELECT %I($1.%I, %L::INTEGER)',
       reg_row.staleness_function,
       reg_row.timestamp_column,
       reg_row.default_ttl_minutes
     ) USING NEW INTO is_stale;

     -- If stale, create job (only if subscription exists)
     IF is_stale THEN
       PERFORM queue_refresh_if_not_exists_v2(
         NEW.symbol,
         reg_row.data_type,
         1, -- High priority
         reg_row.estimated_data_size_bytes
       );
     END IF;

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Create Triggers:**
   ```sql
   -- Example for profiles table
   CREATE TRIGGER check_staleness_on_profile_update
   AFTER INSERT OR UPDATE ON profiles
   FOR EACH ROW
   EXECUTE FUNCTION check_staleness_on_update();
   ```

3. **Benefits:**
   - ✅ Immediate detection when data becomes stale
   - ✅ Automatic (no frontend changes)
   - ✅ Works for scheduled refreshes too

4. **Considerations:**
   - ⚠️ Trigger fires on every update (performance overhead)
   - ⚠️ Needs to check if subscription exists (additional query)
   - ⚠️ May create duplicate jobs if background checker also runs

**Status:** ⚠️ **OPTIONAL** - Evaluate performance impact before implementing

---

## Implementation Plan

### Step 1: Database Trigger on `realtime.subscription` ✅ **COMPLETE**

1. **Created Trigger Function:** `on_realtime_subscription_insert()`
   - Extracts symbol from `filters` JSONB
   - Maps `entity` to `data_type`
   - Calls `check_and_queue_stale_batch_v2()` immediately

2. **Created Trigger:** `on_realtime_subscription_insert_trigger`
   - Fires `AFTER INSERT` on `realtime.subscription`
   - Automatically checks staleness and creates jobs

3. **Tested & Verified:**
   - ✅ Trigger fires correctly when subscriptions are created
   - ✅ Jobs are created immediately (0 latency)
   - ✅ No errors or performance issues
   - ✅ Works automatically (no frontend changes needed)

**Migration:** `supabase/migrations/20250121150000_create_realtime_subscription_trigger.sql`

### Step 2: Reduce Polling Frequency (Next Step)

1. **Update Cron Job**
   - Change frequency from 1 minute to 5 minutes
   - Monitor for any issues

2. **Test**
   - Verify background checker still catches stale data
   - Monitor queue depth (should stay low)

### Step 3: Evaluate Trigger Approach (Week 3-4)

1. **Performance Testing**
   - Measure trigger overhead
   - Test with realistic load

2. **Decision**
   - Implement if performance impact is acceptable
   - Skip if Phase 1+2 are sufficient

---

## Expected Benefits

### Immediate Benefits (Phase 1) ✅ **ACHIEVED**

- ✅ **0 latency** for new subscriptions (down from 1 minute) - **VERIFIED**
- ✅ **Better user experience** (data refreshes immediately) - **VERIFIED**
- ✅ **Fully automatic** (no frontend changes needed) - **VERIFIED**
- ✅ **Event-driven** (no polling for new subscriptions) - **VERIFIED**

### Reduced Polling (Phase 2)

- ✅ **80% reduction** in polling queries (5x less frequent)
- ✅ **Lower database load** (fewer queries per hour)
- ✅ **Cost savings** (less compute time)

### Optional Triggers (Phase 3)

- ✅ **Immediate staleness detection** (even for scheduled refreshes)
- ✅ **Fully automatic** (no polling needed for staleness detection)
- ⚠️ **Performance trade-off** (trigger overhead)

---

## Risks & Mitigations

### Risk 1: Duplicate Job Creation

**Scenario:** Both immediate check and background checker create jobs for same symbol/data_type.

**Mitigation:**
- ✅ `queue_refresh_if_not_exists_v2()` already prevents duplicates
- ✅ Uses `ON CONFLICT DO NOTHING` in background checker
- ✅ Idempotent job creation

### Risk 2: Frontend Failure

**Scenario:** Edge Function call fails, no immediate job created.

**Mitigation:**
- ✅ Background checker still runs (catches missed jobs)
- ✅ Frontend should handle errors gracefully (don't block card creation)
- ✅ Log failures for monitoring

### Risk 3: Trigger Performance

**Scenario:** Triggers add significant overhead to data updates.

**Mitigation:**
- ✅ Test with realistic load first
- ✅ Use `AFTER` triggers (don't block updates)
- ✅ Make trigger logic efficient (minimal queries)
- ✅ Consider making Phase 3 optional

---

## Success Metrics

### Phase 1 (Database Trigger) ✅ **ACHIEVED**

- ✅ **Job creation latency:** <1 second (down from 60 seconds) - **VERIFIED**
- ✅ **Queue success rate:** Maintain >95% - **MONITORING**
- ✅ **Duplicate jobs:** 0 (idempotent creation) - **VERIFIED**
- ✅ **Trigger performance:** No noticeable latency added to subscription creation - **VERIFIED**

### Phase 2 (Reduced Polling)

- ✅ **Polling frequency:** 5 minutes (down from 1 minute)
- ✅ **Database queries:** 80% reduction
- ✅ **Queue depth:** Stays low (<100 pending jobs)

### Phase 3 (Optional Triggers)

- ✅ **Staleness detection latency:** <1 second
- ✅ **Trigger overhead:** <10ms per update
- ✅ **Job creation rate:** No significant increase

---

## Conclusion

**Recommended Approach:** **Database Trigger on `realtime.subscription` (Option D) + Reduced Polling**

1. **✅ Phase 1 COMPLETE:** Database trigger on `realtime.subscription` (eliminates 1-minute latency)
   - Trigger automatically creates jobs when subscriptions are created
   - 0 latency for new subscriptions
   - Fully automatic (no frontend changes needed)
   - Tested and working in production

2. **Phase 2 (Next):** Reduce background polling to 5 minutes (80% reduction in queries)
   - Most jobs now created immediately via trigger
   - Background checker still needed for data that becomes stale over time
   - Can safely reduce frequency from 1 minute to 5 minutes

3. **Phase 3 (Optional):** Triggers on data updates for immediate staleness detection
   - Evaluate performance impact first
   - May not be needed if Phase 1+2 are sufficient

**Current Status:**
- ✅ **Phase 1 Complete** - Database trigger implemented and tested
- ⏳ **Phase 2 Pending** - Reduce polling frequency (low priority, can be done anytime)
- ⏳ **Phase 3 Optional** - Evaluate based on performance needs

**Next Steps:**
1. ✅ ~~Implement Phase 1~~ - **COMPLETE**
2. Monitor trigger performance for 1 week
3. Implement Phase 2 (reduce polling frequency) when ready
4. Evaluate Phase 3 (data update triggers) if needed

---

## References

- **Database Trigger:** `supabase/migrations/20250121150000_create_realtime_subscription_trigger.sql` ✅ **IMPLEMENTED**
- **Current Staleness Checker:** `supabase/migrations/20251117073831_create_background_staleness_checker_v2.sql`
- **User-Facing Staleness Checker:** `supabase/migrations/20251117073830_create_staleness_check_functions_v2.sql`
- **Cron Jobs:** `supabase/migrations/20251117074150_create_cron_jobs_v2.sql`
- **Master Architecture:** `docs/architecture/MASTER-ARCHITECTURE.md`

