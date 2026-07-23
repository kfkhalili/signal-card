-- Restore the per-minute API rate limiter referenced by the queue processor.
CREATE TABLE IF NOT EXISTS public.api_calls_rate_tracker (
  minute_bucket timestamptz PRIMARY KEY,
  api_calls_made integer NOT NULL DEFAULT 0 CHECK (api_calls_made >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_calls_rate_tracker_updated_at
  ON public.api_calls_rate_tracker (updated_at);

ALTER TABLE public.api_calls_rate_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages API rate tracker"
  ON public.api_calls_rate_tracker;
CREATE POLICY "Service role manages API rate tracker"
  ON public.api_calls_rate_tracker
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.api_calls_rate_tracker TO service_role;

-- Keep queue creation unique under concurrent scheduler/UI requests. The
-- transaction-scoped lock is keyed by symbol and data type and is released
-- automatically on commit or rollback.
CREATE OR REPLACE FUNCTION public.queue_refresh_if_not_exists_v2(
  p_symbol text,
  p_data_type text,
  p_priority integer,
  p_estimated_size_bytes bigint DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  job_id uuid;
  existing_job_id uuid;
  final_priority integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_symbol || chr(31) || p_data_type, 0)
  );

  IF p_data_type = 'financial-statements' AND p_priority < 1000 THEN
    final_priority := 500;
  ELSE
    final_priority := p_priority;
  END IF;

  SELECT queue.id
  INTO existing_job_id
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.symbol = p_symbol
    AND queue.data_type = p_data_type
    AND queue.status IN ('pending', 'processing')
  ORDER BY queue.created_at
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET priority = GREATEST(queue.priority, final_priority)
    WHERE queue.id = existing_job_id
      AND queue.status IN ('pending', 'processing');
    job_id := existing_job_id;
  ELSE
    INSERT INTO public.api_call_queue_v2 (
      symbol, data_type, status, priority, estimated_data_size_bytes
    )
    VALUES (
      p_symbol, p_data_type, 'pending', final_priority,
      p_estimated_size_bytes
    )
    RETURNING api_call_queue_v2.id INTO job_id;
  END IF;

  RETURN job_id;
END;
$$;

-- Use a durable default when a deployment has not explicitly overridden the
-- 20 GiB rolling quota setting.
CREATE OR REPLACE FUNCTION public.is_quota_exceeded_v2(
  p_safety_buffer numeric DEFAULT 0.95
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  quota_limit_bytes bigint := COALESCE(
    NULLIF(current_setting('app.settings.quota_limit_bytes', true), '')::bigint,
    20::bigint * 1024 * 1024 * 1024
  );
  current_usage_bytes bigint;
  buffered_quota_bytes bigint;
BEGIN
  SELECT COALESCE(SUM(usage.data_size_bytes), 0)
  INTO current_usage_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= now() - interval '30 days';

  buffered_quota_bytes := (quota_limit_bytes * p_safety_buffer)::bigint;
  RETURN current_usage_bytes >= buffered_quota_bytes;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quota_usage_v2()
RETURNS TABLE(
  quota_limit_bytes bigint,
  current_usage_bytes bigint,
  buffered_quota_bytes bigint,
  usage_percentage numeric,
  days_remaining integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  quota_limit bigint := COALESCE(
    NULLIF(current_setting('app.settings.quota_limit_bytes', true), '')::bigint,
    20::bigint * 1024 * 1024 * 1024
  );
  current_usage bigint;
  buffered_quota bigint;
  oldest_record timestamptz;
BEGIN
  SELECT COALESCE(SUM(usage.data_size_bytes), 0), MIN(usage.recorded_at)
  INTO current_usage, oldest_record
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= now() - interval '30 days';

  buffered_quota := (quota_limit * 0.95)::bigint;

  RETURN QUERY SELECT
    quota_limit,
    current_usage,
    buffered_quota,
    ROUND(current_usage::numeric / quota_limit::numeric * 100, 2),
    CASE
      WHEN oldest_record IS NOT NULL THEN
        GREATEST(0, 30 - EXTRACT(DAY FROM now() - oldest_record)::integer)
      ELSE 30
    END;
END;
$$;

-- Qualify every queue column so PL/pgSQL output parameters cannot shadow it.
CREATE OR REPLACE FUNCTION public.get_queue_batch_v2(
  p_batch_size integer DEFAULT 50,
  p_max_priority integer DEFAULT 1000
)
RETURNS TABLE(
  id uuid,
  symbol text,
  data_type text,
  status text,
  priority integer,
  retry_count integer,
  max_retries integer,
  created_at timestamptz,
  estimated_data_size_bytes bigint,
  job_metadata jsonb
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_batch_ids uuid[];
  quota_limit_bytes bigint := COALESCE(
    NULLIF(current_setting('app.settings.quota_limit_bytes', true), '')::bigint,
    20::bigint * 1024 * 1024 * 1024
  );
  current_usage_bytes bigint;
  buffered_quota_bytes bigint;
  estimated_batch_size_bytes bigint;
BEGIN
  SELECT COALESCE(SUM(usage.data_size_bytes), 0)
  INTO current_usage_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= now() - interval '30 days';

  buffered_quota_bytes := (quota_limit_bytes * 0.95)::bigint;

  SELECT COALESCE(SUM(candidate.estimated_data_size_bytes), 0)
  INTO estimated_batch_size_bytes
  FROM (
    SELECT queue.estimated_data_size_bytes
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'pending'
      AND queue.priority <= p_max_priority
    ORDER BY queue.priority DESC, queue.created_at ASC
    LIMIT p_batch_size
  ) AS candidate;

  IF current_usage_bytes + estimated_batch_size_bytes >= buffered_quota_bytes THEN
    RETURN;
  END IF;

  WITH selected_jobs AS (
    SELECT queue.id AS job_id
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'pending'
      AND queue.priority <= p_max_priority
    ORDER BY queue.priority DESC, queue.created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  updated_jobs AS (
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'processing',
        processed_at = now()
    FROM selected_jobs
    WHERE queue.id = selected_jobs.job_id
      AND queue.status = 'pending'
    RETURNING queue.id AS job_id
  )
  SELECT array_agg(updated_jobs.job_id)
  INTO v_batch_ids
  FROM updated_jobs;

  RETURN QUERY
  SELECT
    queue.id,
    queue.symbol,
    queue.data_type,
    queue.status,
    queue.priority,
    queue.retry_count,
    queue.max_retries,
    queue.created_at,
    queue.estimated_data_size_bytes,
    queue.job_metadata
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.id = ANY(COALESCE(v_batch_ids, ARRAY[]::uuid[]))
    AND queue.status = 'processing'
  ORDER BY queue.priority DESC, queue.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_stuck_jobs_v2()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  recovered_count integer := 0;
BEGIN
  WITH stuck_jobs AS (
    SELECT queue.id AS job_id
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'processing'
      AND queue.processed_at < now() - interval '5 minutes'
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.api_call_queue_v2 AS queue
  SET status = 'pending',
      processed_at = NULL
  FROM stuck_jobs
  WHERE queue.id = stuck_jobs.job_id
    AND queue.status = 'processing';

  GET DIAGNOSTICS recovered_count = ROW_COUNT;
  RETURN recovered_count;
END;
$$;

-- pg_net is asynchronous: http_post returns a request id, not a synchronous
-- response record. Returning the id accurately reports that invocation was
-- queued without pretending an HTTP response has already arrived.
-- PostgreSQL cannot change a function return type with CREATE OR REPLACE.
-- Drop the exact signature first so this migration also reconciles databases
-- where the function's return type drifted from the migration history.
DROP FUNCTION IF EXISTS public.invoke_edge_function_v2(text, jsonb, integer);

CREATE FUNCTION public.invoke_edge_function_v2(
  p_function_name text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_timeout_milliseconds integer DEFAULT 300000
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  SELECT secret.decrypted_secret
  INTO supabase_url
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'project_url';

  SELECT secret.decrypted_secret
  INTO service_role_key
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'supabase_service_role_key';

  IF supabase_url IS NULL THEN
    RAISE EXCEPTION 'Supabase URL not found in vault';
  END IF;
  IF service_role_key IS NULL THEN
    RAISE EXCEPTION 'Service role key not found in vault';
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := p_payload,
    timeout_milliseconds := p_timeout_milliseconds
  )
  INTO request_id;

  RETURN jsonb_build_object('request_id', request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_quota_usage_alert()
RETURNS TABLE(
  usage_percent numeric,
  total_bytes bigint,
  alert_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_quota_limit bigint := COALESCE(
    NULLIF(current_setting('app.settings.quota_limit_bytes', true), '')::bigint,
    20::bigint * 1024 * 1024 * 1024
  );
  v_total_bytes bigint;
  v_usage_percent numeric;
BEGIN
  SELECT COALESCE(SUM(usage.data_size_bytes), 0)
  INTO v_total_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= now() - interval '30 days';

  v_usage_percent := ROUND(
    v_total_bytes::numeric / v_quota_limit::numeric * 100,
    2
  );

  RETURN QUERY SELECT
    v_usage_percent,
    v_total_bytes,
    CASE WHEN v_usage_percent > 80 THEN 'alert' ELSE 'healthy' END;
END;
$$;
