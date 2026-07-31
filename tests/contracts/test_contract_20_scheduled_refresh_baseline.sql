-- Contract #20: Scheduled Durable-Data Baseline
-- Compass-critical durable inputs must receive full-universe scheduled
-- coverage. Presence may raise their priority, but quotes remain on demand.

BEGIN;
SELECT plan(18);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.data_type_registry_v2
    WHERE data_type IN (
      'profile',
      'financial-statements',
      'ratios-ttm',
      'insider-transactions',
      'insider-trading-statistics'
    )
      AND refresh_strategy = 'hybrid'
  ),
  5,
  'Contract #20: all durable Compass inputs use hybrid scheduled coverage'
);

SELECT is(
  (
    SELECT refresh_strategy
    FROM public.data_type_registry_v2
    WHERE data_type = 'quote'
  ),
  'on-demand',
  'Contract #20: quotes remain on demand'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'financial-statements'
  ),
  10080,
  'Contract #20: financial statements refresh weekly'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'profile'
  ),
  1440,
  'Contract #20: profiles refresh daily'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'ratios-ttm'
  ),
  1440,
  'Contract #20: ratios refresh daily'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'insider-transactions'
  ),
  2880,
  'Contract #20: insider transactions retain the 48-hour bandwidth-aware TTL'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'insider-trading-statistics'
  ),
  10080,
  'Contract #20: insider statistics refresh weekly'
);

SELECT ok(
  (
    SELECT pg_get_functiondef(procedure.oid)
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname =
          'check_and_queue_stale_data_from_presence_v2'
  ) ~* 'refresh_strategy\s+IN\s+\(''on-demand'',\s*''hybrid''\)',
  'Contract #20: presence remains a priority overlay for hybrid data'
);

SELECT ok(
  (
    SELECT pg_get_functiondef(procedure.oid)
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'queue_scheduled_refreshes_v2'
  ) ~* 'refresh_strategy\s+IN\s+\(''scheduled'',\s*''hybrid''\)',
  'Contract #20: scheduler covers scheduled and hybrid data'
);

SELECT ok(
  (
    SELECT pg_get_functiondef(procedure.oid)
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'queue_scheduled_refreshes_v2'
  ) ~* 'v_profile_exists'
  AND (
    SELECT pg_get_functiondef(procedure.oid)
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'queue_scheduled_refreshes_v2'
  ) ~* 'ARRAY\[''profile''\]',
  'Contract #20: scheduler bootstraps profiles before FK-dependent data'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'get_fmp_pipeline_cron_state_v2'
      AND procedure.prosecdef
  ),
  'Contract #20: filtered cron status is exposed through SECURITY DEFINER'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_fmp_pipeline_cron_state_v2()',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.get_fmp_pipeline_cron_state_v2()',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.get_fmp_pipeline_cron_state_v2()',
    'EXECUTE'
  ),
  'Contract #20: cron status surface is restricted to operations'
);

UPDATE public.listed_symbols
SET is_active = false;

DELETE FROM public.api_call_queue_v2
WHERE status IN ('pending', 'processing');

INSERT INTO public.listed_symbols (
  symbol,
  is_active,
  last_processed_at
)
VALUES
  ('SCHED_NOPROFILE', true, NULL),
  ('SCHED_WITHPROFILE', true, NULL)
ON CONFLICT (symbol) DO UPDATE
SET
  is_active = EXCLUDED.is_active,
  last_processed_at = EXCLUDED.last_processed_at;

INSERT INTO public.profiles (
  symbol,
  company_name,
  modified_at
)
VALUES (
  'SCHED_WITHPROFILE',
  'Scheduler Fixture',
  now()
)
ON CONFLICT (symbol) DO UPDATE
SET
  company_name = EXCLUDED.company_name,
  modified_at = EXCLUDED.modified_at;

SELECT is(
  public.queue_scheduled_refreshes_v2(),
  5,
  'Contract #20: fixture queues exactly the five stale durable inputs'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.api_call_queue_v2
    WHERE symbol = 'SCHED_NOPROFILE'
      AND status = 'pending'
  ),
  1,
  'Contract #20: a missing profile queues only the profile bootstrap'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.api_call_queue_v2
    WHERE symbol = 'SCHED_WITHPROFILE'
      AND status = 'pending'
  ),
  4,
  'Contract #20: an existing profile unlocks the four stale dependent inputs'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.api_call_queue_v2
    WHERE data_type = 'quote'
      AND status = 'pending'
  ),
  0,
  'Contract #20: the full-universe scheduler never queues quotes'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.api_call_queue_v2
    WHERE symbol IN ('SCHED_NOPROFILE', 'SCHED_WITHPROFILE')
      AND status = 'pending'
      AND priority = -1
  ),
  5,
  'Contract #20: every scheduled fixture job stays below demand priority'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.listed_symbols
    WHERE symbol IN ('SCHED_NOPROFILE', 'SCHED_WITHPROFILE')
      AND last_processed_at IS NOT NULL
  ),
  2,
  'Contract #20: round robin advances every checked symbol'
);

SELECT * FROM finish();
ROLLBACK;
