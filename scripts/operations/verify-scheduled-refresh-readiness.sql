\set ON_ERROR_STOP on

-- READ-ONLY production readiness report.
--
-- Run after:
--   1. migration 20260731000000 is applied;
--   2. queue-processor-v2 is deployed with the durable empty-response fixes;
--   3. a current FMP endpoint snapshot is recorded with a 90% safety buffer
--      and a 50-job maximum batch.
--
-- This script does not queue jobs, invoke an Edge Function, alter cron, or call
-- FMP.

WITH effective AS (
  SELECT *
  FROM public.get_effective_quota_usage_v2()
),
calibration AS (
  SELECT
    snapshot.id,
    snapshot.captured_at,
    snapshot.dashboard_headline_usage_gib,
    snapshot.dashboard_limit_bytes,
    snapshot.safety_buffer,
    snapshot.max_batch_jobs
  FROM public.fmp_quota_calibrations AS snapshot
  WHERE snapshot.active
  ORDER BY snapshot.id DESC
  LIMIT 1
),
queue_summary AS (
  SELECT
    count(*) FILTER (WHERE queue.status = 'pending') AS pending_jobs,
    count(*) FILTER (WHERE queue.status = 'processing') AS processing_jobs,
    count(*) FILTER (
      WHERE queue.status = 'processing'
        AND queue.processed_at < now() - interval '5 minutes'
    ) AS stale_processing_jobs
  FROM public.api_call_queue_v2 AS queue
),
cron_summary AS (
  SELECT
    count(*) FILTER (
      WHERE job.active
        AND (
          job.jobname = 'invoke-processor-v2'
          OR job.jobname LIKE 'controlled-fmp-live-processing-%'
        )
    ) AS active_processor_paths,
    bool_or(
      job.jobname = 'queue-scheduled-refreshes-v2'
      AND job.active
    ) AS scheduled_refresh_active,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'jobid', job.jobid,
          'jobname', job.jobname,
          'schedule', job.schedule,
          'active', job.active
        )
        ORDER BY job.jobid
      ) FILTER (
        WHERE job.jobname IN (
          'queue-scheduled-refreshes-v2',
          'invoke-processor-v2'
        )
        OR job.jobname LIKE 'controlled-fmp-live-processing-%'
      ),
      '[]'::jsonb
    ) AS relevant_jobs
  FROM public.get_fmp_pipeline_cron_state_v2() AS job
),
registry AS (
  SELECT
    count(*) FILTER (
      WHERE data_type IN (
        'profile',
        'financial-statements',
        'ratios-ttm',
        'insider-transactions',
        'insider-trading-statistics'
      )
        AND refresh_strategy = 'hybrid'
    ) AS hybrid_durable_types,
    bool_and(refresh_strategy = 'on-demand') FILTER (
      WHERE data_type = 'quote'
    ) AS quote_on_demand,
    jsonb_object_agg(
      data_type,
      jsonb_build_object(
        'strategy', refresh_strategy,
        'ttl_minutes', default_ttl_minutes
      )
      ORDER BY data_type
    ) FILTER (
      WHERE data_type IN (
        'profile',
        'quote',
        'financial-statements',
        'ratios-ttm',
        'insider-transactions',
        'insider-trading-statistics'
      )
    ) AS policy
  FROM public.data_type_registry_v2
),
facts AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations AS migration
      WHERE migration.version = '20260731000000'
    ) AS migration_recorded,
    effective.*,
    calibration.id AS current_calibration_id,
    calibration.captured_at AS current_calibration_at,
    calibration.dashboard_headline_usage_gib,
    queue_summary.*,
    cron_summary.*,
    registry.*
  FROM effective
  LEFT JOIN calibration ON true
  CROSS JOIN queue_summary
  CROSS JOIN cron_summary
  CROSS JOIN registry
)
SELECT jsonb_build_object(
  'captured_at', now(),
  'ready_for_scheduled_activation',
    facts.migration_recorded
    AND facts.is_calibrated
    AND facts.current_calibration_at >= now() - interval '6 hours'
    AND facts.safety_buffer = 0.90
    AND facts.max_batch_jobs = 50
    AND facts.current_usage_bytes
        < (facts.quota_limit_bytes * facts.safety_buffer)::bigint
    AND facts.pending_jobs = 0
    AND facts.processing_jobs = 0
    AND facts.stale_processing_jobs = 0
    AND facts.active_processor_paths = 1
    AND NOT COALESCE(facts.scheduled_refresh_active, false)
    AND facts.hybrid_durable_types = 5
    AND facts.quote_on_demand,
  'migration_recorded', facts.migration_recorded,
  'calibration', jsonb_build_object(
    'id', facts.current_calibration_id,
    'captured_at', facts.current_calibration_at,
    'dashboard_headline_usage_gib',
      facts.dashboard_headline_usage_gib,
    'limit_gib',
      round(
        facts.quota_limit_bytes::numeric
          / 1024 / 1024 / 1024,
        2
      ),
    'effective_usage_percentage',
      round(
        facts.current_usage_bytes::numeric
          / facts.quota_limit_bytes
          * 100,
        4
      ),
    'safety_buffer', facts.safety_buffer,
    'max_batch_jobs', facts.max_batch_jobs,
    'bytes_to_safety_ceiling',
      (facts.quota_limit_bytes * facts.safety_buffer)::bigint
        - facts.current_usage_bytes
  ),
  'queue', jsonb_build_object(
    'pending', facts.pending_jobs,
    'processing', facts.processing_jobs,
    'stale_processing', facts.stale_processing_jobs
  ),
  'cron', jsonb_build_object(
    'active_processor_paths', facts.active_processor_paths,
    'scheduled_refresh_active',
      COALESCE(facts.scheduled_refresh_active, false),
    'jobs', facts.relevant_jobs
  ),
  'registry', jsonb_build_object(
    'hybrid_durable_types', facts.hybrid_durable_types,
    'quote_on_demand', facts.quote_on_demand,
    'policy', facts.policy
  )
) AS scheduled_refresh_readiness
FROM facts;
