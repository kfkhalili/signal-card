-- Phase 3: Staleness System
-- Create scheduled refreshes function
-- CRITICAL: Throttled based on queue depth
-- CRITICAL: Uses TABLESAMPLE to prevent Day 365 performance failure
-- CRITICAL: Priority hardcoded to -1 (prevents priority inversion)
-- CRITICAL: Advisory lock prevents cron pile-ups

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
      RAISE NOTICE 'Queue depth (%%) exceeds threshold (%%). Skipping scheduled refreshes.',
        queue_depth, max_queue_depth;
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    -- CRITICAL: Use TABLESAMPLE to prevent Day 365 performance failure
    -- At scale (50k symbols * 5 types = 250k rows), full CROSS JOIN would be slow
    -- TABLESAMPLE SYSTEM (10) samples ~10% of symbols randomly
    INSERT INTO public.api_call_queue_v2 (
      symbol,
      data_type,
      status,
      priority,
      estimated_data_size_bytes
    )
    SELECT DISTINCT
      s.symbol,
      r.data_type,
      'pending' AS status,
      -1 AS priority, -- CRITICAL: Hardcoded low priority (prevents priority inversion)
      r.estimated_data_size_bytes
    FROM public.supported_symbols TABLESAMPLE SYSTEM (10) s
    CROSS JOIN public.data_type_registry_v2 r
    WHERE r.refresh_strategy = 'scheduled'
      AND NOT EXISTS (
        SELECT 1 FROM public.api_call_queue_v2 q
        WHERE q.symbol = s.symbol
          AND q.data_type = r.data_type
          AND q.status IN ('pending', 'processing')
      )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS queued_count = ROW_COUNT;

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

COMMENT ON FUNCTION public.queue_scheduled_refreshes_v2 IS 'Queues scheduled refreshes. Throttled by queue depth. Uses TABLESAMPLE for scale. Priority hardcoded to -1.';

