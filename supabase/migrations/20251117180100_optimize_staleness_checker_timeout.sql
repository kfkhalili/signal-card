-- Optimize staleness checker to complete within 1 minute
-- CRITICAL: Add timeout and early exit to prevent blocking next cron run
-- CRITICAL: Process symbols in batches to ensure timely completion

CREATE OR REPLACE FUNCTION public.check_and_queue_stale_data_from_presence_v2()
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  symbol_row RECORD;
  sql_text TEXT;
  lock_acquired BOOLEAN;
  start_time TIMESTAMPTZ := clock_timestamp();
  max_duration_seconds INTEGER := 50; -- Complete within 50 seconds to leave buffer
  symbols_processed INTEGER := 0;
  max_symbols_per_run INTEGER := 1000; -- Limit symbols per run to ensure completion
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
    -- CRITICAL: Added LIMIT to prevent long-running queries
    FOR symbol_row IN
      SELECT DISTINCT symbol
      FROM public.active_subscriptions_v2
      LIMIT max_symbols_per_run
    LOOP
      -- CRITICAL: Check timeout every symbol to prevent blocking next cron run
      IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) > max_duration_seconds THEN
        RAISE NOTICE 'Staleness checker timeout reached after % seconds. Processed % symbols. Exiting.',
          max_duration_seconds, symbols_processed;
        PERFORM pg_advisory_unlock(42);
        RETURN;
      END IF;

      symbols_processed := symbols_processed + 1;

      -- Inner loop: Get data types for THIS symbol (typically 1-5 types per symbol)
      FOR reg_row IN
        SELECT DISTINCT r.*
        FROM public.data_type_registry_v2 r
        INNER JOIN public.active_subscriptions_v2 asub
          ON asub.symbol = symbol_row.symbol
          AND asub.data_type = r.data_type
        WHERE r.refresh_strategy = 'on-demand'
      LOOP
        -- CRITICAL: Check timeout every data type as well
        IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) > max_duration_seconds THEN
          RAISE NOTICE 'Staleness checker timeout reached after % seconds. Processed % symbols. Exiting.',
            max_duration_seconds, symbols_processed;
          PERFORM pg_advisory_unlock(42);
          RETURN;
        END IF;

        -- SECURITY: Validate identifiers before use (defense in depth)
        IF NOT is_valid_identifier(reg_row.table_name) OR
           NOT is_valid_identifier(reg_row.symbol_column) OR
           NOT is_valid_identifier(reg_row.timestamp_column) OR
           NOT is_valid_identifier(reg_row.staleness_function)
        THEN
          RAISE WARNING 'Invalid identifier found in data_type_registry_v2: %. Skipping.', reg_row.data_type;
          CONTINUE;
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

    RAISE NOTICE 'Staleness checker completed. Processed % symbols in % seconds.',
      symbols_processed, EXTRACT(EPOCH FROM (clock_timestamp() - start_time));

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

COMMENT ON FUNCTION public.check_and_queue_stale_data_from_presence_v2 IS 'Background staleness checker. Runs every minute. Uses Symbol-by-Symbol pattern for scalability. Quota-aware. Timeout-protected to complete within 50 seconds.';

