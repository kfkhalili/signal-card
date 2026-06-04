CREATE OR REPLACE FUNCTION public.invoke_processor_loop_v2(p_max_iterations integer DEFAULT 5, p_iteration_delay_seconds integer DEFAULT 12)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  iteration_count INTEGER := 0;
  jobs_processed INTEGER := 0;
BEGIN
  -- Loop up to max_iterations times
  WHILE iteration_count < p_max_iterations LOOP
    -- Invoke processor (which processes one batch and exits)
    PERFORM invoke_processor_if_healthy_v2();

    iteration_count := iteration_count + 1;

    -- Wait between iterations (allows other work to proceed)
    IF iteration_count < p_max_iterations THEN
      PERFORM pg_sleep(p_iteration_delay_seconds);
    END IF;
  END LOOP;

  -- ==========================================
  -- NEW: LOG SUCCESSFUL EXECUTION
  -- ==========================================
  INSERT INTO public.cron_health_logs (jobname, last_run) 
  VALUES ('invoke-processor-v2', NOW())
  ON CONFLICT (jobname) DO UPDATE SET last_run = EXCLUDED.last_run;

  RETURN iteration_count;
END;
$function$;