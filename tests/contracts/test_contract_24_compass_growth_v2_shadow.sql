-- Contract #24: Growth v2 is a read-only, service-only shadow model and does
-- not derive growth from PEG.

BEGIN;
SELECT plan(5);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'get_compass_growth_shadow_leaderboard_v2'
      AND procedure.provolatile = 's'
      AND NOT procedure.prosecdef
  ),
  'Contract #24: Growth v2 exists, is stable, and uses caller permissions'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])',
    'EXECUTE'
  ),
  'Contract #24: only service code can execute Growth v2 shadow ranking'
);

SELECT ok(
  position(
    'price_to_earnings_growth_ratio'
    IN pg_get_functiondef(
      'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])'::regprocedure
    )
  ) = 0
  AND position(
    'ratios_ttm'
    IN pg_get_functiondef(
      'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #24: Growth v2 has no PEG or ratios-table dependency'
);

SELECT ok(
  position(
    'api_call_queue_v2'
    IN pg_get_functiondef(
      'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])'::regprocedure
    )
  ) = 0
  AND position(
    'http_'
    IN pg_get_functiondef(
      'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #24: Growth v2 neither queues work nor invokes HTTP'
);

SELECT ok(
  position(
    'compass_pillar_scores'
    IN pg_get_functiondef(
      'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])'::regprocedure
    )
  ) > 0
  AND position(
    'financial_statements'
    IN pg_get_functiondef(
      'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #24: leaderboard reads use precomputed pillar scores'
);

SELECT * FROM finish();
ROLLBACK;
