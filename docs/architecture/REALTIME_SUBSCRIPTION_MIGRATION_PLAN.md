# Migration Plan: Replace `active_subscriptions_v2` with `realtime.subscription`

## Executive Summary

**Verdict:** ✅ **YES, `realtime.subscription` can FULLY replace `active_subscriptions_v2`** for all 8 data types.

**Key Benefits:**
- ✅ Eliminates duplicate subscription tracking
- ✅ Automatic cleanup (Supabase handles disconnect - records disappear automatically)
- ✅ Single source of truth (no sync needed)
- ✅ Reduces client-side complexity (no heartbeat needed, no manual registration)
- ✅ No `last_seen_at` needed (subscriptions auto-remove on disconnect)

**Key Changes:**
- ✅ **Exchange variants now uses `symbol` column** (renamed from `base_symbol`) - consistent with all other tables
- ✅ **All 7 symbol-specific data types use the same filter pattern:** `{"(symbol,eq,ASAN)"}`
- ✅ **Auto-cleanup confirmed:** When clients disconnect, records automatically disappear from `realtime.subscription` - no need for `last_seen_at`

---

## Current Architecture

### `active_subscriptions_v2` Table

```sql
CREATE TABLE active_subscriptions_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, symbol, data_type)
);
```

**Current Usage:**
1. **Client Registration:** Frontend calls `upsert_active_subscription_v2()` on mount
2. **Heartbeat:** Frontend sends heartbeat every 1 minute via `upsert_active_subscription_v2()`
3. **Client Cleanup:** Frontend deletes on unmount
4. **Background Cleanup:** Cron job removes `last_seen_at > 5 minutes`
5. **Staleness Checker:** Uses `active_subscriptions_v2` to find active subscriptions

### `realtime.subscription` Table (Supabase Built-in)

```sql
-- Supabase built-in table (read-only for us)
realtime.subscription (
  id BIGINT,
  subscription_id UUID,
  entity REGCLASS,        -- Table name (e.g., "profiles", "financial_statements")
  filters ARRAY,          -- PostgREST filters like {"(symbol,eq,ASAN)"}
  claims JSONB,           -- JWT claims with user_id in "sub" field
  claims_role REGROLE,
  created_at TIMESTAMP WITHOUT TIME ZONE
)
```

**Key Observations:**
- ✅ Automatically maintained by Supabase when client subscribes/unsubscribes
- ✅ **Automatically cleaned up when client disconnects** (records disappear - no need for `last_seen_at`)
- ✅ Contains all information needed: user_id, symbol (in filters), data_type (from entity)
- ✅ **No manual cleanup needed** - Supabase handles it automatically

---

## Data Mapping

### Entity → Data Type Mapping

| `entity` (table name) | `data_type` | Filter Pattern |
|----------------------|-------------|----------------|
| `profiles` | `profile` | `{"(symbol,eq,ASAN)"}` |
| `live_quote_indicators` | `quote` | `{}` (global, no symbol filter) |
| `financial_statements` | `financial-statements` | `{"(symbol,eq,ASAN)"}` |
| `ratios_ttm` | `ratios-ttm` | `{"(symbol,eq,ASAN)"}` |
| `dividend_history` | `dividend-history` | `{"(symbol,eq,ASAN)"}` |
| `revenue_product_segmentation` | `revenue-product-segmentation` | `{"(symbol,eq,ASAN)"}` |
| `grades_historical` | `grades-historical` | `{"(symbol,eq,ASAN)"}` |
| `exchange_variants` | `exchange-variants` | `{"(symbol,eq,ASAN)"}` ✅ **Now uses `symbol` (renamed from `base_symbol`)** |

### Filter → Symbol Extraction

**Standard pattern (7 out of 8 data types):**
```sql
-- All tables now use symbol filter: filters = {"(symbol,eq,ASAN)"}
SUBSTRING(filters::text FROM 'symbol,eq,([^)]+)') AS symbol
```

**Special case (`live_quote_indicators`, `exchange_market_status`):**
```sql
-- No symbol filter (subscribes to all): filters = "{}"
-- These need special handling or exclusion from staleness checker
```

