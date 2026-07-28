-- Reconcile the local rolling-usage ledger with an authoritative FMP
-- dashboard snapshot without deleting historical observations.
--
-- While a calibration is active, effective usage is deliberately
-- conservative:
--   dashboard usage at capture + locally observed queue traffic after capture.
-- Natural dashboard roll-off is ignored until the next calibration, so this
-- mechanism cannot create quota headroom merely because time has passed.

BEGIN;

ALTER TABLE public.api_data_usage_v2
  ADD COLUMN IF NOT EXISTS data_type text,
  ADD COLUMN IF NOT EXISTS outcome text;

COMMENT ON COLUMN public.api_data_usage_v2.data_type
IS 'Queue data type captured at usage-record time so attribution survives queue partition cleanup.';

COMMENT ON COLUMN public.api_data_usage_v2.outcome
IS 'Queue outcome that produced the transfer observation: success or failure.';

CREATE INDEX IF NOT EXISTS idx_api_data_usage_v2_data_type_recorded_at
  ON public.api_data_usage_v2 (data_type, recorded_at DESC)
  WHERE data_type IS NOT NULL;

CREATE TABLE public.fmp_quota_calibrations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  captured_at timestamptz NOT NULL,
  dashboard_headline_usage_gib numeric(12, 2) NOT NULL
    CHECK (dashboard_headline_usage_gib >= 0),
  dashboard_usage_bytes bigint NOT NULL
    CHECK (dashboard_usage_bytes >= 0),
  dashboard_limit_bytes bigint NOT NULL
    CHECK (dashboard_limit_bytes > 0),
  endpoint_usage_mib jsonb NOT NULL
    CHECK (jsonb_typeof(endpoint_usage_mib) = 'object'),
  raw_ledger_usage_bytes bigint NOT NULL
    CHECK (raw_ledger_usage_bytes >= 0),
  safety_buffer numeric(5, 4) NOT NULL DEFAULT 0.8000
    CHECK (safety_buffer > 0 AND safety_buffer <= 1),
  max_batch_jobs integer NOT NULL DEFAULT 25
    CHECK (max_batch_jobs BETWEEN 1 AND 125),
  source text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fmp_quota_calibrations
IS 'Append-only audit snapshots reconciling effective quota usage to the authoritative FMP dashboard.';

COMMENT ON COLUMN public.fmp_quota_calibrations.dashboard_usage_bytes
IS 'Sum of dashboard endpoint MiB values, conservatively rounded up to bytes.';

COMMENT ON COLUMN public.fmp_quota_calibrations.raw_ledger_usage_bytes
IS 'Unmodified local 30-day ledger total captured for audit when the calibration was recorded.';

COMMENT ON COLUMN public.fmp_quota_calibrations.safety_buffer
IS 'Maximum fraction of quota available to queue claims while this calibration is active.';

CREATE UNIQUE INDEX fmp_quota_calibrations_one_active
  ON public.fmp_quota_calibrations (active)
  WHERE active;

CREATE INDEX fmp_quota_calibrations_captured_at
  ON public.fmp_quota_calibrations (captured_at DESC);

ALTER TABLE public.fmp_quota_calibrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.fmp_quota_calibrations
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.fmp_quota_calibrations TO service_role;

