-- Phase 3: Staleness System
-- Create event-driven staleness check function
-- CRITICAL: SECURITY DEFINER required - called by authenticated users but needs admin permissions
-- CRITICAL: Fault tolerance - one bad data type doesn't break the batch
-- CRITICAL: Fail-safe to stale - failed checks assume stale and queue refresh

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
      -- CRITICAL: For exchange-variants (and other tables with multiple records per symbol),
      -- use MAX(timestamp_column) to get the most recent fetch time
      -- This ensures sentinel records work correctly
      IF reg_row.data_type = 'exchange-variants' THEN
        -- Use MAX to get the most recent fetched_at across all variants for this symbol
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
        -- For other data types, use the standard query (assumes one record per symbol)
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

COMMENT ON FUNCTION public.check_and_queue_stale_batch_v2 IS 'Event-driven staleness checker. Called by trigger on subscription creation and can be called directly. For exchange-variants, uses MAX(fetched_at) to handle multiple records per symbol. Uses SECURITY DEFINER to access data tables. Fail-safe to stale. For quote data type: always creates job if data missing (even if exchange closed), only checks exchange status if data exists.';

