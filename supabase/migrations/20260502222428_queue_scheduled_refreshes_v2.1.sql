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
  SELECT pg_try_advisory_lock(43) INTO lock_acquired;
  IF NOT lock_acquired THEN
    RETURN 0;
  END IF;

  BEGIN
    IF is_quota_exceeded_v2() THEN
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    SELECT COUNT(*) INTO queue_depth
    FROM public.api_call_queue_v2
    WHERE status = 'pending';

    IF queue_depth >= max_queue_depth THEN
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    INSERT INTO public.api_call_queue_v2 (
      symbol, data_type, status, priority, estimated_data_size_bytes
    )
    SELECT DISTINCT
      s.symbol, r.data_type, 'pending' AS status, -1 AS priority, r.estimated_data_size_bytes
    FROM public.supported_symbols s TABLESAMPLE SYSTEM (10)
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

    -- ==========================================
    -- NEW: LOG SUCCESSFUL EXECUTION
    -- ==========================================
    INSERT INTO public.cron_health_logs (jobname, last_run) 
    VALUES ('queue-scheduled-refreshes-v2', NOW())
    ON CONFLICT (jobname) DO UPDATE SET last_run = EXCLUDED.last_run;

    PERFORM pg_advisory_unlock(43);
    RETURN queued_count;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(43);
      RAISE;
  END;
END;
$$;