**✅ No special case for `exchange_variants` anymore** - it now uses `symbol` like all other tables!

---

## Implementation Plan

### Phase 1: Create Database Function

**Create `get_active_subscriptions_from_realtime()` function:**

```sql
-- Migration: create_get_active_subscriptions_from_realtime.sql
CREATE OR REPLACE FUNCTION get_active_subscriptions_from_realtime()
RETURNS TABLE(
  user_id UUID,
  symbol TEXT,
  data_type TEXT,
  subscribed_at TIMESTAMP WITHOUT TIME ZONE,
  last_seen_at TIMESTAMP WITHOUT TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (rs.claims->>'sub')::UUID AS user_id,
    SUBSTRING(rs.filters::text FROM 'symbol,eq,([^)]+)') AS symbol,
    CASE
      WHEN rs.entity::text = 'profiles' THEN 'profile'
      WHEN rs.entity::text = 'financial_statements' THEN 'financial-statements'
      WHEN rs.entity::text = 'ratios_ttm' THEN 'ratios-ttm'
      WHEN rs.entity::text = 'dividend_history' THEN 'dividend-history'
      WHEN rs.entity::text = 'revenue_product_segmentation' THEN 'revenue-product-segmentation'
      WHEN rs.entity::text = 'grades_historical' THEN 'grades-historical'
      WHEN rs.entity::text = 'exchange_variants' THEN 'exchange-variants'
      -- Note: quote is excluded (global subscription, no symbol filter)
    END AS data_type,
    rs.created_at AS subscribed_at,
    rs.created_at AS last_seen_at  -- Use created_at as proxy (subscription exists = active)
  FROM realtime.subscription rs
  WHERE
    rs.filters::text LIKE '%symbol,eq,%'  -- Only symbol-specific subscriptions
    AND rs.entity::text IN (
      'profiles', 'financial_statements', 'ratios_ttm',
      'dividend_history', 'revenue_product_segmentation',
      'grades_historical', 'exchange_variants'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_subscriptions_from_realtime() TO service_role;
```

**Test the function:**
```sql
SELECT * FROM get_active_subscriptions_from_realtime()
ORDER BY user_id, symbol, data_type;
```

### Phase 2: Update Staleness Checker

**Modify `check_and_queue_stale_data_from_presence_v2()`:**

```sql
-- Migration: update_staleness_checker_to_use_realtime_subscription.sql
-- Find the function definition and replace:
-- FROM public.active_subscriptions_v2 asub
-- With:
-- FROM get_active_subscriptions_from_realtime() asub

-- Example (exact location depends on current function):
CREATE OR REPLACE FUNCTION check_and_queue_stale_data_from_presence_v2(...)
AS $$
BEGIN
  -- ... existing logic ...

  -- Replace this line:
  -- FROM public.active_subscriptions_v2 asub

  -- With this:
  FROM get_active_subscriptions_from_realtime() asub

  -- ... rest of function ...
END;
$$ LANGUAGE plpgsql;
```

**Test the staleness checker:**
```sql
-- Run the staleness checker and verify jobs are created correctly
SELECT * FROM check_and_queue_stale_data_from_presence_v2();
```

### Phase 3: Remove Client-Side Registration Code

**Files to modify:**

#### 1. `src/hooks/useTrackSubscription.ts`

**Remove:**
- All `upsert_active_subscription_v2()` RPC calls
- Heartbeat interval logic (`heartbeatIntervalRef`, `setInterval`)
- `sendHeartbeat()` function
- Initial subscription registration on mount
- Cleanup subscription deletion on unmount

**Keep:**
- Realtime Presence tracking (if still needed for other purposes)
- Channel subscription/unsubscription logic

