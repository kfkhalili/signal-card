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

### Option A: Trigger on Subscription Creation (Immediate Job Creation)

**Concept:** When a user subscribes to Realtime, immediately check staleness and create jobs.

**Implementation:**
1. **Edge Function** called when card is added (frontend → Edge Function)
2. Edge Function calls `check_and_queue_stale_batch_v2()` immediately
3. Background checker still runs (for data that becomes stale over time)

**Pros:**
- ✅ Immediate job creation (0 latency)
- ✅ No changes to `realtime.subscription` (can't add triggers to system tables)
- ✅ Uses existing `check_and_queue_stale_batch_v2()` function
- ✅ Simple to implement

**Cons:**
- ⚠️ Still need background checker for data that becomes stale over time
- ⚠️ Requires frontend to call Edge Function (not fully automatic)

**Code Example:**
```typescript
// Edge Function: on-card-add
export async function handleCardAdd(req: Request) {
  const { symbol, dataTypes } = await req.json();

  // Immediately check staleness and create jobs
  await supabase.rpc('check_and_queue_stale_batch_v2', {
    p_symbol: symbol,
    p_data_types: dataTypes,
    p_priority: 1 // High priority for user-facing
  });
}
```

**Status:** ✅ **RECOMMENDED** - Best balance of simplicity and performance

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

### Option C: Hybrid Approach (Immediate + Background)

**Concept:** Combine immediate job creation with reduced-frequency background checking.

**Implementation:**
1. **Immediate:** Edge Function called on card add → creates jobs immediately
2. **Background:** Cron job runs every 5 minutes (instead of 1 minute) for data that becomes stale over time
3. **Event-driven:** Use triggers on data tables to detect when data becomes stale (optional)

**Pros:**
- ✅ Immediate response for new subscriptions
- ✅ Reduced polling overhead (5x less frequent)
- ✅ Still catches data that becomes stale over time
- ✅ Best of both worlds

**Cons:**
- ⚠️ Still requires some polling (but much less)
- ⚠️ Requires frontend to call Edge Function

**Status:** ✅ **RECOMMENDED** - Optimal solution

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

**Status:** ✅ **CREATED** - Trigger is now active!

**Alternative (if trigger doesn't work in production):**

1. **Create Edge Function:** `on-card-add`
   ```typescript
   // supabase/functions/on-card-add/index.ts
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

   Deno.serve(async (req: Request) => {
     const { symbol, dataTypes } = await req.json();

     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );

     // Immediately check staleness and create jobs
     const { error } = await supabase.rpc('check_and_queue_stale_batch_v2', {
       p_symbol: symbol,
       p_data_types: dataTypes,
       p_priority: 1 // High priority for user-facing
     });

     if (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' }
       });
     }

     return new Response(JSON.stringify({ success: true }), {
       status: 200,
       headers: { 'Content-Type': 'application/json' }
     });
   });
   ```

2. **Update Frontend:** Call Edge Function when card is added
   ```typescript
   // src/hooks/useWorkspaceManager.ts
   const addCard = async (cardData: CardData) => {
     // ... existing card creation logic ...

     // Immediately check staleness and create jobs
     await fetch('/api/on-card-add', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         symbol: cardData.symbol,
         dataTypes: getDataTypesForCard(cardData.type)
       })
     });
   };
   ```

3. **Benefits:**
   - ✅ **0 latency** for new subscriptions (immediate job creation)
   - ✅ Uses existing `check_and_queue_stale_batch_v2()` function
   - ✅ No database changes needed
   - ✅ Simple to implement

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

### Step 1: Immediate Job Creation (Week 1)

1. **Create Edge Function** `on-card-add`
   - Accepts `symbol` and `dataTypes` array
   - Calls `check_and_queue_stale_batch_v2()`
   - Returns success/error

2. **Update Frontend**
   - Call Edge Function when card is added
   - Handle errors gracefully (don't block card creation)

3. **Test**
   - Verify jobs created immediately
   - Verify no duplicate jobs
   - Monitor queue success rate

### Step 2: Reduce Polling Frequency (Week 2)

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

### Immediate Benefits (Phase 1)

- ✅ **0 latency** for new subscriptions (down from 1 minute)
- ✅ **Better user experience** (data refreshes immediately)
- ✅ **No database changes** (uses existing functions)

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

### Phase 1 (Immediate Job Creation)

- ✅ **Job creation latency:** <1 second (down from 60 seconds)
- ✅ **Queue success rate:** Maintain >95%
- ✅ **Duplicate jobs:** 0 (idempotent creation)

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

**Recommended Approach:** **Hybrid (Option C)**

1. **Phase 1:** Immediate job creation via Edge Function (eliminates 1-minute latency)
2. **Phase 2:** Reduce background polling to 5 minutes (80% reduction in queries)
3. **Phase 3:** Optional triggers for immediate staleness detection (evaluate performance first)

This approach provides:
- ✅ **Immediate response** for new subscriptions (0 latency)
- ✅ **Reduced polling** (80% less database queries)
- ✅ **Simple implementation** (uses existing functions)
- ✅ **Low risk** (gradual rollout, easy to rollback)

**Next Steps:**
1. Implement Phase 1 (immediate job creation)
2. Monitor for 1 week
3. Implement Phase 2 (reduce polling)
4. Evaluate Phase 3 (triggers) based on performance

---

## References

- **Current Staleness Checker:** `supabase/migrations/20251117073831_create_background_staleness_checker_v2.sql`
- **User-Facing Staleness Checker:** `supabase/migrations/20251117073830_create_staleness_check_functions_v2.sql`
- **Cron Jobs:** `supabase/migrations/20251117074150_create_cron_jobs_v2.sql`
- **Master Architecture:** `docs/architecture/MASTER-ARCHITECTURE.md`

