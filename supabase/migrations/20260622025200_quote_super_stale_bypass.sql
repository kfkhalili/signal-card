-- 1. Replace check_and_queue_stale_batch_v2 to add the super-stale bypass for closed markets
CREATE OR REPLACE FUNCTION public.check_and_queue_stale_batch_v2(
  p_symbol TEXT,
  p_data_types TEXT[],
  p_priority INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  reg_row RECORD;
  is_stale BOOLEAN;
  sql_text TEXT;
  exchange_is_open BOOLEAN;
  data_exists BOOLEAN;
BEGIN
  -- Loop through the input array
  FOR reg_row IN
    SELECT * FROM public.data_type_registry_v2
    WHERE data_type = ANY(p_data_types)
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
    IF reg_row.data_type = 'quote' THEN
      sql_text := format(
        'SELECT EXISTS(SELECT 1 FROM %I WHERE %I = %L)',
        reg_row.table_name,
        reg_row.symbol_column,
        p_symbol
      );
      EXECUTE sql_text INTO data_exists;

      IF data_exists THEN
        SELECT is_exchange_open_for_symbol_v2(p_symbol, 'quote') INTO exchange_is_open;
        IF NOT exchange_is_open THEN
          -- SUPER-STALE BYPASS:
          -- Even if the exchange is closed, if the quote is extremely stale (> 24 hours),
          -- we MUST fetch it to get the latest Friday close price.
          sql_text := format(
            'SELECT %I(t.%I, 1440) FROM %I t WHERE t.%I = %L',
            reg_row.staleness_function,
            reg_row.timestamp_column,
            reg_row.table_name,
            reg_row.symbol_column,
            p_symbol
          );
          EXECUTE sql_text INTO is_stale;

          IF NOT COALESCE(is_stale, true) THEN
            RAISE NOTICE 'Exchange is closed and quote is fresh (< 24h) for symbol %. Skipping.', p_symbol;
            CONTINUE; 
          END IF;
          
          RAISE NOTICE 'Exchange is closed but quote is > 24h old for symbol %. Bypassing market check.', p_symbol;
        END IF;
      ELSE
        RAISE NOTICE 'No quote data exists for symbol %. Creating job regardless of exchange status.', p_symbol;
      END IF;
    END IF;

    -- FAULT TOLERANCE: Wrap in exception handler so one bad data type doesn't break the batch
    BEGIN
      IF reg_row.data_type = 'exchange-variants' OR reg_row.data_type = 'insider-trading-statistics' OR reg_row.data_type = 'insider-transactions' OR reg_row.data_type = 'valuations' THEN
        sql_text := format(
          'SELECT %I(MAX(t.%I), %L::INTEGER) FROM %I t WHERE t.%I = %L',
          reg_row.staleness_function,
          reg_row.timestamp_column,
          reg_row.default_ttl_minutes,
          reg_row.table_name,
          reg_row.symbol_column,
          p_symbol
        );
      ELSE
        sql_text := format(
          'SELECT %I(t.%I, %L::INTEGER) FROM %I t WHERE t.%I = %L',
          reg_row.staleness_function,
          reg_row.timestamp_column,
          reg_row.default_ttl_minutes,
          reg_row.table_name,
          reg_row.symbol_column,
          p_symbol
        );
      END IF;

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
        RAISE WARNING 'Staleness check failed for symbol % and type %: %. Assuming stale.',
          p_symbol, reg_row.data_type, SQLERRM;
        is_stale := true;
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
$$;