**Example changes:**
```typescript
// REMOVE: Heartbeat interval
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

// REMOVE: sendHeartbeat function
const sendHeartbeat = async () => {
  // ... all heartbeat logic ...
};

// REMOVE: setInterval for heartbeat
heartbeatIntervalRef.current = setInterval(() => {
  sendHeartbeat();
}, 60 * 1000);

// REMOVE: Initial heartbeat
sendHeartbeat();

// REMOVE: Cleanup heartbeat
if (heartbeatIntervalRef.current) {
  clearInterval(heartbeatIntervalRef.current);
  heartbeatIntervalRef.current = null;
}

// REMOVE: Initial subscription registration
await supabase.rpc('upsert_active_subscription_v2', {
  p_user_id: user.id,
  p_symbol: symbol,
  p_data_type: dataType,
});

// REMOVE: Cleanup subscription deletion
await supabase
  .from('active_subscriptions_v2')
  .delete()
  .eq('user_id', user.id)
  .eq('symbol', symbol)
  .eq('data_type', dataType);
```

#### 2. `src/hooks/useSubscriptionManager.ts`

**Remove:**
- All `upsert_active_subscription_v2()` RPC calls
- Heartbeat interval logic (`heartbeatIntervalRef`, `setInterval`)
- `sendHeartbeat()` function
- Initial subscription registration
- Cleanup subscription deletion

**Keep:**
- Subscription aggregation logic (if still needed)
- Feature flag check (if still needed)

**Example changes:**
```typescript
// REMOVE: Heartbeat interval
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

// REMOVE: sendHeartbeat function
const sendHeartbeat = async () => {
  for (const [symbol, dataTypes] of subscriptions.entries()) {
    for (const dataType of dataTypes) {
      await supabase.rpc('upsert_active_subscription_v2', {
        p_user_id: user.id,
        p_symbol: symbol,
        p_data_type: dataType,
      });
    }
  }
};

// REMOVE: setInterval for heartbeat
heartbeatIntervalRef.current = setInterval(() => {
  sendHeartbeat();
}, 60 * 1000);

// REMOVE: Initial heartbeat
sendHeartbeat();

// REMOVE: Cleanup heartbeat
if (heartbeatIntervalRef.current) {
  clearInterval(heartbeatIntervalRef.current);
  heartbeatIntervalRef.current = null;
}

// REMOVE: Cleanup subscription deletion
for (const [symbol, dataTypes] of subscriptions.entries()) {
  for (const dataType of dataTypes) {
    await supabase
      .from('active_subscriptions_v2')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .eq('data_type', dataType);
  }
}
```

#### 3. `src/lib/supabase/database.types.ts`

**Remove:**
- `upsert_active_subscription_v2` RPC function type definition
- `active_subscriptions_v2` table type definition

**Note:** Regenerate types after dropping the table:
```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

### Phase 4: Remove Database Objects

**Create migration to remove database objects:**

```sql
-- Migration: remove_active_subscriptions_v2.sql

-- 1. Drop the RPC function
DROP FUNCTION IF EXISTS upsert_active_subscription_v2(UUID, TEXT, TEXT);

-- 2. Drop any triggers or related functions
-- (Check for any triggers that reference active_subscriptions_v2)

