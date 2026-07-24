-- P1.3: Require the named "edge_functions_internal" secret API key for
-- privileged Edge Functions and remove legacy anon/service-role bearer calls.
--
-- This migration intentionally does not create, rotate, or expose the key.
-- Create a Supabase secret API key named "edge_functions_internal" and store
-- its value in Vault under the same name before re-enabling any affected job.

DO $$
DECLARE
  caller record;
  v_job_id bigint;
  v_command text;
BEGIN
  FOR caller IN
    SELECT *
    FROM (
      VALUES
        ('minute-fetch-fmp-quote-indicators', 'fetch-fmp-quote-indicators'),
        ('hourly-fetch-fmp-all-exchange-market-status', 'fetch-fmp-all-exchange-market-status'),
        ('monthly-fetch-fmp-financial-statements', 'fetch-fmp-financial-statements'),
        ('hourly-fetch-fmp-profiles', 'fetch-fmp-profiles'),
        ('daily-fetch-fmp-shares-float', 'fetch-fmp-shares-float'),
        ('daily-fetch-fmp-ratios-ttm', 'fetch-fmp-ratios-ttm'),
        ('quarterly-fetch-fmp-dividend-history', 'fetch-fmp-dividend-history'),
        ('yearly-fetch-fmp-revenue-segmentation', 'fetch-fmp-revenue-segmentation'),
        ('monthly-fetch-fmp-grades-historical', 'fetch-fmp-grades-historical'),
        ('daily-fetch-fmp-exchange-variants', 'fetch-fmp-exchange-variants'),
        ('daily-fetch-exchange-rates', 'fetch-exchange-rates'),
        ('hourly-fetch-fmp-available-exchanges', 'fetch-fmp-available-exchanges'),
        ('minute-fetch-fmp-exchange-prices-api', 'fetch-fmp-exchange-prices-api')
    ) AS configured_caller(job_name, function_name)
  LOOP
    SELECT job.jobid
    INTO v_job_id
    FROM cron.job AS job
    WHERE job.jobname = caller.job_name;

    IF v_job_id IS NULL THEN
      CONTINUE;
    END IF;

    v_command := format(
      $command$
      SELECT net.http_post(
        url := (
          SELECT secret.decrypted_secret
          FROM vault.decrypted_secrets AS secret
          WHERE secret.name = 'project_url'
        ) || '/functions/v1/%s',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (
            SELECT secret.decrypted_secret
            FROM vault.decrypted_secrets AS secret
            WHERE secret.name = 'edge_functions_internal'
          )
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $command$,
      caller.function_name
    );

    -- Supplying only command preserves schedule, database, username, and the
    -- existing active flag. In particular, quota-hold jobs stay inactive.
    PERFORM cron.alter_job(
      job_id => v_job_id,
      command => v_command
    );

    v_job_id := NULL;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoke_edge_function_v2(
  p_function_name text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_timeout_milliseconds integer DEFAULT 300000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  supabase_url text;
  internal_api_key text;
  request_id bigint;
BEGIN
  IF p_function_name <> 'queue-processor-v2' THEN
    RAISE EXCEPTION 'Edge Function is not allowed by invoke_edge_function_v2';
  END IF;

  SELECT secret.decrypted_secret
  INTO supabase_url
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'project_url';

  SELECT secret.decrypted_secret
  INTO internal_api_key
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'edge_functions_internal';

  IF supabase_url IS NULL THEN
    RAISE EXCEPTION 'Supabase URL not found in Vault';
  END IF;

  IF internal_api_key IS NULL THEN
    RAISE EXCEPTION 'Internal Edge Function API key not found in Vault';
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'apikey', internal_api_key,
      'Content-Type', 'application/json'
    ),
    body := p_payload,
    timeout_milliseconds := p_timeout_milliseconds
  )
  INTO request_id;

  RETURN jsonb_build_object('request_id', request_id);
END;
$$;

COMMENT ON FUNCTION public.invoke_edge_function_v2(text, jsonb, integer)
IS 'Queues an allowed internal Edge Function invocation through pg_net using the named edge_functions_internal secret key.';

REVOKE ALL
ON FUNCTION public.invoke_edge_function_v2(text, jsonb, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.invoke_edge_function_v2(text, jsonb, integer)
TO service_role;

REVOKE ALL
ON FUNCTION public.invoke_processor_if_healthy_v2()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.invoke_processor_if_healthy_v2()
TO service_role;

REVOKE ALL
ON FUNCTION public.invoke_processor_loop_v2(integer, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.invoke_processor_loop_v2(integer, integer)
TO service_role;

-- Only the service-role client inside handle-new-user needs this RPC.
REVOKE ALL
ON FUNCTION public.handle_user_created_webhook(jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.handle_user_created_webhook(jsonb)
TO service_role;
