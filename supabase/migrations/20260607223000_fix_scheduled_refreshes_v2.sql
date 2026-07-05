-- Fix scheduled refreshes to use listed_symbols and enforce TTL
-- Replaces supported_symbols (which only has 56 core symbols) with listed_symbols (~18k)
-- Limits processing to 15 random symbols per minute to cycle through evenly

CREATE OR REPLACE FUNCTION public.queue_scheduled_refreshes_v2()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  queue_depth INTEGER;
  max_queue_depth INTEGER := 1000;
  lock_acquired BOOLEAN;
  queued_count INTEGER := 0;
  v_symbol TEXT;
  v_scheduled_types TEXT[];
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(43) INTO lock_acquired;
  IF NOT lock_acquired THEN
    RAISE NOTICE 'queue_scheduled_refreshes_v2 is already running. Exiting.';
    RETURN 0;
  END IF;

  BEGIN
    -- CRITICAL: Check quota BEFORE doing any work
    IF is_quota_exceeded_v2() THEN
      RAISE NOTICE 'Data quota exceeded. Skipping scheduled refreshes to prevent backlog buildup.';
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    -- CRITICAL: Throttling - check queue depth before adding more
    SELECT COUNT(*) INTO queue_depth
    FROM public.api_call_queue_v2
    WHERE status = 'pending';

    IF queue_depth >= max_queue_depth THEN
      RAISE NOTICE 'Queue depth (%) exceeds threshold (%). Skipping scheduled refreshes.',
        queue_depth, max_queue_depth;
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    -- Get array of scheduled data types
    SELECT array_agg(data_type) INTO v_scheduled_types
    FROM public.data_type_registry_v2
    WHERE refresh_strategy = 'scheduled';
    
    -- If nothing is scheduled, exit early
    IF v_scheduled_types IS NULL OR array_length(v_scheduled_types, 1) = 0 THEN
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    -- CRITICAL: Sample from listed_symbols (universe of 18k active symbols)
    -- Process 15 active symbols per minute using Round-Robin (oldest processed first).
    -- This guarantees every symbol is checked exactly once every ~20 hours, 
    -- eliminating the "outlier" problem of random sampling.
    FOR v_symbol IN 
      SELECT symbol FROM public.listed_symbols 
      WHERE is_active = TRUE 
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 15
    LOOP
      PERFORM public.check_and_queue_stale_batch_v2(
        p_symbol := v_symbol, 
        p_data_types := v_scheduled_types, 
        p_priority := -1 -- Background priority
      );
      
      -- Update last_processed_at so it goes to the back of the line
      UPDATE public.listed_symbols 
      SET last_processed_at = NOW() 
      WHERE symbol = v_symbol;
      
      queued_count := queued_count + 1; -- approximate count of symbols checked
    END LOOP;

    -- Release the advisory lock
    PERFORM pg_advisory_unlock(43);

    RETURN queued_count;

  EXCEPTION
    WHEN OTHERS THEN
      -- Always release the lock
      PERFORM pg_advisory_unlock(43);
      RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION public.queue_scheduled_refreshes_v2 IS 'Queues scheduled refreshes by randomly sampling 15 active symbols from listed_symbols per minute and checking their TTL using check_and_queue_stale_batch_v2. Throttled by queue depth. Priority hardcoded to -1.';
