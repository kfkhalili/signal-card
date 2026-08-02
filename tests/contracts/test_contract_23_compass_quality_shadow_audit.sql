-- Contract #23: Compass quality audit is read-only and service-only.

BEGIN;
SELECT plan(4);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'get_compass_quality_shadow_audit'
      AND procedure.provolatile = 's'
      AND NOT procedure.prosecdef
  ),
  'Contract #23: shadow audit exists, is stable, and uses caller permissions'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])',
    'EXECUTE'
  ),
  'Contract #23: only service code can execute the shadow audit'
);

SELECT ok(
  position(
    'api_call_queue_v2'
    IN pg_get_functiondef(
      'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])'::regprocedure
    )
  ) = 0
  AND position(
    'http_'
    IN pg_get_functiondef(
      'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #23: shadow audit neither queues work nor invokes HTTP'
);

SELECT ok(
  pg_get_function_result(
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])'::regprocedure
  ) LIKE '%passes_provisional_gate boolean%'
  AND pg_get_function_result(
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])'::regprocedure
  ) LIKE '%gate_failures text[]%'
  AND pg_get_function_result(
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])'::regprocedure
  ) LIKE '%risk_flags text[]%',
  'Contract #23: shadow audit reports pass/fail reasons without changing rank'
);

SELECT * FROM finish();
ROLLBACK;
