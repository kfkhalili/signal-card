-- Phase 3: Staleness System
-- Create Edge Function invoker helper (for use in SQL cron jobs)
-- CRITICAL: This function invokes Edge Functions from SQL context
-- Uses pg_net extension to make HTTP calls to Supabase Edge Functions

-- Function to invoke an Edge Function from SQL
-- CRITICAL: Requires pg_net extension to be enabled
-- CRITICAL: Uses service role key for authentication
CREATE OR REPLACE FUNCTION invoke_edge_function_v2(
  p_function_name TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_timeout_milliseconds INTEGER DEFAULT 300000 -- 5 minutes default
)
RETURNS JSONB AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  http_response RECORD;
  response_body JSONB;
BEGIN
  -- Get Supabase URL and service role key from settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Supabase URL or service role key not configured. Set app.settings.supabase_url and app.settings.supabase_service_role_key';
  END IF;

  -- Invoke Edge Function via HTTP POST
  -- CRITICAL: Use pg_net extension (must be enabled)
  SELECT * INTO http_response
  FROM net.http_post(
    url := supabase_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    )::jsonb,
    body := p_payload::jsonb,
    timeout_milliseconds := p_timeout_milliseconds
  );

  -- Parse response body
  IF http_response.status_code = 200 THEN
    BEGIN
      response_body := http_response.content::jsonb;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to parse Edge Function response as JSON: %', http_response.content;
        response_body := jsonb_build_object('error', 'Invalid JSON response', 'content', http_response.content);
    END;
  ELSE
    RAISE EXCEPTION 'Edge Function invocation failed. Status: %, Body: %',
      http_response.status_code, http_response.content;
  END IF;

  RETURN response_body;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invoke_edge_function_v2 IS 'Invokes a Supabase Edge Function from SQL context using pg_net extension. Requires pg_net to be enabled.';

-- Update invoke_processor_if_healthy_v2 to use the invoker function
CREATE OR REPLACE FUNCTION public.invoke_processor_if_healthy_v2()
RETURNS void AS $$
DECLARE
  recent_failures INTEGER;
  lock_acquired BOOLEAN;
  invocation_result JSONB;
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
    BEGIN
      -- Use the invoker function to call the Edge Function
      SELECT invoke_edge_function_v2(
        'queue-processor-v2',
        '{}'::jsonb,
        300000 -- 5 minute timeout
      ) INTO invocation_result;
      
      RAISE NOTICE 'Processor invoked successfully: %', invocation_result;
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

