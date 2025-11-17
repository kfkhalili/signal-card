-- Phase 5: Migration (One Type)
-- Add exchange status check for quote data type
-- CRITICAL: Prevents queueing/fetching quotes when exchange is closed
-- This eliminates failures when markets are closed (e.g., weekends, holidays, after hours)

-- Helper function to check if exchange is open for a symbol
-- Returns true if exchange is open, false if closed, NULL if exchange status unknown
CREATE OR REPLACE FUNCTION public.is_exchange_open_for_symbol_v2(
  p_symbol TEXT,
  p_data_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exchange_code TEXT;
  v_is_market_open BOOLEAN;
BEGIN
  -- Only check exchange status for quote data type
  -- Other data types (profile, financial-statements, etc.) don't depend on market hours
  IF p_data_type != 'quote' THEN
    RETURN true; -- Not a quote, assume "open" (no restriction)
  END IF;

  -- Get exchange code from live_quote_indicators (preferred) or profiles (fallback)
  SELECT exchange INTO v_exchange_code
  FROM public.live_quote_indicators
  WHERE symbol = p_symbol
  LIMIT 1;

  -- If not found in live_quote_indicators, try profiles table
  IF v_exchange_code IS NULL THEN
    SELECT exchange INTO v_exchange_code
    FROM public.profiles
    WHERE symbol = p_symbol
    LIMIT 1;
  END IF;

  -- If exchange code is still unknown, we can't check status
  -- Return true to allow the fetch (fail-safe: better to try than skip)
  IF v_exchange_code IS NULL THEN
    RAISE NOTICE 'Exchange code unknown for symbol %. Allowing fetch (fail-safe).', p_symbol;
    RETURN true;
  END IF;

  -- Check if exchange is open
  SELECT is_market_open INTO v_is_market_open
  FROM public.exchange_market_status
  WHERE exchange_code = v_exchange_code;

  -- If exchange status is unknown, return true (fail-safe)
  IF v_is_market_open IS NULL THEN
    RAISE NOTICE 'Exchange status unknown for exchange % (symbol %). Allowing fetch (fail-safe).', v_exchange_code, p_symbol;
    RETURN true;
  END IF;

  -- Return the market status
  RETURN v_is_market_open;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_exchange_open_for_symbol_v2 IS 'Checks if exchange is open for a symbol. Returns true if open, false if closed, true if unknown (fail-safe). Only applies to quote data type.';

-- Update background staleness checker to check exchange status for quotes
CREATE OR REPLACE FUNCTION public.check_and_queue_stale_data_from_presence_v2()
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  symbol_row RECORD;
  sql_text TEXT;
  lock_acquired BOOLEAN;
  exchange_is_open BOOLEAN;
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(42) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'check_and_queue_stale_data_from_presence_v2 is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
    -- CRITICAL: Check quota BEFORE doing any work (prevents quota rebound catastrophe)
    IF is_quota_exceeded_v2() THEN
      RAISE NOTICE 'Data quota exceeded. Skipping staleness check to prevent backlog buildup.';
      PERFORM pg_advisory_unlock(42);
      RETURN;
    END IF;

    -- CRITICAL: Symbol-by-Symbol query pattern (prevents temp table thundering herd)
    -- Outer loop: Iterate over distinct symbols from active_subscriptions (typically 1k-10k, not 300k)
    -- This creates tiny, fast, indexed queries instead of giant JOINs
    FOR symbol_row IN
      SELECT DISTINCT symbol FROM public.active_subscriptions_v2
    LOOP
      -- Inner loop: Get data types for THIS symbol (typically 1-5 types per symbol)
      FOR reg_row IN
        SELECT DISTINCT r.*
        FROM public.data_type_registry_v2 r
        INNER JOIN public.active_subscriptions_v2 asub
          ON asub.symbol = symbol_row.symbol
          AND asub.data_type = r.data_type
        WHERE r.refresh_strategy = 'on-demand'
      LOOP
        -- SECURITY: Validate identifiers before use (defense in depth)
        IF NOT is_valid_identifier(reg_row.table_name) OR
           NOT is_valid_identifier(reg_row.symbol_column) OR
           NOT is_valid_identifier(reg_row.timestamp_column) OR
           NOT is_valid_identifier(reg_row.staleness_function)
        THEN
          RAISE WARNING 'Invalid identifier found in data_type_registry_v2: %. Skipping.', reg_row.data_type;
          CONTINUE;
        END IF;

        -- CRITICAL: Check exchange status for quote data type
        -- Skip queueing if exchange is closed (prevents unnecessary API calls and failures)
        IF reg_row.data_type = 'quote' THEN
          SELECT is_exchange_open_for_symbol_v2(symbol_row.symbol, 'quote') INTO exchange_is_open;
          IF NOT exchange_is_open THEN
            RAISE NOTICE 'Exchange is closed for symbol %. Skipping quote staleness check.', symbol_row.symbol;
            CONTINUE; -- Skip this symbol/data_type combination
          END IF;
        END IF;

        -- FAULT TOLERANCE: Wrap in exception handler so one bad symbol/data_type doesn't break the cron job
        BEGIN
          -- Build dynamic SQL for THIS symbol and data type (100% generic, no hardcoding)
          sql_text := format(
            $SQL$
              INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
              SELECT
                %L AS symbol,
                %L AS data_type,
                'pending' AS status,
                COUNT(DISTINCT asub.user_id)::INTEGER AS priority,
                %L::BIGINT AS estimated_size
              FROM %I t
              JOIN active_subscriptions_v2 asub
                ON t.%I = asub.symbol
                AND asub.data_type = %L
              WHERE
                t.%I = %L
                AND asub.symbol = %L
                AND %I(t.%I, %L::INTEGER) = true
                AND NOT EXISTS (
                  SELECT 1 FROM api_call_queue_v2 q
                  WHERE q.symbol = %L
                    AND q.data_type = %L
                    AND q.status IN ('pending', 'processing')
                )
              GROUP BY asub.symbol
              HAVING COUNT(DISTINCT asub.user_id) > 0
              ON CONFLICT DO NOTHING;
            $SQL$,
            symbol_row.symbol,
            reg_row.data_type,
            reg_row.estimated_data_size_bytes,
            reg_row.table_name,
            reg_row.symbol_column,
            reg_row.data_type,
            reg_row.symbol_column,
            symbol_row.symbol,
            symbol_row.symbol,
            reg_row.staleness_function,
            reg_row.timestamp_column,
            reg_row.default_ttl_minutes,
            symbol_row.symbol,
            reg_row.data_type
          );

          EXECUTE sql_text;
        EXCEPTION
          WHEN OTHERS THEN
            -- Log the error and continue the loop (fault tolerance)
            RAISE WARNING 'Staleness check failed for symbol % and data type %: %',
              symbol_row.symbol, reg_row.data_type, SQLERRM;
            CONTINUE;
        END;
      END LOOP; -- Inner loop: data types for this symbol
    END LOOP; -- Outer loop: symbols

    -- Release the advisory lock on successful completion
    PERFORM pg_advisory_unlock(42);

  EXCEPTION
    WHEN OTHERS THEN
      -- CRITICAL: Always release the lock, even if function fails
      PERFORM pg_advisory_unlock(42);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_and_queue_stale_data_from_presence_v2 IS 'Background staleness checker. Runs every minute. Uses Symbol-by-Symbol pattern for scalability. Quota-aware. Checks exchange status for quotes.';

-- Update batch staleness checker to check exchange status for quotes
CREATE OR REPLACE FUNCTION public.check_and_queue_stale_batch_v2(
  p_symbol TEXT,
  p_data_types TEXT[],
  p_priority INTEGER
)
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  is_stale BOOLEAN;
  sql_text TEXT;
  exchange_is_open BOOLEAN;
BEGIN
  -- Loop through the input array (max 5-10 items, very fast)
  FOR reg_row IN
    SELECT * FROM public.data_type_registry_v2
    WHERE data_type = ANY(p_data_types)
      AND refresh_strategy = 'on-demand'
  LOOP
    -- SECURITY: Validate identifiers before use (defense in depth)
    IF NOT is_valid_identifier(reg_row.table_name) OR
       NOT is_valid_identifier(reg_row.symbol_column) OR
       NOT is_valid_identifier(reg_row.timestamp_column) OR
       NOT is_valid_identifier(reg_row.staleness_function)
    THEN
      RAISE EXCEPTION 'Invalid identifier found in data_type_registry_v2: %', reg_row.data_type;
    END IF;

    -- CRITICAL: Check exchange status for quote data type
    -- Skip queueing if exchange is closed (prevents unnecessary API calls and failures)
    IF reg_row.data_type = 'quote' THEN
      SELECT is_exchange_open_for_symbol_v2(p_symbol, 'quote') INTO exchange_is_open;
      IF NOT exchange_is_open THEN
        RAISE NOTICE 'Exchange is closed for symbol %. Skipping quote staleness check.', p_symbol;
        CONTINUE; -- Skip this data type
      END IF;
    END IF;

    -- FAULT TOLERANCE: Wrap in exception handler so one bad data type doesn't break the batch
    BEGIN
      -- Dynamically check staleness for this symbol
      sql_text := format(
        'SELECT %I(t.%I, %L::INTEGER) FROM %I t WHERE t.%I = %L',
        reg_row.staleness_function,
        reg_row.timestamp_column,
        reg_row.default_ttl_minutes,
        reg_row.table_name,
        reg_row.symbol_column,
        p_symbol
      );

      EXECUTE sql_text INTO is_stale;

      -- Queue if stale (or if data doesn't exist - treat as stale)
      IF COALESCE(is_stale, true) THEN
        PERFORM queue_refresh_if_not_exists_v2(
          p_symbol,
          reg_row.data_type,
          p_priority,
          reg_row.estimated_data_size_bytes
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and continue processing other data types
        -- This prevents one bad registry entry from breaking the entire subscription
        RAISE WARNING 'Staleness check failed for symbol % and type %: %. Assuming stale.',
          p_symbol, reg_row.data_type, SQLERRM;
        -- FAIL-SAFE TO STALE: If we can't check, assume stale and queue refresh
        -- This ensures users get their data even if registry has errors
        is_stale := true;
        -- Queue the refresh
        PERFORM queue_refresh_if_not_exists_v2(
          p_symbol,
          reg_row.data_type,
          p_priority,
          reg_row.estimated_data_size_bytes
        );
        CONTINUE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_and_queue_stale_batch_v2 IS 'Event-driven staleness checker. Called on user subscribe. Uses SECURITY DEFINER to access data tables. Fail-safe to stale. Checks exchange status for quotes.';

