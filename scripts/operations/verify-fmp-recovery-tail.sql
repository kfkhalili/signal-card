-- Read-only post-deployment verification for the controlled FMP recovery tail.
--
-- This script does not queue jobs, invoke Edge Functions, or call FMP.

WITH effective AS (
  SELECT *
  FROM public.get_effective_quota_usage_v2()
),
queue_summary AS (
  SELECT
    count(*) FILTER (WHERE queue.status = 'pending') AS pending_jobs,
    count(*) FILTER (WHERE queue.status = 'processing') AS processing_jobs,
    count(*) FILTER (WHERE queue.status = 'failed') AS failed_jobs,
    count(*) FILTER (
      WHERE queue.status = 'processing'
        AND queue.processed_at < now() - interval '5 minutes'
    ) AS stale_processing_jobs,
    count(*) FILTER (
      WHERE queue.status IN ('pending', 'processing')
        AND queue.symbol LIKE '%,f'
    ) AS active_malformed_symbol_jobs
  FROM public.api_call_queue_v2 AS queue
),
failed_summary AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'symbol', failed.symbol,
        'data_type', failed.data_type,
        'retry_count', failed.retry_count,
        'error', failed.error_message
      )
      ORDER BY failed.symbol, failed.data_type
    ),
    '[]'::jsonb
  ) AS failures
  FROM public.api_call_queue_v2 AS failed
  WHERE failed.status = 'failed'
),
function_contracts AS (
  SELECT
    POSITION(
      'symbol,eq,([^,)]+)'
      IN pg_get_functiondef(
        'public.get_active_subscriptions_from_realtime()'::regprocedure
      )
    ) > 0 AS presence_parser_fixed,
    POSITION(
      'symbol,eq,([^,)]+)'
      IN pg_get_functiondef(
        'public.on_realtime_subscription_insert()'::regprocedure
      )
    ) > 0 AS trigger_parser_fixed,
    POSITION(
      'PERFORM public.invoke_edge_function_v2'
      IN pg_get_functiondef(
        'public.invoke_processor_if_healthy_v2()'::regprocedure
      )
    ) > 0
    AND POSITION(
      'RAISE WARNING'
      IN pg_get_functiondef(
        'public.invoke_processor_if_healthy_v2()'::regprocedure
      )
    ) = 0 AS processor_invoker_fixed
)
SELECT jsonb_build_object(
  'captured_at', now(),
  'presence_parser_fixed', function_contracts.presence_parser_fixed,
  'trigger_parser_fixed', function_contracts.trigger_parser_fixed,
  'processor_invoker_fixed', function_contracts.processor_invoker_fixed,
  'parser_fixture',
    substring('(symbol,eq,ADBE,f)' FROM 'symbol,eq,([^,)]+)'),
  'queue_statuses', jsonb_build_object(
    'pending', queue_summary.pending_jobs,
    'processing', queue_summary.processing_jobs,
    'failed', queue_summary.failed_jobs
  ),
  'stale_processing_jobs', queue_summary.stale_processing_jobs,
  'active_malformed_symbol_jobs',
    queue_summary.active_malformed_symbol_jobs,
  'terminal_failures', failed_summary.failures,
  'quota_guard_active', public.is_quota_exceeded_v2(),
  'effective_usage_percentage',
    round(
      effective.current_usage_bytes::numeric
        / effective.quota_limit_bytes
        * 100,
      4
    ),
  'bytes_to_recovery_ceiling',
    (
      effective.quota_limit_bytes * effective.safety_buffer
    )::bigint - effective.current_usage_bytes,
  'temporary_recovery_cron_exists', EXISTS (
    SELECT 1
    FROM cron.job AS job
    WHERE job.jobname = 'controlled-fmp-queue-recovery-20260729'
  )
) AS fmp_recovery_tail_verification
FROM effective
CROSS JOIN queue_summary
CROSS JOIN failed_summary
CROSS JOIN function_contracts;
