CREATE OR REPLACE FUNCTION public.check_and_queue_stale_data_from_presence_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  reg_row RECORD;
  symbol_row RECORD;
  sql_text TEXT;
  lock_acquired BOOLEAN;
  start_time TIMESTAMPTZ := clock_timestamp();
  max_duration_seconds INTEGER := 50; 
  symbols_processed INTEGER := 0;
  max_symbols_per_run INTEGER := 1000; 
  exchange_is_open BOOLEAN;
  v_fetched_at TIMESTAMPTZ;
BEGIN
  SELECT pg_try_advisory_lock(42) INTO lock_acquired;
  IF NOT lock_acquired THEN
    RETURN;
  END IF;

  BEGIN
    IF is_quota_exceeded_v2() THEN
      PERFORM pg_advisory_unlock(42);
      RETURN;
    END IF;

    FOR symbol_row IN
      SELECT DISTINCT symbol
      FROM get_active_subscriptions_from_realtime()
      LIMIT max_symbols_per_run
    LOOP
      IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) > max_duration_seconds THEN
        PERFORM pg_advisory_unlock(42);
        RETURN;
      END IF;
      symbols_processed := symbols_processed + 1;

      FOR reg_row IN
        SELECT DISTINCT r.*
        FROM public.data_type_registry_v2 r
        INNER JOIN get_active_subscriptions_from_realtime() asub
          ON asub.symbol = symbol_row.symbol
          AND asub.data_type = r.data_type
        WHERE r.refresh_strategy = 'on-demand'
      LOOP
        IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) > max_duration_seconds THEN
          PERFORM pg_advisory_unlock(42);
          RETURN;
        END IF;

        IF NOT is_valid_identifier(reg_row.table_name) OR
           NOT is_valid_identifier(reg_row.symbol_column) OR
           NOT is_valid_identifier(reg_row.timestamp_column) OR
           NOT is_valid_identifier(reg_row.staleness_function)
        THEN
          CONTINUE;
        END IF;

        IF reg_row.data_type = 'quote' THEN
          sql_text := format(
            'SELECT fetched_at FROM %I WHERE %I = %L LIMIT 1',
            reg_row.table_name,
            reg_row.symbol_column,
            symbol_row.symbol
          );
          EXECUTE sql_text INTO v_fetched_at;

          IF v_fetched_at IS NOT NULL THEN
            SELECT is_exchange_open_for_symbol_v2(symbol_row.symbol, 'quote') INTO exchange_is_open;
            IF NOT exchange_is_open THEN
              IF EXTRACT(EPOCH FROM (clock_timestamp() - v_fetched_at)) > 86400 THEN
                -- Proceed
              ELSE
                CONTINUE; 
              END IF;
            END IF;
          END IF;
        END IF;

        BEGIN
          IF reg_row.data_type = 'exchange-variants' THEN
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
                LEFT JOIN LATERAL (
                  SELECT MAX(t.%I) AS max_timestamp
                  FROM %I t
                  WHERE t.%I = asub.symbol
                ) t_max ON true
                WHERE
                  asub.symbol = %L
                  AND asub.data_type = %L
                  AND (
                    t_max.max_timestamp IS NULL
                    OR %I(t_max.max_timestamp, %L::INTEGER) = true
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
              symbol_row.symbol, reg_row.data_type, reg_row.data_type, reg_row.estimated_data_size_bytes, 
              reg_row.timestamp_column, reg_row.table_name, reg_row.symbol_column, symbol_row.symbol, 
              reg_row.data_type, reg_row.staleness_function, reg_row.default_ttl_minutes, 
              symbol_row.symbol, reg_row.data_type
            );
          ELSE
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
              symbol_row.symbol, reg_row.data_type, reg_row.data_type, reg_row.estimated_data_size_bytes, 
              reg_row.table_name, reg_row.symbol_column, symbol_row.symbol, reg_row.data_type, 
              reg_row.symbol_column, reg_row.symbol_column, reg_row.staleness_function, 
              reg_row.timestamp_column, reg_row.default_ttl_minutes, symbol_row.symbol, reg_row.data_type
            );
          END IF;
          EXECUTE sql_text;
        EXCEPTION
          WHEN OTHERS THEN
            CONTINUE;
        END;
      END LOOP; 
    END LOOP; 

    -- ==========================================
    -- NEW: LOG SUCCESSFUL EXECUTION
    -- ==========================================
    INSERT INTO public.cron_health_logs (jobname, last_run) 
    VALUES ('check-stale-data-v2', NOW())
    ON CONFLICT (jobname) DO UPDATE SET last_run = EXCLUDED.last_run;

    PERFORM pg_advisory_unlock(42);
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(42);
      RAISE;
  END;
END;
$$;