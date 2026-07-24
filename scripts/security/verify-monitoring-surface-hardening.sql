-- Read-only production verification for
-- 20260724020000_harden_monitoring_surfaces.sql.

WITH function_checks AS (
  SELECT
    function_name,
    anon_can_execute,
    authenticated_can_execute,
    service_role_can_execute,
    has_empty_search_path
  FROM (
    VALUES
      (
        'check_cron_job_health(text[])',
        has_function_privilege(
          'anon',
          'public.check_cron_job_health(text[])',
          'EXECUTE'
        ),
        has_function_privilege(
          'authenticated',
          'public.check_cron_job_health(text[])',
          'EXECUTE'
        ),
        has_function_privilege(
          'service_role',
          'public.check_cron_job_health(text[])',
          'EXECUTE'
        ),
        (
          SELECT 'search_path=""' = ANY (COALESCE(proconfig, ARRAY[]::text[]))
          FROM pg_proc
          WHERE oid = 'public.check_cron_job_health(text[])'::regprocedure
        )
      ),
      (
        'check_queue_success_rate_alert()',
        has_function_privilege(
          'anon',
          'public.check_queue_success_rate_alert()',
          'EXECUTE'
        ),
        has_function_privilege(
          'authenticated',
          'public.check_queue_success_rate_alert()',
          'EXECUTE'
        ),
        has_function_privilege(
          'service_role',
          'public.check_queue_success_rate_alert()',
          'EXECUTE'
        ),
        (
          SELECT 'search_path=""' = ANY (COALESCE(proconfig, ARRAY[]::text[]))
          FROM pg_proc
          WHERE oid =
            'public.check_queue_success_rate_alert()'::regprocedure
        )
      ),
      (
        'check_quota_usage_alert()',
        has_function_privilege(
          'anon',
          'public.check_quota_usage_alert()',
          'EXECUTE'
        ),
        has_function_privilege(
          'authenticated',
          'public.check_quota_usage_alert()',
          'EXECUTE'
        ),
        has_function_privilege(
          'service_role',
          'public.check_quota_usage_alert()',
          'EXECUTE'
        ),
        (
          SELECT 'search_path=""' = ANY (COALESCE(proconfig, ARRAY[]::text[]))
          FROM pg_proc
          WHERE oid = 'public.check_quota_usage_alert()'::regprocedure
        )
      ),
      (
        'check_stuck_jobs_alert()',
        has_function_privilege(
          'anon',
          'public.check_stuck_jobs_alert()',
          'EXECUTE'
        ),
        has_function_privilege(
          'authenticated',
          'public.check_stuck_jobs_alert()',
          'EXECUTE'
        ),
        has_function_privilege(
          'service_role',
          'public.check_stuck_jobs_alert()',
          'EXECUTE'
        ),
        (
          SELECT 'search_path=""' = ANY (COALESCE(proconfig, ARRAY[]::text[]))
          FROM pg_proc
          WHERE oid = 'public.check_stuck_jobs_alert()'::regprocedure
        )
      )
  ) AS checks(
    function_name,
    anon_can_execute,
    authenticated_can_execute,
    service_role_can_execute,
    has_empty_search_path
  )
),
table_checks AS (
  SELECT
    (
      has_table_privilege('anon', 'public.cron_health_logs', 'SELECT')
      OR has_table_privilege('anon', 'public.cron_health_logs', 'INSERT')
      OR has_table_privilege('anon', 'public.cron_health_logs', 'UPDATE')
    ) AS anon_has_access,
    (
      has_table_privilege(
        'authenticated',
        'public.cron_health_logs',
        'SELECT'
      )
      OR has_table_privilege(
        'authenticated',
        'public.cron_health_logs',
        'INSERT'
      )
      OR has_table_privilege(
        'authenticated',
        'public.cron_health_logs',
        'UPDATE'
      )
    ) AS authenticated_has_access,
    has_table_privilege(
      'service_role',
      'public.cron_health_logs',
      'SELECT'
    )
    AND has_table_privilege(
      'service_role',
      'public.cron_health_logs',
      'INSERT'
    )
    AND has_table_privilege(
      'service_role',
      'public.cron_health_logs',
      'UPDATE'
    ) AS service_role_has_access
),
active_job_filter AS (
  SELECT
    pg_get_functiondef(
      'public.check_cron_job_health(text[])'::regprocedure
    ) ILIKE '%jobs.active%' AS filters_to_active_jobs
)
SELECT jsonb_build_object(
  'verification',
  jsonb_build_object(
    'all_checks_pass',
      (
        SELECT bool_and(
          NOT anon_can_execute
          AND NOT authenticated_can_execute
          AND service_role_can_execute
          AND has_empty_search_path
        )
        FROM function_checks
      )
      AND NOT table_checks.anon_has_access
      AND NOT table_checks.authenticated_has_access
      AND table_checks.service_role_has_access
      AND active_job_filter.filters_to_active_jobs,
    'functions',
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'function', function_name,
            'anon_can_execute', anon_can_execute,
            'authenticated_can_execute', authenticated_can_execute,
            'service_role_can_execute', service_role_can_execute,
            'has_empty_search_path', has_empty_search_path
          )
          ORDER BY function_name
        )
        FROM function_checks
      ),
    'cron_health_logs',
      jsonb_build_object(
        'anon_has_access', table_checks.anon_has_access,
        'authenticated_has_access', table_checks.authenticated_has_access,
        'service_role_has_access', table_checks.service_role_has_access
      ),
    'health_check_filters_to_active_jobs',
      active_job_filter.filters_to_active_jobs
  )
)
FROM table_checks
CROSS JOIN active_job_filter;
