-- Phase 2: Queue System
-- Create processor invoker function
-- CRITICAL: Circuit breaker pattern, recovery integration, advisory lock

-- Function to invoke processor with circuit breaker
-- CRITICAL: Checks for recent failures before invoking
-- CRITICAL: Runs recover_stuck_jobs as first action (proactive self-healing)
-- CRITICAL: Uses advisory lock to prevent cron pile-ups
CREATE OR REPLACE FUNCTION public.invoke_processor_if_healthy_v2()
RETURNS void AS $$
DECLARE
  recent_failures INTEGER;
  lock_acquired BOOLEAN;
  invocation_result TEXT;
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(44) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'invoke_processor_if_healthy_v2 is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
    -- CRITICAL: Proactive self-healing - recover stuck jobs FIRST
    -- This runs every minute (as part of processor invoker) instead of every 5 minutes
    PERFORM recover_stuck_jobs_v2();

    -- CRITICAL: Circuit breaker - check for recent failures
    -- Monitor retry_count > 0 (not just status = 'failed')
    -- This correctly trips on temporary API outages
    SELECT COUNT(*) INTO recent_failures
    FROM public.api_call_queue_v2
    WHERE retry_count > 0
      AND created_at >= NOW() - INTERVAL '10 minutes';

    -- If too many recent failures, trip circuit breaker
    IF recent_failures > 50 THEN
      RAISE EXCEPTION 'Circuit breaker tripped: % recent failures in last 10 minutes', recent_failures;
    END IF;

    -- Invoke processor Edge Function
    -- CRITICAL: Wrap in exception handler to prevent silent invoker failure
    -- CRITICAL: Use pg_net/http extension to invoke Edge Function via HTTP
    -- Alternative: Use Supabase client library if available in SQL context
    BEGIN
      -- TODO: Implement actual Edge Function invocation
      -- Option 1: Use pg_net/http extension (if available)
      -- SELECT * INTO invocation_result FROM http_post(
      --   url := current_setting('app.settings.supabase_url', true) || '/functions/v1/queue-processor-v2',
      --   headers := jsonb_build_object(
      --     'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true),
      --     'Content-Type', 'application/json'
      --   ),
      --   body := '{}'::jsonb,
      --   timeout_milliseconds := 10000
      -- );
      
      -- Option 2: Use Supabase client (if available in SQL context)
      -- PERFORM supabase.invoke_edge_function('queue-processor-v2');
      
      -- For now, log that invocation would happen
      RAISE NOTICE 'Processor invocation placeholder - Edge Function invocation to be implemented';
    EXCEPTION
      WHEN OTHERS THEN
        -- CRITICAL: Raise WARNING (not EXCEPTION) to alert via observability
        -- This prevents the cron job from failing silently
        RAISE WARNING 'Failed to invoke processor: %', SQLERRM;
    END;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'invoke_processor_if_healthy_v2 failed: %', SQLERRM;
  END;

  -- Always release lock
  PERFORM pg_advisory_unlock(44);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.invoke_processor_if_healthy_v2 IS 'Invokes processor with circuit breaker. Runs recover_stuck_jobs proactively. Uses advisory lock to prevent cron pile-ups.';

-- Function to loop processor invocations (SQL-side loop, not Edge Function loop)
-- CRITICAL: Loop is in SQL, Edge Function is stateless (processes one batch and exits)
CREATE OR REPLACE FUNCTION public.invoke_processor_loop_v2(
  p_max_iterations INTEGER DEFAULT 5,
  p_iteration_delay_seconds INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
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

  RETURN iteration_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless.';

