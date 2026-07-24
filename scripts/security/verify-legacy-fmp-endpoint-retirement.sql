-- Read-only production caller check for eight legacy standalone FMP endpoints.
-- This query does not invoke cron, Edge Functions, the queue, or FMP.
-- fetch-fmp-exchange-prices-api is intentionally excluded because its bulk
-- exchange behavior has no one-to-one queue replacement.

WITH targets(slug) AS (
  VALUES
    ('fetch-fmp-profiles'),
    ('fetch-fmp-quote-indicators'),
    ('fetch-fmp-financial-statements'),
    ('fetch-fmp-ratios-ttm'),
    ('fetch-fmp-dividend-history'),
    ('fetch-fmp-revenue-segmentation'),
    ('fetch-fmp-grades-historical'),
    ('fetch-fmp-exchange-variants')
),
expected_queue_types(data_type) AS (
  VALUES
    ('profile'),
    ('quote'),
    ('financial-statements'),
    ('ratios-ttm'),
    ('dividend-history'),
    ('revenue-product-segmentation'),
    ('grades-historical'),
    ('exchange-variants')
),
cron_callers AS (
  SELECT DISTINCT
    j.jobid,
    j.jobname,
    t.slug
  FROM cron.job j
  JOIN targets t
    ON j.command ILIKE '%' || t.slug || '%'
    OR j.command ILIKE '%' || replace(t.slug, '-', '_') || '%'
),
database_function_callers AS (
  SELECT DISTINCT
    n.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    t.slug
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN targets t
    ON p.prosrc ILIKE '%' || t.slug || '%'
    OR p.prosrc ILIKE '%' || replace(t.slug, '-', '_') || '%'
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
),
missing_queue_types AS (
  SELECT e.data_type
  FROM expected_queue_types e
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.data_type_registry_v2 r
    WHERE r.data_type = e.data_type
  )
),
summary AS (
  SELECT
    (SELECT count(*) FROM cron_callers) AS cron_caller_count,
    (SELECT count(*) FROM database_function_callers)
      AS database_function_caller_count,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'jobid', jobid,
            'jobname', jobname,
            'target', slug
          )
          ORDER BY jobid, slug
        )
        FROM cron_callers
      ),
      '[]'::jsonb
    ) AS cron_callers,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'function',
              format('%I.%I(%s)', function_schema, function_name, arguments),
            'target', slug
          )
          ORDER BY function_schema, function_name, slug
        )
        FROM database_function_callers
      ),
      '[]'::jsonb
    ) AS database_function_callers,
    COALESCE(
      (
        SELECT jsonb_agg(data_type ORDER BY data_type)
        FROM missing_queue_types
      ),
      '[]'::jsonb
    ) AS missing_queue_types
)
SELECT jsonb_build_object(
  'verification', jsonb_build_object(
    'cron_caller_count', cron_caller_count,
    'database_function_caller_count', database_function_caller_count,
    'cron_callers', cron_callers,
    'database_function_callers', database_function_callers,
    'missing_queue_types', missing_queue_types,
    'queue_replacement_complete', jsonb_array_length(missing_queue_types) = 0,
    'safe_to_retire',
      cron_caller_count = 0
      AND database_function_caller_count = 0,
    'all_checks_pass',
      cron_caller_count = 0
      AND database_function_caller_count = 0
  )
) AS result
FROM summary;
