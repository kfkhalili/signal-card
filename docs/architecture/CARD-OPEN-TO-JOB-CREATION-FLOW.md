# Card Open → Job Creation Flow

**Purpose:** This document explains the complete flow from when a user opens a card to when jobs are created in the queue, including all checks and decision points.

---

## Overview

There are **TWO separate paths** that can create jobs in the queue:

1. **Trigger Path** (`on_realtime_subscription_insert` → `check_and_queue_stale_batch_v2`) - Automatically called when subscription is created (0 latency)
2. **Background Path** (`check_and_queue_stale_data_from_presence_v2`) - Runs every minute via cron to catch data that becomes stale over time

**CRITICAL:** Both paths check exchange status for quote data type (as of migration `20251118000000`).

---

## Path 1: Trigger Path (When Subscription is Created) ✅ **AUTOMATIC**

### Step 1: Card is Added to Workspace
- User adds a card via `AddCardForm`
- `addCardToWorkspace()` is called in `useWorkspaceManager`
- Card is initialized and added to workspace state

### Step 2: Card Component Mounts
- Card component (e.g., `PriceCard`, `ProfileCard`) mounts
- Subscription tracking is handled centrally by `useSubscriptionManager` in `useWorkspaceManager`

### Step 3: Realtime Subscription Created
- `useSubscriptionManager` creates Realtime subscription via Supabase client
- Subscription is inserted into `realtime.subscription` table

### Step 4: Database Trigger Fires ✅ **AUTOMATIC**
- **Trigger:** `on_realtime_subscription_insert_trigger` fires `AFTER INSERT` on `realtime.subscription`
- **Trigger Function:** `on_realtime_subscription_insert()`:
  1. Extracts symbol from `filters` JSONB
  2. Maps `entity` to `data_type`
  3. Calls `check_and_queue_stale_batch_v2()` immediately with high priority
  4. Job is created immediately (0 latency)

### Step 5: Job Creation (If Called)
- If `check_and_queue_stale_batch_v2()` were called (e.g., via RPC from frontend):
  1. **Exchange Status Check** (for quote data type):
     ```sql
     SELECT is_exchange_open_for_symbol_v2('AAPL', 'quote') INTO exchange_is_open;
     ```
     - Gets exchange code from `live_quote_indicators` or `profiles` table
     - Checks `exchange_market_status.is_market_open`
     - **If closed**: Skips queueing, returns early
     - **If open or unknown**: Continues to staleness check
  2. **Staleness Check**:
     ```sql
     SELECT is_data_stale_v2(fetched_at, 1) FROM live_quote_indicators WHERE symbol = 'AAPL';
     ```
     - Uses `is_data_stale_v2()` function with TTL from registry
     - For quotes: TTL = 1 minute
  3. **Job Creation** (if stale):
     ```sql
     INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
     VALUES ('AAPL', 'quote', 'pending', 1, 2000)
     ON CONFLICT DO NOTHING;
     ```

---

## Path 2: Background Staleness Checker (Every Minute)

### Step 1: Cron Job Triggers
- Cron job `check-stale-data-v2` runs every minute (`* * * * *`)
- Calls `check_and_queue_stale_data_from_presence_v2()`

### Step 2: Lock Acquisition
- Attempts to acquire advisory lock (prevents concurrent runs)
- If lock not acquired: Exits early (another instance is running)

### Step 3: Quota Check
- Checks if data quota is exceeded:
  ```sql
  IF is_quota_exceeded_v2() THEN
    RETURN; -- Exit early to prevent backlog buildup
  END IF;
  ```

### Step 4: Iterate Over Active Subscriptions
- Loops through distinct symbols from `active_subscriptions_v2`:
  ```sql
  FOR symbol_row IN
    SELECT DISTINCT symbol FROM active_subscriptions_v2
    LIMIT 1000 -- Prevents timeout
  LOOP
  ```

### Step 5: Iterate Over Data Types
- For each symbol, loops through data types from registry:
  ```sql
  FOR reg_row IN
    SELECT DISTINCT r.*
    FROM data_type_registry_v2 r
    INNER JOIN active_subscriptions_v2 asub
      ON asub.symbol = symbol_row.symbol
      AND asub.data_type = r.data_type
    WHERE r.refresh_strategy = 'on-demand'
  LOOP
  ```

