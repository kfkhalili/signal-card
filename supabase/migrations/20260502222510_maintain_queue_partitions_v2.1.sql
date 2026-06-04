CREATE OR REPLACE FUNCTION public.maintain_queue_partitions_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  SET LOCAL lock_timeout = '1s';
  BEGIN
    TRUNCATE TABLE public.api_call_queue_v2_completed;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  BEGIN
    TRUNCATE TABLE public.api_call_queue_v2_failed;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  -- ==========================================
  -- NEW: LOG SUCCESSFUL EXECUTION
  -- ==========================================
  INSERT INTO public.cron_health_logs (jobname, last_run) 
  VALUES ('maintain-queue-partitions-v2', NOW())
  ON CONFLICT (jobname) DO UPDATE SET last_run = EXCLUDED.last_run;
END;
$$;