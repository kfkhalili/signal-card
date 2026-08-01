-- Read-only production audit for negative-cache freshness, Compass source age,
-- FMP symbol-universe health, queue health, quota burn, and cron topology.
--
-- Safe to run in the Supabase SQL Editor:
--   * transaction is explicitly READ ONLY;
--   * no queue or cron functions are invoked;
--   * no Edge Function or FMP request is made;
--   * statement and lock timeouts bound production impact.
--
-- The query returns one JSONB value. Paste that value into the engineering
-- thread before changing TTLs or scheduler state.

BEGIN TRANSACTION READ ONLY;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '2s';

WITH
migration_state AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations AS migration
      WHERE migration.version = '20260730000000'
    ) AS negative_cache_migration_recorded,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations AS migration
      WHERE migration.version = '20260801050000'
    ) AS symbol_universe_migration_recorded
),
effective_quota AS (
  SELECT *
  FROM public.get_effective_quota_usage_v2()
),
quota_summary AS (
  SELECT jsonb_build_object(
    'calibration_id', quota.calibration_id,
    'calibrated_at', quota.calibrated_at,
    'is_calibrated', quota.is_calibrated,
    'quota_limit_bytes', quota.quota_limit_bytes,
    'current_usage_bytes', quota.current_usage_bytes,
    'effective_usage_percentage',
      round(
        quota.current_usage_bytes::numeric
          / NULLIF(quota.quota_limit_bytes, 0)
          * 100,
        4
      ),
    'safety_buffer', quota.safety_buffer,
    'buffered_quota_bytes',
      (quota.quota_limit_bytes * quota.safety_buffer)::bigint,
    'bytes_to_safety_ceiling',
      (quota.quota_limit_bytes * quota.safety_buffer)::bigint
        - quota.current_usage_bytes,
    'post_calibration_usage_bytes', quota.post_calibration_usage_bytes,
    'raw_ledger_usage_bytes', quota.raw_ledger_usage_bytes,
    'max_batch_jobs', quota.max_batch_jobs,
    'quota_guard_active',
      quota.current_usage_bytes
        >= (quota.quota_limit_bytes * quota.safety_buffer)::bigint
  ) AS value
  FROM effective_quota AS quota
),
usage_by_type_rows AS (
  SELECT
    COALESCE(usage.data_type, 'unattributed') AS data_type,
    count(*) FILTER (
      WHERE usage.recorded_at >= now() - interval '24 hours'
    ) AS observations_24h,
    COALESCE(sum(usage.data_size_bytes) FILTER (
      WHERE usage.recorded_at >= now() - interval '24 hours'
    ), 0)::bigint AS bytes_24h,
    count(*) FILTER (
      WHERE usage.recorded_at >= now() - interval '7 days'
    ) AS observations_7d,
    COALESCE(sum(usage.data_size_bytes) FILTER (
      WHERE usage.recorded_at >= now() - interval '7 days'
    ), 0)::bigint AS bytes_7d,
    count(*) AS observations_30d,
    COALESCE(sum(usage.data_size_bytes), 0)::bigint AS bytes_30d,
    COALESCE(sum(usage.data_size_bytes) FILTER (
      WHERE usage.outcome = 'success'
    ), 0)::bigint AS successful_bytes_30d,
    COALESCE(sum(usage.data_size_bytes) FILTER (
      WHERE usage.outcome = 'failure'
    ), 0)::bigint AS failed_bytes_30d
  FROM public.api_data_usage_v2 AS usage
  WHERE usage.recorded_at >= now() - interval '30 days'
  GROUP BY COALESCE(usage.data_type, 'unattributed')
),
usage_by_type AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'data_type', usage.data_type,
        'observations_24h', usage.observations_24h,
        'bytes_24h', usage.bytes_24h,
        'observations_7d', usage.observations_7d,
        'bytes_7d', usage.bytes_7d,
        'observations_30d', usage.observations_30d,
        'bytes_30d', usage.bytes_30d,
        'successful_bytes_30d', usage.successful_bytes_30d,
        'failed_bytes_30d', usage.failed_bytes_30d
      )
      ORDER BY usage.bytes_30d DESC, usage.data_type
    ),
    '[]'::jsonb
  ) AS value
  FROM usage_by_type_rows AS usage
),
queue_status_rows AS (
  SELECT queue.status, count(*) AS jobs
  FROM public.api_call_queue_v2 AS queue
  GROUP BY queue.status
),
queue_statuses AS (
  SELECT COALESCE(
    jsonb_object_agg(queue.status, queue.jobs),
    '{}'::jsonb
  ) AS value
  FROM queue_status_rows AS queue
),
active_queue_by_type_rows AS (
  SELECT
    queue.data_type,
    queue.status,
    count(*) AS jobs,
    min(queue.created_at) AS oldest_created_at,
    max(queue.created_at) AS newest_created_at,
    COALESCE(sum(queue.estimated_data_size_bytes), 0)::bigint
      AS estimated_bytes
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.status IN ('pending', 'processing')
  GROUP BY queue.data_type, queue.status
),
active_queue_by_type AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'data_type', queue.data_type,
        'status', queue.status,
        'jobs', queue.jobs,
        'oldest_created_at', queue.oldest_created_at,
        'newest_created_at', queue.newest_created_at,
        'estimated_bytes', queue.estimated_bytes
      )
      ORDER BY queue.data_type, queue.status
    ),
    '[]'::jsonb
  ) AS value
  FROM active_queue_by_type_rows AS queue
),
queue_health AS (
  SELECT
    count(*) FILTER (
      WHERE queue.status = 'processing'
        AND (
          queue.processed_at IS NULL
          OR queue.processed_at < now() - interval '5 minutes'
        )
    ) AS stale_processing_jobs,
    count(*) FILTER (
      WHERE queue.status = 'failed'
        AND queue.processed_at >= now() - interval '24 hours'
    ) AS failed_jobs_24h,
    count(*) FILTER (
      WHERE queue.status = 'completed'
        AND queue.processed_at >= now() - interval '24 hours'
    ) AS completed_jobs_24h,
    count(*) FILTER (
      WHERE queue.status IN ('pending', 'processing')
    ) AS active_jobs,
    COALESCE(sum(queue.estimated_data_size_bytes) FILTER (
      WHERE queue.status IN ('pending', 'processing')
    ), 0)::bigint AS active_estimated_bytes
  FROM public.api_call_queue_v2 AS queue
),
recent_failure_rows AS (
  SELECT
    queue.data_type,
    left(COALESCE(queue.error_message, '<no error>'), 240) AS error,
    count(*) AS jobs,
    max(queue.processed_at) AS latest_failure_at
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.status = 'failed'
    AND queue.processed_at >= now() - interval '24 hours'
  GROUP BY
    queue.data_type,
    left(COALESCE(queue.error_message, '<no error>'), 240)
),
recent_failures AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'data_type', failure.data_type,
        'error', failure.error,
        'jobs', failure.jobs,
        'latest_failure_at', failure.latest_failure_at
      )
      ORDER BY failure.jobs DESC, failure.data_type, failure.error
    ),
    '[]'::jsonb
  ) AS value
  FROM recent_failure_rows AS failure
),
freshness_totals AS (
  SELECT
    count(*) AS total_records,
    count(*) FILTER (WHERE freshness.result_kind = 'data')
      AS data_records,
    count(*) FILTER (WHERE freshness.result_kind = 'empty')
      AS empty_records,
    min(freshness.last_success_at) AS first_success_at,
    max(freshness.last_success_at) AS latest_success_at
  FROM public.data_fetch_freshness_v2 AS freshness
),
freshness_by_type_rows AS (
  SELECT
    freshness.data_type,
    freshness.result_kind,
    registry.default_ttl_minutes AS ttl_minutes,
    count(*) AS records,
    count(*) FILTER (
      WHERE freshness.last_success_at
        >= now() - registry.default_ttl_minutes * interval '1 minute'
    ) AS currently_fresh_records,
    min(freshness.last_success_at) AS oldest_success_at,
    max(freshness.last_success_at) AS latest_success_at,
    COALESCE(sum(freshness.response_size_bytes), 0)::bigint
      AS recorded_response_bytes
  FROM public.data_fetch_freshness_v2 AS freshness
  INNER JOIN public.data_type_registry_v2 AS registry
    ON registry.data_type = freshness.data_type
  GROUP BY
    freshness.data_type,
    freshness.result_kind,
    registry.default_ttl_minutes
),
freshness_by_type AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'data_type', freshness.data_type,
        'result_kind', freshness.result_kind,
        'ttl_minutes', freshness.ttl_minutes,
        'records', freshness.records,
        'currently_fresh_records', freshness.currently_fresh_records,
        'oldest_success_at', freshness.oldest_success_at,
        'latest_success_at', freshness.latest_success_at,
        'recorded_response_bytes', freshness.recorded_response_bytes
      )
      ORDER BY freshness.data_type, freshness.result_kind
    ),
    '[]'::jsonb
  ) AS value
  FROM freshness_by_type_rows AS freshness
),
fresh_empty_requeues AS (
  SELECT count(DISTINCT queue.id) AS active_jobs
  FROM public.data_fetch_freshness_v2 AS freshness
  INNER JOIN public.data_type_registry_v2 AS registry
    ON registry.data_type = freshness.data_type
  INNER JOIN public.api_call_queue_v2 AS queue
    ON queue.symbol = freshness.symbol
   AND queue.data_type = freshness.data_type
   AND queue.status IN ('pending', 'processing')
  WHERE freshness.result_kind = 'empty'
    AND freshness.last_success_at
      >= now() - registry.default_ttl_minutes * interval '1 minute'
    AND queue.created_at >= freshness.last_success_at
),
recent_empty_completion_match AS (
  SELECT
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.api_call_queue_v2 AS completed
        WHERE completed.symbol = freshness.symbol
          AND completed.data_type = freshness.data_type
          AND completed.status = 'completed'
          AND completed.processed_at
            BETWEEN freshness.last_success_at
                AND freshness.last_success_at + interval '10 minutes'
      )
    ) AS matched_recent_empty_records,
    count(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.api_call_queue_v2 AS completed
        WHERE completed.symbol = freshness.symbol
          AND completed.data_type = freshness.data_type
          AND completed.status = 'completed'
          AND completed.processed_at
            BETWEEN freshness.last_success_at
                AND freshness.last_success_at + interval '10 minutes'
      )
    ) AS unmatched_recent_empty_records
  FROM public.data_fetch_freshness_v2 AS freshness
  WHERE freshness.result_kind = 'empty'
    AND freshness.last_success_at >= now() - interval '24 hours'
),
symbol_universe_state AS (
  SELECT
    (
      SELECT jsonb_build_object(
        'id', run.id,
        'captured_at', run.captured_at,
        'active_symbol_count', run.active_symbol_count,
        'stock_symbol_count', run.stock_symbol_count,
        'symbol_change_count', run.symbol_change_count,
        'delisted_company_count', run.delisted_company_count,
        'delisted_active_conflict_count',
          run.delisted_active_conflict_count,
        'response_bytes', run.response_bytes
      )
      FROM public.fmp_symbol_universe_runs AS run
      ORDER BY run.captured_at DESC
      LIMIT 1
    ) AS latest_run,
    (
      SELECT run.captured_at
      FROM public.fmp_symbol_universe_runs AS run
      ORDER BY run.captured_at DESC
      LIMIT 1
    ) AS latest_run_at,
    count(*) FILTER (
      WHERE status.is_actively_trading = true
    ) AS provider_active_symbols,
    count(*) FILTER (
      WHERE status.is_actively_trading = false
    ) AS provider_inactive_symbols,
    count(*) FILTER (
      WHERE status.is_actively_trading IS NULL
    ) AS provider_unknown_symbols,
    (
      SELECT count(*)
      FROM public.listed_symbols AS listed
      WHERE listed.is_active = true
    ) AS curated_active_symbols,
    (
      SELECT count(*)
      FROM public.listed_symbols AS listed
      WHERE listed.is_active = true
        AND listed.fmp_is_actively_trading IS DISTINCT FROM false
    ) AS compass_eligible_symbols,
    (
      SELECT count(*)
      FROM public.listed_symbols AS listed
      WHERE listed.is_active = true
        AND listed.fmp_is_actively_trading = false
    ) AS provider_suppressed_symbols,
    (
      SELECT count(*)
      FROM public.data_quality_issues AS issue
      WHERE issue.symbol = '__FMP_SYMBOL_UNIVERSE__'
        AND issue.provider = 'fmp'
        AND issue.check_code = 'invalid_symbol_universe_snapshot'
        AND issue.status = 'open'
    ) AS open_quality_issues
  FROM public.fmp_symbol_status AS status
),
compass_symbols AS (
  SELECT scores.symbol
  FROM public.compass_pillar_scores AS scores
  INNER JOIN public.listed_symbols AS listed
    ON listed.symbol = scores.symbol
   AND listed.is_active = true
   AND listed.fmp_is_actively_trading IS DISTINCT FROM false
),
compass_source_latest AS (
  SELECT
    compass.symbol,
    'profile'::text AS data_type,
    max(profile.modified_at) AS latest_source_at
  FROM compass_symbols AS compass
  LEFT JOIN public.profiles AS profile
    ON profile.symbol = compass.symbol
  GROUP BY compass.symbol

  UNION ALL

  SELECT
    compass.symbol,
    'financial-statements'::text AS data_type,
    max(statement.fetched_at) AS latest_source_at
  FROM compass_symbols AS compass
  LEFT JOIN public.financial_statements AS statement
    ON statement.symbol = compass.symbol
  GROUP BY compass.symbol

  UNION ALL

  SELECT
    compass.symbol,
    'ratios-ttm'::text AS data_type,
    max(ratio.fetched_at) AS latest_source_at
  FROM compass_symbols AS compass
  LEFT JOIN public.ratios_ttm AS ratio
    ON ratio.symbol = compass.symbol
  GROUP BY compass.symbol

  UNION ALL

  SELECT
    compass.symbol,
    'insider-transactions'::text AS data_type,
    max(transaction.fetched_at) AS latest_source_at
  FROM compass_symbols AS compass
  LEFT JOIN public.insider_transactions AS transaction
    ON transaction.symbol = compass.symbol
  GROUP BY compass.symbol
),
compass_source_age_rows AS (
  SELECT
    source.data_type,
    registry.default_ttl_minutes AS ttl_minutes,
    count(*) AS compass_symbols,
    count(source.latest_source_at) AS symbols_with_data,
    count(*) FILTER (WHERE source.latest_source_at IS NULL)
      AS symbols_missing_data,
    count(*) FILTER (
      WHERE source.latest_source_at
        >= now() - registry.default_ttl_minutes * interval '1 minute'
    ) AS symbols_within_ttl,
    round((
      percentile_cont(0.50) WITHIN GROUP (
        ORDER BY extract(epoch FROM now() - source.latest_source_at) / 60
      ) FILTER (WHERE source.latest_source_at IS NOT NULL)
    )::numeric, 1) AS p50_age_minutes,
    round((
      percentile_cont(0.95) WITHIN GROUP (
        ORDER BY extract(epoch FROM now() - source.latest_source_at) / 60
      ) FILTER (WHERE source.latest_source_at IS NOT NULL)
    )::numeric, 1) AS p95_age_minutes,
    round((
      max(extract(epoch FROM now() - source.latest_source_at) / 60)
        FILTER (WHERE source.latest_source_at IS NOT NULL)
    )::numeric, 1) AS maximum_age_minutes
  FROM compass_source_latest AS source
  INNER JOIN public.data_type_registry_v2 AS registry
    ON registry.data_type = source.data_type
  GROUP BY source.data_type, registry.default_ttl_minutes
),
compass_source_ages AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'data_type', source.data_type,
        'ttl_minutes', source.ttl_minutes,
        'compass_symbols', source.compass_symbols,
        'symbols_with_data', source.symbols_with_data,
        'symbols_missing_data', source.symbols_missing_data,
        'symbols_within_ttl', source.symbols_within_ttl,
        'p50_age_minutes', source.p50_age_minutes,
        'p95_age_minutes', source.p95_age_minutes,
        'maximum_age_minutes', source.maximum_age_minutes
      )
      ORDER BY source.data_type
    ),
    '[]'::jsonb
  ) AS value
  FROM compass_source_age_rows AS source
),
compass_state AS (
  SELECT
    count(*) AS scored_symbols,
    min(scores.updated_at) AS oldest_score_at,
    max(scores.updated_at) AS newest_score_at,
    public.get_compass_freshness() AS last_successful_refresh_at
  FROM public.compass_pillar_scores AS scores
  INNER JOIN public.listed_symbols AS listed
    ON listed.symbol = scores.symbol
   AND listed.is_active = true
   AND listed.fmp_is_actively_trading IS DISTINCT FROM false
),
cron_health_rows AS (
  SELECT
    job.jobid,
    job.jobname,
    job.active,
    job.schedule,
    max(run.end_time) FILTER (
      WHERE run.status = 'succeeded'
    ) AS last_succeeded_at,
    max(run.end_time) FILTER (
      WHERE run.status = 'failed'
    ) AS last_failed_at,
    count(*) FILTER (
      WHERE run.status = 'failed'
        AND run.start_time >= now() - interval '24 hours'
    ) AS failed_runs_24h
  FROM cron.job AS job
  LEFT JOIN cron.job_run_details AS run
    ON run.jobid = job.jobid
   AND run.start_time >= now() - interval '7 days'
  WHERE job.jobname IN (
      'check-stale-data-v2',
      'queue-scheduled-refreshes-v2',
      'invoke-processor-v2',
      'refresh-compass-leaderboard-mv',
      'sync-fmp-symbol-universe-v2'
    )
    OR job.jobname LIKE 'controlled-fmp-%'
  GROUP BY job.jobid, job.jobname, job.active, job.schedule
),
cron_health AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'jobid', cron.jobid,
        'jobname', cron.jobname,
        'active', cron.active,
        'schedule', cron.schedule,
        'last_succeeded_at', cron.last_succeeded_at,
        'last_failed_at', cron.last_failed_at,
        'failed_runs_24h', cron.failed_runs_24h
      )
      ORDER BY cron.jobname
    ),
    '[]'::jsonb
  ) AS value
  FROM cron_health_rows AS cron
),
cron_topology AS (
  SELECT
    count(*) FILTER (
      WHERE cron.active
        AND (
          cron.jobname = 'invoke-processor-v2'
          OR cron.jobname LIKE 'controlled-fmp-%'
        )
    ) AS active_processor_paths,
    count(*) FILTER (
      WHERE cron.active
        AND cron.jobname = 'check-stale-data-v2'
    ) AS active_presence_queue_paths,
    count(*) FILTER (
      WHERE cron.active
        AND cron.jobname = 'queue-scheduled-refreshes-v2'
    ) AS active_scheduled_queue_paths,
    count(*) FILTER (
      WHERE cron.active
        AND cron.jobname = 'refresh-compass-leaderboard-mv'
    ) AS active_compass_refresh_paths,
    count(*) FILTER (
      WHERE cron.active
        AND cron.jobname = 'sync-fmp-symbol-universe-v2'
    ) AS active_symbol_universe_sync_paths
  FROM cron_health_rows AS cron
),
readiness AS (
  SELECT jsonb_build_object(
    'negative_cache_migration_recorded',
      migration.negative_cache_migration_recorded,
    'negative_cache_observed',
      freshness.total_records > 0,
    'symbol_universe_migration_recorded',
      migration.symbol_universe_migration_recorded,
    'symbol_universe_snapshot_observed',
      symbol_universe.latest_run_at IS NOT NULL,
    'symbol_universe_sync_under_26_hours',
      symbol_universe.latest_run_at IS NOT NULL
      AND symbol_universe.latest_run_at >= now() - interval '26 hours',
    'no_open_symbol_universe_issues',
      symbol_universe.open_quality_issues = 0,
    'single_symbol_universe_sync_path',
      cron.active_symbol_universe_sync_paths = 1,
    'valid_empty_response_observed',
      freshness.empty_records > 0,
    'no_fresh_empty_requeues',
      requeues.active_jobs = 0,
    'recent_empty_records_have_completion_evidence',
      completion.unmatched_recent_empty_records = 0,
    'no_stale_processing_jobs',
      queue.stale_processing_jobs = 0,
    'single_processor_path',
      cron.active_processor_paths <= 1,
    'compass_refresh_active',
      cron.active_compass_refresh_paths = 1,
    'compass_refresh_under_120_minutes',
      compass.last_successful_refresh_at IS NOT NULL
      AND compass.last_successful_refresh_at
        >= now() - interval '120 minutes',
    'quota_below_configured_safety_ceiling',
      quota.current_usage_bytes
        < (quota.quota_limit_bytes * quota.safety_buffer)::bigint,
    'ready_for_ttl_decision',
      migration.negative_cache_migration_recorded
      AND migration.symbol_universe_migration_recorded
      AND freshness.empty_records > 0
      AND symbol_universe.latest_run_at IS NOT NULL
      AND symbol_universe.latest_run_at >= now() - interval '26 hours'
      AND symbol_universe.open_quality_issues = 0
      AND requeues.active_jobs = 0
      AND completion.unmatched_recent_empty_records = 0
      AND queue.stale_processing_jobs = 0
      AND cron.active_processor_paths <= 1
      AND cron.active_symbol_universe_sync_paths = 1
      AND cron.active_compass_refresh_paths = 1
      AND compass.last_successful_refresh_at IS NOT NULL
      AND compass.last_successful_refresh_at
        >= now() - interval '120 minutes'
      AND quota.current_usage_bytes
        < (quota.quota_limit_bytes * quota.safety_buffer)::bigint
  ) AS value
  FROM migration_state AS migration
  CROSS JOIN freshness_totals AS freshness
  CROSS JOIN fresh_empty_requeues AS requeues
  CROSS JOIN recent_empty_completion_match AS completion
  CROSS JOIN symbol_universe_state AS symbol_universe
  CROSS JOIN queue_health AS queue
  CROSS JOIN cron_topology AS cron
  CROSS JOIN compass_state AS compass
  CROSS JOIN effective_quota AS quota
)
SELECT jsonb_build_object(
  'captured_at', now(),
  'read_only', true,
  'fmp_calls_made', 0,
  'readiness', readiness.value,
  'quota', quota.value,
  'usage_by_data_type', usage.value,
  'queue', jsonb_build_object(
    'statuses', statuses.value,
    'active_by_type', active_queue.value,
    'stale_processing_jobs', queue_health.stale_processing_jobs,
    'failed_jobs_24h', queue_health.failed_jobs_24h,
    'completed_jobs_24h', queue_health.completed_jobs_24h,
    'active_jobs', queue_health.active_jobs,
    'active_estimated_bytes', queue_health.active_estimated_bytes,
    'recent_failures', failures.value
  ),
  'negative_cache', jsonb_build_object(
    'total_records', freshness.total_records,
    'data_records', freshness.data_records,
    'empty_records', freshness.empty_records,
    'first_success_at', freshness.first_success_at,
    'latest_success_at', freshness.latest_success_at,
    'by_type', freshness_types.value,
    'fresh_empty_active_requeues', requeues.active_jobs,
    'matched_recent_empty_records',
      completion.matched_recent_empty_records,
    'unmatched_recent_empty_records',
      completion.unmatched_recent_empty_records
  ),
  'symbol_universe', jsonb_build_object(
    'latest_run', symbol_universe.latest_run,
    'latest_run_age_minutes',
      CASE
        WHEN symbol_universe.latest_run_at IS NULL THEN NULL
        ELSE round((
          extract(epoch FROM now() - symbol_universe.latest_run_at) / 60
        )::numeric, 1)
      END,
    'provider_active_symbols',
      symbol_universe.provider_active_symbols,
    'provider_inactive_symbols',
      symbol_universe.provider_inactive_symbols,
    'provider_unknown_symbols',
      symbol_universe.provider_unknown_symbols,
    'curated_active_symbols',
      symbol_universe.curated_active_symbols,
    'compass_eligible_symbols',
      symbol_universe.compass_eligible_symbols,
    'provider_suppressed_symbols',
      symbol_universe.provider_suppressed_symbols,
    'open_quality_issues',
      symbol_universe.open_quality_issues
  ),
  'compass', jsonb_build_object(
    'scored_symbols', compass.scored_symbols,
    'oldest_score_at', compass.oldest_score_at,
    'newest_score_at', compass.newest_score_at,
    'last_successful_refresh_at', compass.last_successful_refresh_at,
    'refresh_age_minutes',
      CASE
        WHEN compass.last_successful_refresh_at IS NULL THEN NULL
        ELSE round((
          extract(
            epoch FROM now() - compass.last_successful_refresh_at
          ) / 60
        )::numeric, 1)
      END,
    'source_ages', source_ages.value
  ),
  'cron', jsonb_build_object(
    'active_processor_paths', cron_topology.active_processor_paths,
    'active_presence_queue_paths',
      cron_topology.active_presence_queue_paths,
    'active_scheduled_queue_paths',
      cron_topology.active_scheduled_queue_paths,
    'active_compass_refresh_paths',
      cron_topology.active_compass_refresh_paths,
    'active_symbol_universe_sync_paths',
      cron_topology.active_symbol_universe_sync_paths,
    'jobs', cron.value
  )
) AS production_freshness_ttl_audit
FROM readiness
CROSS JOIN quota_summary AS quota
CROSS JOIN usage_by_type AS usage
CROSS JOIN queue_statuses AS statuses
CROSS JOIN active_queue_by_type AS active_queue
CROSS JOIN queue_health
CROSS JOIN recent_failures AS failures
CROSS JOIN freshness_totals AS freshness
CROSS JOIN freshness_by_type AS freshness_types
CROSS JOIN fresh_empty_requeues AS requeues
CROSS JOIN recent_empty_completion_match AS completion
CROSS JOIN symbol_universe_state AS symbol_universe
CROSS JOIN compass_state AS compass
CROSS JOIN compass_source_ages AS source_ages
CROSS JOIN cron_topology
CROSS JOIN cron_health AS cron;

COMMIT;
