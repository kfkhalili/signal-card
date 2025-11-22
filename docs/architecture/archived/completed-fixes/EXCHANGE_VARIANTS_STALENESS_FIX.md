# Exchange-Variants Staleness Check Fix

**Problem:** Exchange-variants jobs were being created every minute despite 24-hour TTL.

**Root Cause:** Background checker was evaluating staleness per row instead of using MAX(fetched_at).

---

## The Problem Explained

### Data Structure

The `exchange_variants` table has **multiple rows per symbol** (one row per exchange variant):

```
symbol | symbol_variant | exchange_short_name | fetched_at
-------|----------------|---------------------|------------
AAPL   | AAPL           | NYSE                | 2025-11-22 08:52:05 (FRESH - just updated)
AAPL   | AAPL.L         | LSE                 | 2025-11-22 08:52:05 (FRESH - just updated)
AAPL   | AAPL           | NASDAQ              | 2025-11-18 06:57:09 (STALE - 4 days old)
AAPL   | AAPL           | TSE                 | 2025-11-22 08:52:05 (FRESH - just updated)
...
```

**Key Point:** Each variant has its own `fetched_at` timestamp. Some variants might be old while others are fresh.

### The Bug: Per-Row Staleness Check

The **OLD** background checker query was:

```sql
SELECT ...
FROM get_active_subscriptions_from_realtime() asub
LEFT JOIN exchange_variants t
  ON t.symbol = asub.symbol
WHERE
  asub.symbol = 'AAPL'
  AND asub.data_type = 'exchange-variants'
  AND (
    t.symbol IS NULL
    OR is_data_stale_v2(t.fetched_at, 1440) = true  -- ❌ Checks EACH row!
  )
```

**What Happened:**
1. LEFT JOIN creates **7 rows** for AAPL (one per variant)
2. The WHERE clause checks `is_data_stale_v2(t.fetched_at, 1440)` on **each row**
3. If **ANY row** is stale → condition is TRUE → job created
4. Even though the **most recent** variant was just updated (fresh), an **old variant** from 4 days ago triggers a job

**Result:** Jobs created every minute because there's always at least one old variant row.

**Why Old Rows Exist:** The FMP API can stop returning certain variants over time. For example:
- `APC.F` on `XETRA` exchange was returned on 2025-11-18
- FMP stopped returning this variant in later API calls
- The old row (`APC.F` + `XETRA`) remains in the database with stale `fetched_at`
- New upserts only update variants that ARE in the API response
- Orphaned rows (no longer returned by API) never get updated

**The Real Issue:** Orphaned rows from variants that FMP no longer returns, not a bug in the upsert logic.

**Why This Happens:**
- The upsert uses `onConflict: 'symbol_variant,exchange_short_name'`
- If FMP stops returning a variant, it's not in the `recordsToUpsert` array
- The old row in the database never gets updated (no conflict to resolve)
- The old row remains with its old `fetched_at` timestamp forever

**The Fix (MAX) is Still Correct:**
- We should check staleness based on the **most recent** data that WAS successfully fetched
- If the most recent fetch was fresh, we don't need to re-fetch
- Orphaned rows are a separate data cleanup issue (could be handled by deleting rows not in the latest API response)

---

## The Solution: MAX(fetched_at)

The **NEW** background checker query for exchange-variants:

```sql
SELECT ...
FROM get_active_subscriptions_from_realtime() asub
LEFT JOIN LATERAL (
  SELECT MAX(t.fetched_at) AS max_timestamp
  FROM exchange_variants t
  WHERE t.symbol = asub.symbol
) t_max ON true
WHERE
  asub.symbol = 'AAPL'
  AND asub.data_type = 'exchange-variants'
  AND (
    t_max.max_timestamp IS NULL
    OR is_data_stale_v2(t_max.max_timestamp, 1440) = true  -- ✅ Checks MAX only!
  )
```

**What Happens Now:**
1. LATERAL subquery computes `MAX(fetched_at)` across **all variants** for the symbol
2. Gets the **most recent** timestamp: `2025-11-22 08:52:05`
3. Checks staleness on **that MAX value only**
4. Only creates job if the **most recent variant** is stale

**Result:** Jobs only created when the most recent data is actually stale (respects 24-hour TTL).

---

## Why This Matters

### Before (Bug):
- **Every minute:** Background checker runs
- **Every minute:** Finds old variant row (4 days old) → creates job
- **Every minute:** Job processed → updates all variants → fresh data
- **Next minute:** Same cycle repeats

**Waste:** Unnecessary API calls every minute for data that's already fresh.

### After (Fixed):
- **Every minute:** Background checker runs
- **Checks MAX(fetched_at):** `2025-11-22 08:52:05` (1 minute ago)
- **Staleness check:** `is_data_stale_v2('2025-11-22 08:52:05', 1440)` = `false` (not stale)
- **No job created:** Data is fresh, respects 24-hour TTL

**Efficient:** Only creates jobs when data is actually stale.

---

## Comparison with Other Data Types

### Single-Row Data Types (profile, quote, etc.)
- **One row per symbol** → No problem
- Standard LEFT JOIN works fine
- `is_data_stale_v2(t.fetched_at, 1440)` checks the single row

### Multi-Row Data Types (exchange-variants)
- **Multiple rows per symbol** → Need MAX
- Must use `MAX(fetched_at)` to get most recent
- `is_data_stale_v2(MAX(t.fetched_at), 1440)` checks the most recent

---

## Code Changes

### `check_and_queue_stale_batch_v2()` ✅ Already Correct
- Uses `MAX(fetched_at)` for exchange-variants
- Works correctly

### `check_and_queue_stale_data_from_presence_v2()` ❌ Was Broken, Now Fixed
- **Before:** Used standard LEFT JOIN (wrong for exchange-variants)
- **After:** Uses `LATERAL (SELECT MAX(...))` for exchange-variants
- Now matches the batch function logic

---

## Verification

After the fix, you should see:
- ✅ Exchange-variants jobs only created when data is actually stale (>24 hours old)
- ✅ No more jobs created every minute for fresh data
- ✅ Respects the 24-hour TTL correctly