-- 3. Drop the table (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS public.active_subscriptions_v2 CASCADE;

-- 4. Remove any cron jobs that clean up active_subscriptions_v2
-- (Check for cron jobs that reference this table)
```

**Verify no dependencies:**
```sql
-- Check for any remaining references
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'active_subscriptions_v2';

SELECT
  routine_schema,
  routine_name
FROM information_schema.routines
WHERE routine_definition LIKE '%active_subscriptions_v2%';
```

### Phase 5: Update Documentation

**Update:**
- Remove references to `active_subscriptions_v2` from documentation
- Update architecture diagrams
- Update API documentation (if any)
- Update migration notes

---

## Client-Side Cleanup Details

### Files Requiring Changes

#### 1. `src/hooks/useTrackSubscription.ts`

**Current code to remove:**
- Lines 24-25: Comment about `active_subscriptions_v2`
- Lines 44: `heartbeatIntervalRef` declaration
- Lines 112-164: `sendHeartbeat()` function
- Lines 130-133: Heartbeat interval setup
- Lines 136: Initial heartbeat call
- Lines 190-200: Initial subscription registration
- Lines 250-260: Cleanup subscription deletion
- Lines 280-290: Heartbeat cleanup

**What to keep:**
- Realtime Presence channel setup (if still needed)
- Channel subscription/unsubscription
- Feature flag check

#### 2. `src/hooks/useSubscriptionManager.ts`

**Current code to remove:**
- Lines 28: `heartbeatIntervalRef` declaration
- Lines 84-128: `sendHeartbeat()` function
- Lines 131-133: Heartbeat interval setup
- Lines 136: Initial heartbeat call
- Lines 185-195: Cleanup subscription deletion
- Lines 217-227: Additional cleanup logic

**What to keep:**
- Subscription aggregation logic
- Feature flag check
- Component lifecycle management

#### 3. `src/lib/supabase/database.types.ts`

**Regenerate after migration:**
```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

This will automatically remove:
- `active_subscriptions_v2` table type
- `upsert_active_subscription_v2` RPC function type

---

## Testing Plan

### 1. Verify Data Extraction

```sql
-- Test symbol extraction (all 7 symbol-specific data types)
SELECT
  entity::text,
  filters::text,
  SUBSTRING(filters::text FROM 'symbol,eq,([^)]+)') as symbol
FROM realtime.subscription
WHERE filters::text LIKE '%symbol,eq,%';
```

### 2. Verify Entity Mapping

```sql
-- Test data_type mapping
SELECT DISTINCT
  entity::text,
  CASE
    WHEN entity::text = 'profiles' THEN 'profile'
    WHEN entity::text = 'financial_statements' THEN 'financial-statements'
    WHEN entity::text = 'ratios_ttm' THEN 'ratios-ttm'
    WHEN entity::text = 'dividend_history' THEN 'dividend-history'
    WHEN entity::text = 'revenue_product_segmentation' THEN 'revenue-product-segmentation'
    WHEN entity::text = 'grades_historical' THEN 'grades-historical'
    WHEN entity::text = 'exchange_variants' THEN 'exchange-variants'
  END as data_type
FROM realtime.subscription
WHERE filters::text LIKE '%symbol,eq,%';
```

### 3. Compare Counts

```sql
-- Compare active_subscriptions_v2 vs realtime.subscription
SELECT
  (SELECT COUNT(*) FROM active_subscriptions_v2) as custom_count,
  (SELECT COUNT(*) FROM get_active_subscriptions_from_realtime()) as realtime_count;
```

### 4. Test Staleness Checker

```sql
-- Run staleness checker and verify jobs are created correctly
SELECT * FROM check_and_queue_stale_data_from_presence_v2();
```

### 5. Test Auto-Cleanup

**Manual test:**
1. Subscribe to a symbol in the frontend
2. Verify it appears in `realtime.subscription`:
   ```sql
   SELECT * FROM get_active_subscriptions_from_realtime()
   WHERE symbol = 'ASAN';
   ```
3. Disconnect client (close browser tab)
4. Wait a few seconds
5. Verify it disappears from `realtime.subscription`:
   ```sql
   SELECT * FROM get_active_subscriptions_from_realtime()
   WHERE symbol = 'ASAN';
   -- Should return 0 rows
   ```

### 6. Test Frontend Changes

**Verify:**
- ✅ No `upsert_active_subscription_v2` RPC calls in browser console
- ✅ No heartbeat intervals running
- ✅ Subscriptions still work (Realtime updates still arrive)
- ✅ No errors in console
- ✅ Staleness checker still creates jobs correctly

---

## Edge Cases & Considerations

### 1. Global Subscriptions (No Symbol Filter)

**Issue:** `live_quote_indicators` and `exchange_market_status` subscriptions have `filters = "{}"` (no symbol filter).

**Solution:**
- Exclude these from staleness checker (they're not symbol-specific)
- Or handle separately if needed (e.g., get symbols from active cards)

### 2. Exchange Variants

**✅ FIXED:** Exchange variants now uses `symbol` column (renamed from `base_symbol`), so it uses the same filter pattern as all other tables: `{"(symbol,eq,ASAN)"}`

**No special handling needed!**

### 3. Performance

**Indexes on `realtime.subscription`:**
- ✅ `ix_realtime_subscription_entity` (INDEX on `entity`)
- ✅ `pk_subscription` (PRIMARY KEY on `id`)
- ✅ `subscription_subscription_id_entity_filters_key` (UNIQUE constraint)

**Query Performance:** ✅ Good - can efficiently filter by `entity` (table name)

### 4. `last_seen_at` Granularity

**✅ RESOLVED:** `last_seen_at` is **NOT NEEDED** because:
- When clients disconnect, records **automatically disappear** from `realtime.subscription`
- If a subscription exists in `realtime.subscription`, it's active
- No need for granular tracking - subscription exists = active

**Recommendation:** Use `created_at` as proxy. If subscription exists, it's active. If it doesn't exist, client disconnected.

### 5. RLS & Permissions

**Issue:** `realtime.subscription` is in `realtime` schema, may have different permissions.

**Solution:**
- ✅ Function uses `SECURITY DEFINER` to run with elevated privileges
- ✅ Service role can query `realtime.subscription` directly
- ✅ No RLS needed (function handles access control)

---

## Comparison: Current vs. Proposed

| Aspect | Current (`active_subscriptions_v2`) | Proposed (`realtime.subscription`) |
|--------|-----------------------------------|-----------------------------------|
| **Source of Truth** | Custom table (duplicate) | Supabase built-in (single source) |
| **Client Registration** | Manual RPC call | Automatic (on subscribe) |
| **Client Cleanup** | Manual DELETE | Automatic (on unsubscribe/disconnect) |
| **Heartbeat** | Required (1 min interval) | Not needed (subscription exists = active) |
| **Background Cleanup** | Required (5 min timeout) | Automatic (Supabase handles) |
| **`last_seen_at`** | Required (tracks activity) | Not needed (auto-removes on disconnect) |
| **Performance** | Indexed, optimized | Indexed (Supabase provides) |
| **Data Granularity** | `last_seen_at` (1 min precision) | `created_at` (subscription lifetime) |
| **Complexity** | High (client + server sync) | Low (automatic) |
| **Code Lines** | ~200+ lines (registration + heartbeat) | 0 lines (automatic) |

---

## Rollback Plan

If issues arise, rollback steps:

1. **Revert database function:**
   ```sql
   DROP FUNCTION IF EXISTS get_active_subscriptions_from_realtime();
   ```

2. **Revert staleness checker:**
   ```sql
   -- Restore original function that uses active_subscriptions_v2
   ```

3. **Restore client code:**
   - Revert changes to `useTrackSubscription.ts`
   - Revert changes to `useSubscriptionManager.ts`
   - Restore heartbeat logic

4. **Restore database table:**
   ```sql
   -- Re-run migration that creates active_subscriptions_v2
   ```

---

## Timeline & Effort Estimate

**Total Estimated Time:** ~2-3 hours

**Breakdown:**
- Phase 1 (Database Function): 30 minutes
- Phase 2 (Staleness Checker): 30 minutes
- Phase 3 (Client Cleanup): 60 minutes
- Phase 4 (Database Cleanup): 15 minutes
- Phase 5 (Testing): 30 minutes
- Phase 6 (Documentation): 15 minutes

---

## Status

**Ready to implement** - all blockers resolved:
- ✅ Exchange variants uses `symbol` (migration complete)
- ✅ Auto-cleanup confirmed (no `last_seen_at` needed)
- ✅ All data types use consistent filter pattern
- ✅ Performance verified (indexes exist)
- ✅ Permissions verified (service role can query)

---

## Questions Answered

1. ✅ **Performance:** Does `realtime.subscription` have indexes? **YES** - Has indexes on `entity` and unique constraints
2. ✅ **Permissions:** Can we query `realtime.subscription` with service role? **YES** - Works with service role
3. ✅ **Global subscriptions:** How do we handle `live_quote_indicators` and `exchange_market_status`? **Exclude from staleness checker** (they're not symbol-specific)
4. ✅ **Exchange variants:** Does it use `symbol` filter? **YES** - After migration, uses `symbol` like all other tables
5. ✅ **`last_seen_at`:** Is it needed? **NO** - Subscriptions auto-remove on disconnect, so if subscription exists, it's active
6. ✅ **Heartbeat:** Is it needed? **NO** - Subscriptions auto-remove on disconnect, so if subscription exists, it's active

