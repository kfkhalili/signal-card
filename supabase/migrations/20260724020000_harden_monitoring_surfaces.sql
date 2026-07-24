-- Harden the database surface behind the public monitoring Edge Functions.
--
-- The Edge Functions use service-role clients, so anon/authenticated callers
-- do not need direct access to these SECURITY DEFINER functions or the
-- cron-health table.

BEGIN;

CREATE OR REPLACE FUNCTION public.check_cron_job_health(
  p_critical_jobs text[]
)
RETURNS TABLE (
  jobname text,
  last_run timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    jobs.jobname::text,
    logs.last_run
  FROM cron.job AS jobs
  LEFT JOIN public.cron_health_logs AS logs
    ON logs.jobname = jobs.jobname
  WHERE jobs.active
    AND jobs.jobname = ANY (p_critical_jobs);
$$;

ALTER FUNCTION public.check_cron_job_health(text[]) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.check_queue_success_rate_alert()
RETURNS TABLE (
  success_rate_percent numeric,
  completed_count bigint,
  failed_count bigint,
  alert_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_success_rate numeric;
  v_completed bigint;
  v_failed bigint;
BEGIN
  SELECT
    pg_catalog.count(*) FILTER (WHERE status = 'completed') * 100.0
      / NULLIF(
        pg_catalog.count(*) FILTER (
          WHERE status IN ('completed', 'failed')
        ),
        0
      ),
    pg_catalog.count(*) FILTER (WHERE status = 'completed'),
    pg_catalog.count(*) FILTER (WHERE status = 'failed')
  INTO v_success_rate, v_completed, v_failed
  FROM public.api_call_queue_v2
  WHERE created_at > pg_catalog.now() - interval '24 hours';

  RETURN QUERY
  SELECT
    COALESCE(v_success_rate, 100),
    COALESCE(v_completed, 0),
    COALESCE(v_failed, 0),
    CASE WHEN v_success_rate < 90 THEN 'alert' ELSE 'healthy' END;
END;
$$;

ALTER FUNCTION public.check_queue_success_rate_alert() OWNER TO postgres;

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
  v_usage_percent numeric;
  v_total_bytes bigint;
BEGIN
  SELECT
    pg_catalog.round(
      usage.total_bytes / (20.0 * 1024 * 1024 * 1024) * 100,
      2
    ),
    usage.total_bytes
  INTO v_usage_percent, v_total_bytes
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.date >= CURRENT_DATE - interval '30 days'
  ORDER BY usage.date DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    COALESCE(v_usage_percent, 0),
    COALESCE(v_total_bytes, 0),
    CASE WHEN v_usage_percent > 80 THEN 'alert' ELSE 'healthy' END;
END;
$$;

ALTER FUNCTION public.check_quota_usage_alert() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.check_stuck_jobs_alert()
RETURNS TABLE (
  stuck_count bigint,
  affected_data_types bigint,
  alert_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stuck_count bigint;
  v_affected_types bigint;
BEGIN
  SELECT
    pg_catalog.count(*),
    pg_catalog.count(DISTINCT data_type)
  INTO v_stuck_count, v_affected_types
  FROM public.api_call_queue_v2
  WHERE status = 'processing'
    AND processed_at < pg_catalog.now() - interval '10 minutes';

  RETURN QUERY
  SELECT
    COALESCE(v_stuck_count, 0),
    COALESCE(v_affected_types, 0),
    CASE WHEN v_stuck_count > 10 THEN 'alert' ELSE 'healthy' END;
END;
$$;

ALTER FUNCTION public.check_stuck_jobs_alert() OWNER TO postgres;

REVOKE ALL
ON FUNCTION
  public.check_cron_job_health(text[]),
  public.check_queue_success_rate_alert(),
  public.check_quota_usage_alert(),
  public.check_stuck_jobs_alert()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION
  public.check_cron_job_health(text[]),
  public.check_queue_success_rate_alert(),
  public.check_quota_usage_alert(),
  public.check_stuck_jobs_alert()
TO service_role;

REVOKE ALL
ON TABLE public.cron_health_logs
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.cron_health_logs
TO service_role;

COMMIT;