CREATE OR REPLACE FUNCTION public.record_fmp_quota_calibration_v2(
  p_dashboard_headline_usage_gib numeric,
  p_dashboard_limit_gib numeric,
  p_endpoint_usage_mib jsonb,
  p_source text,
  p_captured_at timestamptz DEFAULT now(),
  p_safety_buffer numeric DEFAULT 0.80,
  p_max_batch_jobs integer DEFAULT 25
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_endpoint_usage_mib numeric;
  v_dashboard_usage_bytes bigint;
  v_dashboard_limit_bytes bigint;
  v_raw_ledger_usage_bytes bigint;
  v_calibration_id bigint;
BEGIN
  IF p_captured_at > pg_catalog.now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Calibration capture time cannot be in the future';
  END IF;

  IF p_dashboard_headline_usage_gib < 0
     OR p_dashboard_limit_gib <= 0 THEN
    RAISE EXCEPTION 'Dashboard usage and limit must be non-negative and positive respectively';
  END IF;

  IF p_safety_buffer <= 0 OR p_safety_buffer > 1 THEN
    RAISE EXCEPTION 'Safety buffer must be greater than 0 and at most 1';
  END IF;

  IF p_max_batch_jobs < 1 OR p_max_batch_jobs > 125 THEN
    RAISE EXCEPTION 'Maximum recovery batch must be between 1 and 125 jobs';
  END IF;

  IF pg_catalog.jsonb_typeof(p_endpoint_usage_mib) <> 'object'
     OR p_endpoint_usage_mib = '{}'::jsonb THEN
    RAISE EXCEPTION 'Endpoint usage must be a non-empty JSON object';
  END IF;

  SELECT pg_catalog.sum(endpoint.value::numeric)
  INTO v_endpoint_usage_mib
  FROM pg_catalog.jsonb_each_text(p_endpoint_usage_mib) AS endpoint;

  IF v_endpoint_usage_mib < 0 THEN
    RAISE EXCEPTION 'Endpoint usage cannot be negative';
  END IF;

  -- The FMP UI labels these units MB/GB but its headline reconciles at
  -- 1,024 displayed MB per displayed GB. Requiring the rounded headline to
  -- match catches incomplete endpoint snapshots and unit mistakes.
  IF pg_catalog.round(v_endpoint_usage_mib / 1024, 2)
     <> pg_catalog.round(p_dashboard_headline_usage_gib, 2) THEN
    RAISE EXCEPTION
      'Endpoint total % MiB does not reconcile to dashboard headline % GiB',
      v_endpoint_usage_mib,
      p_dashboard_headline_usage_gib;
  END IF;

  v_dashboard_usage_bytes :=
    pg_catalog.ceil(v_endpoint_usage_mib * 1024 * 1024)::bigint;
  v_dashboard_limit_bytes :=
    pg_catalog.ceil(p_dashboard_limit_gib * 1024 * 1024 * 1024)::bigint;

  IF v_dashboard_usage_bytes > v_dashboard_limit_bytes THEN
    RAISE EXCEPTION 'Dashboard usage cannot exceed the dashboard limit';
  END IF;

  SELECT COALESCE(pg_catalog.sum(usage.data_size_bytes), 0)
  INTO v_raw_ledger_usage_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= p_captured_at - interval '30 days'
    AND usage.recorded_at <= p_captured_at;

  LOCK TABLE public.fmp_quota_calibrations
    IN SHARE ROW EXCLUSIVE MODE;

  UPDATE public.fmp_quota_calibrations
  SET active = false
  WHERE active;

  INSERT INTO public.fmp_quota_calibrations (
    captured_at,
    dashboard_headline_usage_gib,
    dashboard_usage_bytes,
    dashboard_limit_bytes,
    endpoint_usage_mib,
    raw_ledger_usage_bytes,
    safety_buffer,
    max_batch_jobs,
    source
  )
  VALUES (
    p_captured_at,
    pg_catalog.round(p_dashboard_headline_usage_gib, 2),
    v_dashboard_usage_bytes,
    v_dashboard_limit_bytes,
    p_endpoint_usage_mib,
    v_raw_ledger_usage_bytes,
    p_safety_buffer,
    p_max_batch_jobs,
    p_source
  )
  RETURNING id INTO v_calibration_id;

  RETURN v_calibration_id;
END;
$$;

ALTER FUNCTION public.record_fmp_quota_calibration_v2(
  numeric, numeric, jsonb, text, timestamptz, numeric, integer
) OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.record_fmp_quota_calibration_v2(
  numeric, numeric, jsonb, text, timestamptz, numeric, integer
)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_effective_quota_usage_v2()
RETURNS TABLE (
  calibration_id bigint,
  calibrated_at timestamptz,
  is_calibrated boolean,
  quota_limit_bytes bigint,
  current_usage_bytes bigint,
  baseline_usage_bytes bigint,
  post_calibration_usage_bytes bigint,
  raw_ledger_usage_bytes bigint,
  safety_buffer numeric,
  max_batch_jobs integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_calibration public.fmp_quota_calibrations%ROWTYPE;
  v_raw_usage_bytes bigint;
  v_post_calibration_usage_bytes bigint;
  v_default_limit_bytes bigint := COALESCE(
    NULLIF(pg_catalog.current_setting(
      'app.settings.quota_limit_bytes',
      true
    ), '')::bigint,
    20::bigint * 1024 * 1024 * 1024
  );
BEGIN
  SELECT COALESCE(pg_catalog.sum(usage.data_size_bytes), 0)
  INTO v_raw_usage_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= pg_catalog.now() - interval '30 days';

  SELECT calibration.*
  INTO v_calibration
  FROM public.fmp_quota_calibrations AS calibration
  WHERE calibration.active
  ORDER BY calibration.captured_at DESC, calibration.id DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::bigint,
      NULL::timestamptz,
      false,
      v_default_limit_bytes,
      v_raw_usage_bytes,
      0::bigint,
      v_raw_usage_bytes,
      v_raw_usage_bytes,
      0.95::numeric,
      125;
    RETURN;
  END IF;

  SELECT COALESCE(pg_catalog.sum(usage.data_size_bytes), 0)
  INTO v_post_calibration_usage_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at > v_calibration.captured_at
    AND usage.recorded_at >= pg_catalog.now() - interval '30 days';

  RETURN QUERY
  SELECT
    v_calibration.id,
    v_calibration.captured_at,
    true,
    v_calibration.dashboard_limit_bytes,
    v_calibration.dashboard_usage_bytes
      + v_post_calibration_usage_bytes,
    v_calibration.dashboard_usage_bytes,
    v_post_calibration_usage_bytes,
    v_raw_usage_bytes,
    v_calibration.safety_buffer,
    v_calibration.max_batch_jobs;
END;
$$;

ALTER FUNCTION public.get_effective_quota_usage_v2() OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.get_effective_quota_usage_v2()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_effective_quota_usage_v2()
TO service_role;

CREATE OR REPLACE FUNCTION public.is_quota_exceeded_v2(
  p_safety_buffer numeric DEFAULT 0.95
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usage record;
  v_safety_buffer numeric;
BEGIN
  IF p_safety_buffer <= 0 OR p_safety_buffer > 1 THEN
    RAISE EXCEPTION 'Safety buffer must be greater than 0 and at most 1';
  END IF;

  SELECT *
  INTO v_usage
  FROM public.get_effective_quota_usage_v2();

  v_safety_buffer := CASE
    WHEN v_usage.is_calibrated
      THEN LEAST(p_safety_buffer, v_usage.safety_buffer)
    ELSE p_safety_buffer
  END;

  RETURN v_usage.current_usage_bytes
    >= (v_usage.quota_limit_bytes * v_safety_buffer)::bigint;
END;
$$;

ALTER FUNCTION public.is_quota_exceeded_v2(numeric) OWNER TO postgres;

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
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usage record;
  v_oldest_record timestamptz;
BEGIN
  SELECT *
  INTO v_usage
  FROM public.get_effective_quota_usage_v2();

  SELECT pg_catalog.min(usage.recorded_at)
  INTO v_oldest_record
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= pg_catalog.now() - interval '30 days';

  RETURN QUERY
  SELECT
    v_usage.quota_limit_bytes,
    v_usage.current_usage_bytes,
    (v_usage.quota_limit_bytes * v_usage.safety_buffer)::bigint,
    pg_catalog.round(
      v_usage.current_usage_bytes::numeric
        / v_usage.quota_limit_bytes::numeric
        * 100,
      2
    ),
    CASE
      WHEN v_oldest_record IS NOT NULL THEN
        GREATEST(
          0,
          30 - pg_catalog.floor(
            EXTRACT(EPOCH FROM pg_catalog.now() - v_oldest_record) / 86400
          )::integer
        )
      ELSE 30
    END;
END;
$$;

ALTER FUNCTION public.get_quota_usage_v2() OWNER TO postgres;

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
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch_ids uuid[];
  v_usage record;
  v_effective_batch_size integer;
  v_buffered_quota_bytes bigint;
  v_estimated_batch_size_bytes bigint;
BEGIN
  IF p_batch_size < 1 THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_usage
  FROM public.get_effective_quota_usage_v2();

  v_effective_batch_size := LEAST(
    p_batch_size,
    CASE
      WHEN v_usage.is_calibrated THEN v_usage.max_batch_jobs
      ELSE p_batch_size
    END
  );

  v_buffered_quota_bytes :=
    (v_usage.quota_limit_bytes * v_usage.safety_buffer)::bigint;

  SELECT COALESCE(
    pg_catalog.sum(GREATEST(candidate.estimated_data_size_bytes, 0)),
    0
  )
  INTO v_estimated_batch_size_bytes
  FROM (
    SELECT queue.estimated_data_size_bytes
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'pending'
      AND queue.priority <= p_max_priority
    ORDER BY queue.priority DESC, queue.created_at ASC
    LIMIT v_effective_batch_size
  ) AS candidate;

  IF v_usage.current_usage_bytes + v_estimated_batch_size_bytes
     >= v_buffered_quota_bytes THEN
    RETURN;
  END IF;

  WITH selected_jobs AS (
    SELECT queue.id AS job_id
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'pending'
      AND queue.priority <= p_max_priority
    ORDER BY queue.priority DESC, queue.created_at ASC
    LIMIT v_effective_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  updated_jobs AS (
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'processing',
        processed_at = pg_catalog.now()
    FROM selected_jobs
    WHERE queue.id = selected_jobs.job_id
      AND queue.status = 'pending'
    RETURNING queue.id AS job_id
  )
  SELECT pg_catalog.array_agg(updated_jobs.job_id)
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

ALTER FUNCTION public.get_queue_batch_v2(integer, integer) OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.get_queue_batch_v2(integer, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_queue_batch_v2(integer, integer)
TO service_role;

CREATE OR REPLACE FUNCTION public.complete_queue_job_v2(
  p_job_id uuid,
  p_data_size_bytes bigint,
  p_api_calls_made integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_data_type text;
BEGIN
  SELECT queue.data_type
  INTO v_job_data_type
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.id = p_job_id
    AND queue.status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  UPDATE public.api_call_queue_v2 AS queue
  SET status = 'completed',
      processed_at = pg_catalog.now(),
      actual_data_size_bytes = GREATEST(p_data_size_bytes, 0)
  WHERE queue.id = p_job_id
    AND queue.status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  INSERT INTO public.api_data_usage_v2 (
    data_size_bytes,
    job_id,
    data_type,
    outcome
  )
  VALUES (
    GREATEST(p_data_size_bytes, 0),
    p_job_id,
    v_job_data_type,
    'success'
  );

  IF pg_catalog.random() < 0.01 THEN
    UPDATE public.data_type_registry_v2 AS registry
    SET estimated_data_size_bytes = CASE
      WHEN registry.estimated_data_size_bytes = 0
        THEN GREATEST(p_data_size_bytes, 0)
      ELSE (
        registry.estimated_data_size_bytes * 0.9
        + GREATEST(p_data_size_bytes, 0) * 0.1
      )::bigint
    END
    WHERE registry.data_type = v_job_data_type;
  END IF;
END;
$$;

ALTER FUNCTION public.complete_queue_job_v2(uuid, bigint, integer)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.complete_queue_job_v2(uuid, bigint, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.complete_queue_job_v2(uuid, bigint, integer)
TO service_role;

CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id uuid,
  p_error_message text,
  p_data_size_bytes bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_retry_count integer;
  v_current_max_retries integer;
  v_job_data_type text;
BEGIN
  SELECT queue.retry_count, queue.max_retries, queue.data_type
  INTO v_current_retry_count, v_current_max_retries, v_job_data_type
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.id = p_job_id
    AND queue.status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  IF p_error_message ILIKE '%Limit Reach%' THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'pending',
        retry_count = v_current_retry_count + 1,
        processed_at = NULL,
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSIF p_error_message ILIKE '%stale%'
        AND p_error_message ILIKE '%timestamp%' THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'failed',
        processed_at = pg_catalog.now(),
        error_message =
          p_error_message
          || ' (Failed immediately - no retries for stale data)'
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSIF v_current_retry_count >= v_current_max_retries THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'failed',
        processed_at = pg_catalog.now(),
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSE
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'pending',
        retry_count = v_current_retry_count + 1,
        processed_at = NULL,
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  END IF;

  IF p_data_size_bytes > 0 THEN
    INSERT INTO public.api_data_usage_v2 (
      data_size_bytes,
      job_id,
      data_type,
      outcome
    )
    VALUES (
      p_data_size_bytes,
      p_job_id,
      v_job_data_type,
      'failure'
    );
  END IF;
END;
$$;

ALTER FUNCTION public.fail_queue_job_v2(uuid, text, bigint)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.fail_queue_job_v2(uuid, text, bigint)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.fail_queue_job_v2(uuid, text, bigint)
TO service_role;

-- Compatibility wrapper for an Edge Function revision deployed before this
-- migration. The new revision uses the three-argument overload.
CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id uuid,
  p_error_message text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.fail_queue_job_v2(p_job_id, p_error_message, 0);
$$;

ALTER FUNCTION public.fail_queue_job_v2(uuid, text) OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.fail_queue_job_v2(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.fail_queue_job_v2(uuid, text)
TO service_role;

CREATE OR REPLACE FUNCTION public.check_quota_usage_alert()
RETURNS TABLE (
  usage_percent numeric,
  total_bytes bigint,
  alert_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usage record;
  v_usage_percent numeric;
BEGIN
  SELECT *
  INTO v_usage
  FROM public.get_effective_quota_usage_v2();

  v_usage_percent := pg_catalog.round(
    v_usage.current_usage_bytes::numeric
      / v_usage.quota_limit_bytes::numeric
      * 100,
    2
  );

  RETURN QUERY
  SELECT
    v_usage_percent,
    v_usage.current_usage_bytes,
    CASE
      WHEN v_usage_percent >= 80 THEN 'alert'
      ELSE 'healthy'
    END;
END;
$$;

ALTER FUNCTION public.check_quota_usage_alert() OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.check_quota_usage_alert()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.check_quota_usage_alert()
TO service_role;

COMMIT;
