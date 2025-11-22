# Staleness Checker Job Creation Procedure

## Overview

The `check_and_queue_stale_data_from_presence_v2()` function runs every minute via a cron job and creates refresh jobs for stale data based on active subscriptions. This document walks through the complete procedure step-by-step.

---

## High-Level Flow

```
Cron Job (every 1 minute)
    ↓
check_and_queue_stale_data_from_presence_v2()
    ↓
1. Acquire Advisory Lock (prevent concurrent runs)
    ↓
2. Check Quota (prevent backlog buildup)
    ↓
3. Get Active Subscriptions (from realtime.subscription via get_active_subscriptions_from_realtime())
    ↓
4. For Each Symbol:
    ↓
    5. For Each Data Type (for that symbol):
        ↓
        6. Check if Data is Stale
        ↓
        7. If Stale AND No Pending Job → Create Job
```

---

## Step-by-Step Procedure

### Step 1: Function Invocation

**Trigger:** Cron job runs every 1 minute
```sql
-- From cron job configuration
SELECT cron.schedule(
  'check-stale-data-v2',
  '* * * * *',  -- Every minute
  $$SELECT check_and_queue_stale_data_from_presence_v2()$$
);
```

### Step 2: Advisory Lock Acquisition

**Purpose:** Prevent multiple concurrent runs (cron job pile-ups)

```sql
SELECT pg_try_advisory_lock(42) INTO lock_acquired;

IF NOT lock_acquired THEN
  RAISE NOTICE 'check_and_queue_stale_data_from_presence_v2 is already running. Exiting.';
  RETURN;
END IF;
```

**Why:** If the previous run is still executing (e.g., processing many symbols), skip this run to prevent:
- Database contention
- Duplicate job creation
- Resource exhaustion

### Step 3: Quota Check

**Purpose:** Prevent creating jobs when quota is exceeded (avoids backlog buildup)

```sql
IF is_quota_exceeded_v2() THEN
  RAISE NOTICE 'Data quota exceeded. Skipping staleness check to prevent backlog buildup.';
  PERFORM pg_advisory_unlock(42);
  RETURN;
END IF;
```

**Why:** If we're already at quota limit, don't create more jobs. They'll just sit in the queue and create a backlog.

### Step 4: Get Active Subscriptions

**Current Implementation (Using realtime.subscription):**
```sql
-- Outer loop: Get distinct symbols from realtime.subscription
FOR symbol_row IN
  SELECT DISTINCT symbol
  FROM get_active_subscriptions_from_realtime()
  LIMIT max_symbols_per_run  -- Default: 1000 symbols per run
LOOP
```

**What this does:**
- Gets all unique symbols that have active subscriptions
- Limits to 1000 symbols per run to ensure completion within timeout
- Each symbol represents a stock that users are actively viewing

**Example result:**
```
symbol
------
AAPL
MSFT
TSLA
ASAN
...
```

### Step 5: For Each Symbol - Get Data Types

**Purpose:** For each symbol, find which data types are subscribed

```sql
-- Inner loop: Get data types for THIS symbol
FOR reg_row IN
  SELECT DISTINCT r.*
  FROM public.data_type_registry_v2 r
  INNER JOIN get_active_subscriptions_from_realtime() asub
    ON asub.symbol = symbol_row.symbol
    AND asub.data_type = r.data_type
  WHERE r.refresh_strategy = 'on-demand'
LOOP
```

**What this does:**
- Joins `data_type_registry_v2` (metadata) with `get_active_subscriptions_from_realtime()` (active subscriptions)
- Filters to only `on-demand` data types (excludes scheduled refreshes)
- Gets registry metadata for each subscribed data type

**Example result for symbol "ASAN":**
```
data_type                  | table_name              | staleness_function
---------------------------|-------------------------|-------------------
profile                    | profiles                | is_profile_stale_v2
financial-statements       | financial_statements    | is_financial_statement_stale_v2
ratios-ttm                 | ratios_ttm              | is_ratios_ttm_stale_v2
dividend-history           | dividend_history        | is_dividend_history_stale_v2
...
```

### Step 6: Security Validation

**Purpose:** Prevent SQL injection via malicious registry entries

