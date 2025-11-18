-- Fix exchange status check to allow job creation for missing quote data
-- CRITICAL: If no quote data exists, always create a job (even if exchange is closed)
-- Only check exchange status when data exists but is stale

CREATE OR REPLACE FUNCTION public.check_and_queue_stale_data_from_presence_v2()
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  symbol_row RECORD;
  sql_text TEXT;
  lock_acquired BOOLEAN;
  exchange_is_open BOOLEAN;
  data_exists BOOLEAN;
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

        -- CRITICAL: For quote data type, check if data exists first
        -- If data doesn't exist, always create a job (even if exchange is closed)
        -- If data exists, check exchange status before creating a job
        IF reg_row.data_type = 'quote' THEN
          -- Check if quote data exists for this symbol
          sql_text := format(
            'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = %L)',
            reg_row.table_name,
            reg_row.symbol_column,
            symbol_row.symbol
          );
          EXECUTE sql_text INTO data_exists;

          -- If data exists, check exchange status
          -- If data doesn't exist, skip exchange status check (always create job)
          IF data_exists THEN
            SELECT is_exchange_open_for_symbol_v2(symbol_row.symbol, 'quote') INTO exchange_is_open;
            IF NOT exchange_is_open THEN
              RAISE NOTICE 'Exchange is closed for symbol % and quote data exists. Skipping quote staleness check.', symbol_row.symbol;
              CONTINUE; -- Skip this symbol/data_type combination
            END IF;
          ELSE
            RAISE NOTICE 'No quote data exists for symbol %. Creating job regardless of exchange status.', symbol_row.symbol;
            -- Continue to create job (don't skip)
          END IF;
        END IF;

        -- FAULT TOLERANCE: Wrap in exception handler so one bad symbol/data_type doesn't break the cron job
        BEGIN
          -- Build dynamic SQL for THIS symbol and data type (100% generic, no hardcoding)
          -- CRITICAL: Use LEFT JOIN to handle missing data (treat missing as stale)
          sql_text := format(
            $SQL$
              INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
              SELECT
                %L AS symbol,
                %L AS data_type,
                'pending' AS status,
                COUNT(DISTINCT asub.user_id)::INTEGER AS priority,
                %L::BIGINT AS estimated_size
              FROM active_subscriptions_v2 asub
              LEFT JOIN %I t
                ON t.%I = asub.symbol
              WHERE
                asub.symbol = %L
                AND asub.data_type = %L
                AND (
                  -- Data doesn't exist (t.%I IS NULL) OR data is stale
                  t.%I IS NULL
                  OR %I(t.%I, %L::INTEGER) = true
                )
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
            symbol_row.symbol,                    -- 1: %L symbol
            reg_row.data_type,                    -- 2: %L data_type
            reg_row.estimated_data_size_bytes,    -- 3: %L estimated_size
            reg_row.table_name,                   -- 4: %I table_name
            reg_row.symbol_column,                -- 5: %I symbol_column (ON clause)
            symbol_row.symbol,                    -- 6: %L asub.symbol
            reg_row.data_type,                    -- 7: %L asub.data_type
            reg_row.symbol_column,                -- 8: %I t.%I IS NULL
            reg_row.symbol_column,                -- 9: %I t.%I (staleness function)
            reg_row.staleness_function,           -- 10: %I staleness_function
            reg_row.timestamp_column,             -- 11: %I timestamp_column
            reg_row.default_ttl_minutes,          -- 12: %L default_ttl_minutes
            symbol_row.symbol,                    -- 13: %L q.symbol
            reg_row.data_type                     -- 14: %L q.data_type
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

COMMENT ON FUNCTION public.check_and_queue_stale_data_from_presence_v2 IS 'Background staleness checker. Runs every minute. Uses LEFT JOIN to handle missing data (treats missing as stale). For quote data type: always creates job if data missing (even if exchange closed), only checks exchange status if data exists. Quota-aware.';

-- Also update batch staleness checker with the same logic
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
  data_exists BOOLEAN;
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

    -- CRITICAL: For quote data type, check if data exists first
    -- If data doesn't exist, always create a job (even if exchange is closed)
    -- If data exists, check exchange status before creating a job
    IF reg_row.data_type = 'quote' THEN
      -- Check if quote data exists for this symbol
      sql_text := format(
        'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = %L)',
        reg_row.table_name,
        reg_row.symbol_column,
        p_symbol
      );
      EXECUTE sql_text INTO data_exists;

      -- If data exists, check exchange status
      -- If data doesn't exist, skip exchange status check (always create job)
      IF data_exists THEN
        SELECT is_exchange_open_for_symbol_v2(p_symbol, 'quote') INTO exchange_is_open;
        IF NOT exchange_is_open THEN
          RAISE NOTICE 'Exchange is closed for symbol % and quote data exists. Skipping quote staleness check.', p_symbol;
          CONTINUE; -- Skip this data type
        END IF;
      ELSE
        RAISE NOTICE 'No quote data exists for symbol %. Creating job regardless of exchange status.', p_symbol;
        -- Continue to create job (don't skip)
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

COMMENT ON FUNCTION public.check_and_queue_stale_batch_v2 IS 'Event-driven staleness checker. Called on user subscribe. Uses SECURITY DEFINER to access data tables. Fail-safe to stale. For quote data type: always creates job if data missing (even if exchange closed), only checks exchange status if data exists.';

