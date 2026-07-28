\set ON_ERROR_STOP on

-- Read-only post-deployment verification. This script makes zero FMP calls.

WITH effective AS (
  SELECT *
  FROM public.get_effective_quota_usage_v2()
),
endpoint_sum AS (
  SELECT
    calibration.id,
    sum(endpoint.value::numeric) AS endpoint_usage_mib
  FROM public.fmp_quota_calibrations AS calibration
  CROSS JOIN LATERAL jsonb_each_text(
    calibration.endpoint_usage_mib
  ) AS endpoint
  WHERE calibration.active
  GROUP BY calibration.id
)
SELECT
  now() AS captured_at,
  effective.calibration_id,
  effective.calibrated_at,
  effective.is_calibrated,
  endpoint_sum.endpoint_usage_mib,
  round(endpoint_sum.endpoint_usage_mib / 1024, 4)
    AS endpoint_usage_gib,
  effective.baseline_usage_bytes,
  effective.post_calibration_usage_bytes,
  effective.current_usage_bytes,
  effective.raw_ledger_usage_bytes,
  effective.quota_limit_bytes,
  round(
    effective.current_usage_bytes::numeric
      / effective.quota_limit_bytes
      * 100,
    2
  ) AS effective_usage_percentage,
  effective.safety_buffer,
  effective.max_batch_jobs,
  public.is_quota_exceeded_v2() AS quota_guard_active,
  (
    SELECT jsonb_object_agg(queue.status, queue.jobs)
    FROM (
      SELECT status, count(*) AS jobs
      FROM public.api_call_queue_v2
      GROUP BY status
    ) AS queue
  ) AS queue_statuses
FROM effective
LEFT JOIN endpoint_sum
  ON endpoint_sum.id = effective.calibration_id;

