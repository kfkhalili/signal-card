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

COMMENT ON FUNCTION public.check_and_queue_stale_batch_v2 IS 'Event-driven staleness checker. Called on user subscribe. Uses SECURITY DEFINER to access data tables. Fail-safe to stale.';

