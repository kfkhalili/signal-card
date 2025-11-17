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

-- Note: invoke_processor_if_healthy_v2 is updated in 20251117073704_create_processor_invoker_v2.sql
-- This migration creates the helper function that it uses

