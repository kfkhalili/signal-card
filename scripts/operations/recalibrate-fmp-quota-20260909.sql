-- Reconcile the rolling-30-day quota ledger to the FMP dashboard snapshot:
-- 905 displayed MB used out of a 20 GiB limit on 2026-09-09.
--
-- This operation makes no FMP calls. The scheduler is expected to resume on
-- its next minute after the calibration commits.

BEGIN;

DO $$
DECLARE
  v_active_schedulers integer;
  v_active_processors integer;
  v_stale_processing integer;
BEGIN
  SELECT
    count(*) FILTER (
      WHERE cron.active
        AND cron.jobname = 'queue-scheduled-refreshes-v2'
    ),
    count(*) FILTER (
      WHERE cron.active
        AND (
          cron.jobname = 'invoke-processor-v2'
          OR cron.jobname LIKE 'controlled-fmp-live-processing-%'
        )
    )
  INTO v_active_schedulers, v_active_processors
  FROM public.get_fmp_pipeline_cron_state_v2() AS cron;

  SELECT count(*)::integer
  INTO v_stale_processing
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.status = 'processing'
    AND queue.processed_at < pg_catalog.now() - interval '5 minutes';

  IF v_active_schedulers <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one active scheduled-refresh path, found %',
      v_active_schedulers;
  END IF;

  IF v_active_processors <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one active processor path, found %',
      v_active_processors;
  END IF;

  IF v_stale_processing <> 0 THEN
    RAISE EXCEPTION
      'Refusing calibration while % stale processing jobs exist',
      v_stale_processing;
  END IF;
END;
$$;

SELECT public.record_fmp_quota_calibration_v2(
  p_dashboard_headline_usage_gib => 0.88,
  p_dashboard_limit_gib => 20,
  p_endpoint_usage_mib => pg_catalog.jsonb_build_object(
    'dashboard-total-unattributed',
    905.00
  ),
  p_source =>
    'FMP rolling-30-day dashboard total supplied 2026-09-09; '
    || '905 MB / 20 GB; endpoint breakdown not supplied; '
    || 'scheduler guard-blocked during capture',
  p_captured_at => pg_catalog.now(),
  p_safety_buffer => 0.90,
  p_max_batch_jobs => 50
) AS calibration_id;

COMMIT;

WITH effective AS (
  SELECT *
  FROM public.get_effective_quota_usage_v2()
),
queue_summary AS (
  SELECT pg_catalog.jsonb_object_agg(queue.status, queue.jobs) AS statuses
  FROM (
    SELECT status, count(*) AS jobs
    FROM public.api_call_queue_v2
    GROUP BY status
  ) AS queue
),
cron_summary AS (
  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'jobid', cron.jobid,
        'jobname', cron.jobname,
        'schedule', cron.schedule,
        'active', cron.active
      )
      ORDER BY cron.jobid
    ),
    '[]'::jsonb
  ) AS jobs
  FROM public.get_fmp_pipeline_cron_state_v2() AS cron
)
SELECT pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'calibration_id', effective.calibration_id,
  'calibrated_at', effective.calibrated_at,
  'quota_limit_gib', pg_catalog.round(
    effective.quota_limit_bytes::numeric / 1024 / 1024 / 1024,
    2
  ),
  'current_usage_mib', pg_catalog.round(
    effective.current_usage_bytes::numeric / 1024 / 1024,
    2
  ),
  'effective_usage_percentage', pg_catalog.round(
    effective.current_usage_bytes::numeric
      / effective.quota_limit_bytes::numeric
      * 100,
    4
  ),
  'safety_buffer', effective.safety_buffer,
  'max_batch_jobs', effective.max_batch_jobs,
  'quota_guard_active', public.is_quota_exceeded_v2(),
  'bytes_to_safety_ceiling',
    (effective.quota_limit_bytes * effective.safety_buffer)::bigint
      - effective.current_usage_bytes,
  'queue_statuses', queue_summary.statuses,
  'pipeline_jobs', cron_summary.jobs
) AS quota_recalibration
FROM effective
CROSS JOIN queue_summary
CROSS JOIN cron_summary;
