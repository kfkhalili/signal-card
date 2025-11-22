-- Migration: Update staleness checker to use realtime.subscription instead of active_subscriptions_v2

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
    -- MIGRATED: Now uses get_active_subscriptions_from_realtime() instead of active_subscriptions_v2
    FOR symbol_row IN
      SELECT DISTINCT symbol
      FROM get_active_subscriptions_from_realtime()
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

      -- Inner loop: Get data types for THIS symbol
      -- MIGRATED: Now uses get_active_subscriptions_from_realtime() instead of active_subscriptions_v2
      FOR reg_row IN
        SELECT DISTINCT r.*
        FROM public.data_type_registry_v2 r
        INNER JOIN get_active_subscriptions_from_realtime() asub
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

        -- CRITICAL: For quote data type, check if data exists first
        IF reg_row.data_type = 'quote' THEN
          sql_text := format(
            'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = %L)',
            reg_row.table_name,
            reg_row.symbol_column,
            symbol_row.symbol
          );
          EXECUTE sql_text INTO data_exists;

          IF data_exists THEN
            SELECT is_exchange_open_for_symbol_v2(symbol_row.symbol, 'quote') INTO exchange_is_open;
            IF NOT exchange_is_open THEN
              RAISE NOTICE 'Exchange is closed for symbol % and quote data exists. Skipping quote staleness check.', symbol_row.symbol;
              CONTINUE;
            END IF;
          ELSE
            RAISE NOTICE 'No quote data exists for symbol %. Creating job regardless of exchange status.', symbol_row.symbol;
          END IF;
        END IF;

        -- FAULT TOLERANCE: Wrap in exception handler
        BEGIN
          -- CRITICAL: Use CASE WHEN to set financial-statements to priority 500 (unless user_count >= 1000)
          -- MIGRATED: Now uses get_active_subscriptions_from_realtime() instead of active_subscriptions_v2
          sql_text := format(
            $SQL$
              INSERT INTO api_call_queue_v2 (symbol, data_type, status, priority, estimated_data_size_bytes)
              SELECT
                %L AS symbol,
                %L AS data_type,
                'pending' AS status,
                CASE
                  WHEN %L = 'financial-statements' AND COUNT(DISTINCT asub.user_id) < 1000 THEN 500
                  ELSE COUNT(DISTINCT asub.user_id)::INTEGER
                END AS priority,
                %L::BIGINT AS estimated_size
              FROM get_active_subscriptions_from_realtime() asub
              LEFT JOIN %I t
                ON t.%I = asub.symbol
              WHERE
                asub.symbol = %L
                AND asub.data_type = %L
                AND (
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
            symbol_row.symbol,
            reg_row.data_type,
            reg_row.data_type,
            reg_row.estimated_data_size_bytes,
            reg_row.table_name,
            reg_row.symbol_column,
            symbol_row.symbol,
            reg_row.data_type,
            reg_row.symbol_column,
            reg_row.staleness_function,
            reg_row.timestamp_column,
            reg_row.default_ttl_minutes,
            symbol_row.symbol,
            reg_row.data_type
          );

          EXECUTE sql_text;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Staleness check failed for symbol % and data type %: %',
              symbol_row.symbol, reg_row.data_type, SQLERRM;
            CONTINUE;
        END;
      END LOOP;
    END LOOP;

    RAISE NOTICE 'Staleness checker completed. Processed % symbols in % seconds.',
      symbols_processed, EXTRACT(EPOCH FROM (clock_timestamp() - start_time));

    PERFORM pg_advisory_unlock(42);

  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(42);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_and_queue_stale_data_from_presence_v2 IS 'Background staleness checker. Runs every minute. MIGRATED: Now uses get_active_subscriptions_from_realtime() instead of active_subscriptions_v2. Financial-statements jobs automatically get priority 500 (unless user_count >= 1000 indicating UI priority). Uses LEFT JOIN to handle missing data (treats missing as stale). Timeout-protected to complete within 50 seconds. For quote data type: always creates job if data missing (even if exchange closed), only checks exchange status if data exists. Quota-aware.';