```sql
IF NOT is_valid_identifier(reg_row.table_name) OR
   NOT is_valid_identifier(reg_row.symbol_column) OR
   NOT is_valid_identifier(reg_row.timestamp_column) OR
   NOT is_valid_identifier(reg_row.staleness_function)
THEN
  RAISE WARNING 'Invalid identifier found in data_type_registry_v2: %. Skipping.', reg_row.data_type;
  CONTINUE;
END IF;
```

**Why:** The function uses dynamic SQL with `format()`. If registry contains malicious identifiers, this prevents SQL injection.

### Step 7: Special Handling for Quote Data Type

**Purpose:** Quote data should only refresh when exchange is open (unless data doesn't exist)

```sql
IF reg_row.data_type = 'quote' THEN
  -- Check if quote data exists for this symbol
  sql_text := format(
    'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = %L)',
    reg_row.table_name,        -- e.g., 'live_quote_indicators'
    reg_row.symbol_column,     -- e.g., 'symbol'
    symbol_row.symbol          -- e.g., 'ASAN'
  );
  EXECUTE sql_text INTO data_exists;

  IF data_exists THEN
    -- Data exists: only refresh if exchange is open
    SELECT is_exchange_open_for_symbol_v2(symbol_row.symbol, 'quote') INTO exchange_is_open;
    IF NOT exchange_is_open THEN
      RAISE NOTICE 'Exchange is closed for symbol % and quote data exists. Skipping quote staleness check.', symbol_row.symbol;
      CONTINUE; -- Skip this symbol/data_type combination
    END IF;
  ELSE
    -- Data doesn't exist: always create job (even if exchange closed)
    RAISE NOTICE 'No quote data exists for symbol %. Creating job regardless of exchange status.', symbol_row.symbol;
    -- Continue to create job (don't skip)
  END IF;
END IF;
```

**Logic:**
- **If quote data exists:** Only refresh if exchange is open (no point refreshing closed market data)
- **If quote data doesn't exist:** Always create job (need initial data, even if exchange is closed)

### Step 8: Check Staleness and Create Job

**Purpose:** Dynamically check if data is stale and create a job if needed

**The Dynamic SQL Query:**

```sql
sql_text := format(
  $SQL$
    INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
    SELECT
      %L AS symbol,                              -- e.g., 'ASAN'
      %L AS data_type,                           -- e.g., 'financial-statements'
      'pending' AS status,
      CASE
        WHEN %L = 'financial-statements' AND COUNT(DISTINCT asub.user_id) < 1000 THEN 500
        ELSE COUNT(DISTINCT asub.user_id)::INTEGER
      END AS priority,                           -- Priority = number of users subscribed
      %L::BIGINT AS estimated_size               -- From registry
    FROM get_active_subscriptions_from_realtime() asub
    LEFT JOIN %I t                               -- e.g., 'financial_statements' table
      ON t.%I = asub.symbol                       -- e.g., t.symbol = 'ASAN'
    WHERE
      asub.symbol = %L                            -- Filter to this symbol
      AND asub.data_type = %L                     -- Filter to this data type
      AND (
        -- Condition 1: Data doesn't exist (t.%I IS NULL)
        t.%I IS NULL
        OR
        -- Condition 2: Data exists but is stale
        %I(t.%I, %L::INTEGER) = true              -- e.g., is_financial_statement_stale_v2(t.fetched_at, 1440) = true
      )
      AND NOT EXISTS (
        -- Don't create duplicate jobs
        SELECT 1 FROM api_call_queue_v2 q
        WHERE q.symbol = %L
          AND q.data_type = %L
          AND q.status IN ('pending', 'processing')
      )
    GROUP BY asub.symbol
    HAVING COUNT(DISTINCT asub.user_id) > 0       -- Only if at least 1 user is subscribed
    ON CONFLICT DO NOTHING;                        -- Idempotent (if job already exists, skip)
  $SQL$,
  symbol_row.symbol,                    -- 1: %L symbol
  reg_row.data_type,                    -- 2: %L data_type
  reg_row.data_type,                    -- 3: %L (for CASE WHEN)
  reg_row.estimated_data_size_bytes,    -- 4: %L estimated_size
  reg_row.table_name,                   -- 5: %I table_name
  reg_row.symbol_column,                -- 6: %I symbol_column (ON clause)
  symbol_row.symbol,                    -- 7: %L asub.symbol
  reg_row.data_type,                    -- 8: %L asub.data_type
  reg_row.symbol_column,                -- 9: %I t.%I IS NULL
  reg_row.symbol_column,                -- 10: %I t.%I (staleness function)
  reg_row.staleness_function,           -- 11: %I staleness_function
  reg_row.timestamp_column,              -- 12: %I timestamp_column
  reg_row.default_ttl_minutes,          -- 13: %L default_ttl_minutes
  symbol_row.symbol,                     -- 14: %L q.symbol
  reg_row.data_type                      -- 15: %L q.data_type
);

EXECUTE sql_text;
```

**Breaking Down the Query:**

1. **LEFT JOIN:** Joins `active_subscriptions_v2` with the data table (e.g., `financial_statements`)
   - If data exists: `t.symbol` will have a value
   - If data doesn't exist: `t.symbol` will be NULL

2. **Staleness Condition:**
   ```sql
   AND (
     t.symbol IS NULL                    -- Data doesn't exist → treat as stale
     OR
     is_staleness_function(t.timestamp_column, default_ttl_minutes) = true  -- Data exists but is stale
   )
   ```

3. **Priority Calculation:**
   ```sql
   CASE
     WHEN data_type = 'financial-statements' AND COUNT(DISTINCT user_id) < 1000 THEN 500
     ELSE COUNT(DISTINCT user_id)::INTEGER
   END AS priority
   ```
   - **Financial-statements:** Gets priority 500 (unless 1000+ users = UI priority)
   - **Other data types:** Priority = number of users subscribed (more users = higher priority)

4. **Duplicate Prevention:**
   ```sql
   AND NOT EXISTS (
     SELECT 1 FROM api_call_queue_v2 q
     WHERE q.symbol = symbol
       AND q.data_type = data_type
       AND q.status IN ('pending', 'processing')
   )
   ```
   - Don't create a job if one already exists (pending or processing)

5. **User Count Check:**
   ```sql
   HAVING COUNT(DISTINCT user_id) > 0
   ```
   - Only create job if at least 1 user is subscribed

6. **Idempotency:**
   ```sql
   ON CONFLICT DO NOTHING
   ```
   - If job already exists (race condition), skip insertion

### Step 9: Error Handling

**Purpose:** Fault tolerance - one bad symbol/data_type doesn't break the entire run

```sql
BEGIN
  -- ... staleness check and job creation ...
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Staleness check failed for symbol % and data type %: %',
      symbol_row.symbol, reg_row.data_type, SQLERRM;
    CONTINUE;  -- Continue to next data type
END;
```

**Why:** If one symbol/data_type fails (e.g., table doesn't exist, invalid function), log the error and continue processing other symbols.

### Step 10: Timeout Protection

**Purpose:** Ensure function completes within 50 seconds (leaves 10-second buffer before next cron run)

```sql
-- Check timeout every symbol
IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) > max_duration_seconds THEN
  RAISE NOTICE 'Staleness checker timeout reached after % seconds. Processed % symbols. Exiting.',
    max_duration_seconds, symbols_processed;
  PERFORM pg_advisory_unlock(42);
  RETURN;
END IF;
```

**Why:** If processing takes too long, exit gracefully to prevent blocking the next cron run.

### Step 11: Release Lock

**Purpose:** Always release the advisory lock, even on error

```sql
-- On success
PERFORM pg_advisory_unlock(42);

-- On error
EXCEPTION
  WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(42);  -- Always release lock
    RAISE;
END;
```

**Why:** If lock isn't released, subsequent runs will be blocked forever.

---

## Example Walkthrough

Let's trace through a concrete example:

### Scenario:
- User is viewing ASAN stock
- Subscribed to: `profile`, `financial-statements`, `ratios-ttm`
- `financial-statements` data is stale (last fetched 2 days ago, TTL is 1 day)

### Step-by-Step Execution:

1. **Cron triggers function** at 10:00:00
2. **Advisory lock acquired** ✅
3. **Quota check passed** ✅
4. **Get symbols:** `['ASAN', 'AAPL', 'MSFT', ...]` (1000 symbols)
5. **Process symbol "ASAN":**
   - **Data type "profile":**
     - Check staleness: `is_profile_stale_v2(profiles.modified_at, 1440)` → `false` (fresh)
     - **No job created** (data is fresh)

   - **Data type "financial-statements":**
     - Check staleness: `is_financial_statement_stale_v2(financial_statements.fetched_at, 1440)` → `true` (stale)
     - Check for existing job: None found
     - Count users: 1 user subscribed
     - Priority: 500 (financial-statements with < 1000 users)
     - **Job created:**
       ```sql
       INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
       VALUES ('ASAN', 'financial-statements', 'pending', 500, 50000);
       ```

   - **Data type "ratios-ttm":**
     - Check staleness: `is_ratios_ttm_stale_v2(ratios_ttm.fetched_at, 1440)` → `false` (fresh)
     - **No job created** (data is fresh)

6. **Continue to next symbol** (AAPL, MSFT, etc.)
7. **After processing 1000 symbols or 50 seconds:** Exit
8. **Release advisory lock** ✅

---

## Key Design Decisions

### 1. Symbol-by-Symbol Processing

**Why:** Instead of one giant JOIN query, process symbols one at a time.

**Benefits:**
- ✅ Small, fast, indexed queries
- ✅ Prevents "thundering herd" (giant temp tables)
- ✅ Better timeout control (can exit mid-run)
- ✅ Easier to debug (can see which symbol failed)

### 2. LEFT JOIN for Missing Data

**Why:** Use `LEFT JOIN` instead of `INNER JOIN`.

**Benefits:**
- ✅ Treats missing data as stale (creates job for initial fetch)
- ✅ Handles new symbols gracefully
- ✅ No need for separate "data exists" check

### 3. Priority Based on User Count

**Why:** Priority = number of users subscribed.

**Benefits:**
- ✅ Popular symbols get refreshed first
- ✅ UI-initiated subscriptions (1000+ users) get highest priority
- ✅ Background refreshes get lower priority

### 4. Financial-Statements Special Priority

**Why:** Financial-statements get priority 500 (unless UI priority).

**Benefits:**
- ✅ Financial-statements are large and important
- ✅ Get processed before other background jobs
- ✅ But don't block UI jobs (priority 1000)

### 5. Duplicate Prevention

**Why:** Check for existing jobs before creating new ones.

**Benefits:**
- ✅ Prevents duplicate jobs in queue
- ✅ Handles race conditions (multiple cron runs)
- ✅ Idempotent (safe to run multiple times)

---

## Current Implementation Using `realtime.subscription`

**Subscription Source:**
```sql
FROM get_active_subscriptions_from_realtime() asub
```

**Key Features:**
- ✅ Same staleness checking logic
- ✅ Same job creation logic
- ✅ Same priority calculation
- ✅ Same error handling
- ✅ No client-side registration needed
- ✅ No heartbeat needed
- ✅ Automatic cleanup (subscriptions auto-remove on disconnect)
- ✅ Single source of truth

---

## Performance Characteristics

**Typical Run:**
- **Symbols processed:** 100-1000 (depending on active users)
- **Data types per symbol:** 1-8 (average 3-4)
- **Total checks:** 300-4000 staleness checks per run
- **Execution time:** 5-30 seconds (depending on load)
- **Jobs created:** 10-100 jobs per run (only stale data)

**Optimizations:**
- ✅ Symbol-by-symbol processing (small queries)
- ✅ Indexed lookups (symbol, data_type)
- ✅ Timeout protection (never blocks next run)
- ✅ Quota check (prevents backlog)

---

## Monitoring & Debugging

**Check function execution:**
```sql
-- See recent runs
SELECT * FROM pg_stat_activity
WHERE query LIKE '%check_and_queue_stale_data_from_presence_v2%';
```

**Check created jobs:**
```sql
-- See jobs created in last hour
SELECT symbol, data_type, status, priority, created_at
FROM api_call_queue_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Check subscription counts:**
```sql
-- Current implementation
SELECT COUNT(*) FROM get_active_subscriptions_from_realtime();
```