### Step 6: Exchange Status Check (for quote data type)
- **CRITICAL:** Added in migration `20251118000000`
- Checks if exchange is open:
  ```sql
  IF reg_row.data_type = 'quote' THEN
    SELECT is_exchange_open_for_symbol_v2(symbol_row.symbol, 'quote') INTO exchange_is_open;
    IF NOT exchange_is_open THEN
      RAISE NOTICE 'Exchange is closed for symbol %. Skipping quote staleness check.', symbol_row.symbol;
      CONTINUE; -- Skip this data type, don't create job
    END IF;
  END IF;
  ```
- **Decision:**
  - ✅ **Exchange open or unknown**: Continue to staleness check
  - ❌ **Exchange closed**: Skip queueing, continue to next data type

### Step 7: Staleness Check
- Dynamically builds SQL to check staleness:
  ```sql
  SELECT is_data_stale_v2(t.fetched_at, 1440) FROM live_quote_indicators t WHERE t.symbol = 'AAPL';
  ```
- Uses:
  - `staleness_function` from registry (e.g., `is_data_stale_v2`)
  - `timestamp_column` from registry (e.g., `fetched_at`)
  - `default_ttl_minutes` from registry (e.g., `1` for quotes)

### Step 8: Job Creation (if stale)
- If data is stale (or doesn't exist):
  ```sql
  INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
  SELECT
    'AAPL' AS symbol,
    'quote' AS data_type,
    'pending' AS status,
    COUNT(DISTINCT asub.user_id)::INTEGER AS priority, -- Number of users viewing
    2000::BIGINT AS estimated_size
  FROM live_quote_indicators t
  JOIN active_subscriptions_v2 asub
    ON t.symbol = asub.symbol
    AND asub.data_type = 'quote'
  WHERE
    t.symbol = 'AAPL'
    AND is_data_stale_v2(t.fetched_at, 1) = true
    AND NOT EXISTS (
      SELECT 1 FROM api_call_queue_v2 q
      WHERE q.symbol = 'AAPL'
        AND q.data_type = 'quote'
        AND q.status IN ('pending', 'processing')
    )
  GROUP BY asub.symbol
  HAVING COUNT(DISTINCT asub.user_id) > 0
  ON CONFLICT DO NOTHING;
  ```
- **Priority** = Number of users viewing this symbol/data_type
- **Conflict check**: Prevents duplicate jobs

---

## Path 3: Processor (When Job is Processed)

### Step 1: Processor Invocation
- Cron job `invoke-processor-v2` runs every minute
- Calls `invoke_processor_loop_v2()` which invokes Edge Function `queue-processor-v2`

### Step 2: Job Selection
- Edge Function fetches batch of pending jobs:
  ```sql
  SELECT * FROM api_call_queue_v2_pending
  WHERE status = 'pending'
  ORDER BY priority DESC, created_at ASC
  LIMIT 10;
  ```

### Step 3: Exchange Status Check (Safety Net)
- **CRITICAL:** Even though staleness checker should have filtered closed exchanges, processor checks again:
  ```typescript
  // In fetch-fmp-quote.ts
  const { data: exchangeStatus } = await supabase
    .from('exchange_market_status')
    .select('is_market_open')
    .eq('exchange_code', exchangeCode)
    .single();

  if (exchangeStatus?.is_market_open === false) {
    return {
      success: false,
      error: `Exchange ${exchangeCode} is closed for symbol ${job.symbol}. Skipping quote fetch.`,
    };
  }
  ```
- **Why:** Exchange status might have changed between queueing and processing

### Step 4: Job Processing
- If exchange is open (or unknown):
  - Fetches data from FMP API
  - Upserts into database
  - Marks job as `completed`
- If exchange is closed:
  - Marks job as `failed` with error message
  - No API call is made

---

## Decision Tree Summary

### For Quote Data Type:

```
1. Is exchange open?
   ├─ NO → Skip queueing (no job created)
   └─ YES/UNKNOWN → Continue to step 2

2. Is data stale?
   ├─ NO → No job created
   └─ YES → Continue to step 3

3. Does job already exist?
   ├─ YES → No job created (ON CONFLICT DO NOTHING)
   └─ NO → Create job in queue
```

### For Other Data Types (profile, financial-statements, etc.):

```
1. Is data stale?
   ├─ NO → No job created
   └─ YES → Continue to step 2

2. Does job already exist?
   ├─ YES → No job created (ON CONFLICT DO NOTHING)
   └─ NO → Create job in queue
```

---

## Key Functions

### `is_exchange_open_for_symbol_v2(symbol, data_type)`
- **Purpose:** Check if exchange is open for a symbol
- **Returns:** `true` if open, `false` if closed, `true` if unknown (fail-safe)
- **Only applies to:** `quote` data type
- **Logic:**
  1. Get exchange code from `live_quote_indicators` or `profiles`
  2. Check `exchange_market_status.is_market_open`
  3. Return status (fail-safe to `true` if unknown)

### `check_and_queue_stale_batch_v2(symbol, data_types[], priority)`
- **Purpose:** User-facing staleness checker (called on card add)
- **Checks:** Exchange status (for quotes) + Staleness
- **Creates:** Jobs in queue if stale

### `check_and_queue_stale_data_from_presence_v2()`
- **Purpose:** Background staleness checker (runs every minute)
- **Checks:** Exchange status (for quotes) + Staleness
- **Creates:** Jobs in queue if stale
- **Uses:** `active_subscriptions_v2` table for performance

### `is_data_stale_v2(timestamp, ttl_minutes)`
- **Purpose:** Check if data is stale based on TTL
- **Returns:** `true` if stale, `false` if fresh
- **Logic:** `NOW() - timestamp > ttl_minutes`

---

## Timeline Example

**Scenario:** User opens Price Card for AAPL at 2:00 PM (market is open)

1. **2:00:00 PM** - Card mounts, `useTrackSubscription` called
2. **2:00:00 PM** - Subscription added to `active_subscriptions_v2`
3. **2:00:01 PM** - Background staleness checker runs (cron)
4. **2:00:01 PM** - Exchange status check: ✅ Open
5. **2:00:01 PM** - Staleness check: ✅ Stale (data older than 1 minute)
6. **2:00:01 PM** - Job created in `api_call_queue_v2_pending`
7. **2:00:02 PM** - Processor runs, fetches data, updates database
8. **2:01:00 PM** - Heartbeat sent (updates `last_seen_at`)
9. **2:01:01 PM** - Background staleness checker runs again
10. **2:01:01 PM** - Exchange status check: ✅ Open
11. **2:01:01 PM** - Staleness check: ❌ Fresh (data updated 1 minute ago)
12. **2:01:01 PM** - No job created

**Scenario:** User opens Price Card for AAPL at 10:00 PM (market is closed)

1. **10:00:00 PM** - Card mounts, `useTrackSubscription` called
2. **10:00:00 PM** - Subscription added to `active_subscriptions_v2`
3. **10:00:01 PM** - Background staleness checker runs (cron)
4. **10:00:01 PM** - Exchange status check: ❌ Closed
5. **10:00:01 PM** - **Job NOT created** (skipped due to closed exchange)
6. **10:01:00 PM** - Heartbeat sent
7. **10:01:01 PM** - Background staleness checker runs again
8. **10:01:01 PM** - Exchange status check: ❌ Closed
9. **10:01:01 PM** - **Job NOT created** (skipped due to closed exchange)

---

## Recent Fix (Migration 20251118000000)

**Problem:** Background staleness checker was creating jobs for quote data even when exchanges were closed.

**Solution:** Added exchange status check to `check_and_queue_stale_data_from_presence_v2()` to match the behavior of `check_and_queue_stale_batch_v2()`.

**Result:** Both paths now check exchange status before creating quote jobs, preventing unnecessary jobs that would just be skipped by the processor.

---

## Notes

- **Frontend does NOT call staleness checker directly** - it only tracks subscriptions
- **Background staleness checker is the primary job creator** - runs every minute
- **Exchange status check is a safety mechanism** - prevents creating jobs that will fail
- **Processor has a second check** - in case exchange status changes between queueing and processing
- **Fail-safe behavior** - if exchange status is unknown, we allow the fetch (better to try than skip)

