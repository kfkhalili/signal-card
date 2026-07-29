-- P1.3 post-deployment verification.
-- Safe for the Supabase SQL Editor: catalog-only, no secrets decrypted and no
-- HTTP or Edge Function calls made.

SET statement_timeout = '30s';

WITH edge_callers AS (
  SELECT
    job.jobid,
    job.jobname,
    job.active,
    job.command ILIKE '%functions/v1/%' AS directly_calls_edge_function,
    job.command ILIKE '%''apikey''%' AS sends_apikey,
    job.command ILIKE '%''Authorization''%' AS sends_authorization,
    job.command ILIKE '%anon_key%' AS references_anon_key,
    job.command ILIKE '%supabase_service_role_key%'
      AS references_service_role_key,
    job.command ILIKE '%edge_functions_internal%'
      AS references_named_internal_key
  FROM cron.job AS job
  WHERE job.command ILIKE '%functions/v1/%'
     OR job.jobname = 'invoke-processor-v2'
),
caller_summary AS (
  SELECT
    COUNT(*) FILTER (
      WHERE caller.directly_calls_edge_function
    ) AS direct_caller_count,
    COALESCE(
      BOOL_AND(
        CASE
          WHEN caller.directly_calls_edge_function THEN
            caller.sends_apikey
            AND NOT caller.sends_authorization
            AND NOT caller.references_anon_key
            AND NOT caller.references_service_role_key
            AND caller.references_named_internal_key
          ELSE true
        END
      ),
      false
    ) AS direct_callers_secured,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'jobid', caller.jobid,
          'jobname', caller.jobname,
          'active', caller.active,
          'directly_calls_edge_function',
            caller.directly_calls_edge_function,
          'sends_apikey', caller.sends_apikey,
          'sends_authorization', caller.sends_authorization,
          'references_anon_key', caller.references_anon_key,
          'references_service_role_key',
            caller.references_service_role_key,
          'references_named_internal_key',
            caller.references_named_internal_key
        )
        ORDER BY caller.jobname
      ),
      '[]'::jsonb
    ) AS jobs
  FROM edge_callers AS caller
),
function_privileges AS (
  SELECT
    procedure.proname,
    pg_get_function_identity_arguments(procedure.oid) AS arguments,
    has_function_privilege(
      'anon',
      procedure.oid,
      'EXECUTE'
    ) AS anon_can_execute,
    has_function_privilege(
      'authenticated',
      procedure.oid,
      'EXECUTE'
    ) AS authenticated_can_execute,
    has_function_privilege(
      'service_role',
      procedure.oid,
      'EXECUTE'
    ) AS service_role_can_execute
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'handle_user_created_webhook',
      'invoke_edge_function_v2',
      'invoke_processor_if_healthy_v2',
      'invoke_processor_loop_v2'
    )
),
privilege_summary AS (
  SELECT
    COUNT(*) FILTER (
      WHERE privilege.proname IN (
        'invoke_edge_function_v2',
        'invoke_processor_if_healthy_v2',
        'invoke_processor_loop_v2'
      )
    ) = 3
      AND BOOL_AND(
        NOT privilege.anon_can_execute
        AND NOT privilege.authenticated_can_execute
        AND privilege.service_role_can_execute
      ) AS privileged_function_grants_secured,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'function', privilege.proname,
        'arguments', privilege.arguments,
        'anon_can_execute', privilege.anon_can_execute,
        'authenticated_can_execute',
          privilege.authenticated_can_execute,
        'service_role_can_execute', privilege.service_role_can_execute
      )
      ORDER BY privilege.proname, privilege.arguments
    ) AS functions
  FROM function_privileges AS privilege
),
invoker AS (
  SELECT
    pg_get_functiondef(procedure.oid) ILIKE
      '%edge_functions_internal%' AS references_named_internal_key,
    pg_get_functiondef(procedure.oid) ILIKE
      '%''apikey''%' AS sends_apikey,
    pg_get_functiondef(procedure.oid) ILIKE
      '%''Authorization''%' AS sends_authorization,
    pg_get_functiondef(procedure.oid) ILIKE
      '%supabase_service_role_key%' AS references_service_role_key,
    pg_get_functiondef(procedure.oid) ILIKE
      '%queue-processor-v2%' AS restricts_target_to_queue_processor
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'invoke_edge_function_v2'
),
verification AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM vault.secrets AS secret
      WHERE secret.name = 'edge_functions_internal'
    ) AS named_internal_key_exists,
    callers.direct_caller_count,
    callers.direct_callers_secured,
    callers.jobs,
    privileges.privileged_function_grants_secured,
    privileges.functions,
    COALESCE(
      invoker.references_named_internal_key
      AND invoker.sends_apikey
      AND NOT invoker.sends_authorization
      AND NOT invoker.references_service_role_key
      AND invoker.restricts_target_to_queue_processor,
      false
    ) AS invoker_secured,
    TO_JSONB(invoker) AS invoker
  FROM caller_summary AS callers
  CROSS JOIN privilege_summary AS privileges
  LEFT JOIN invoker
    ON true
)
SELECT JSONB_BUILD_OBJECT(
  'all_checks_pass',
    result.named_internal_key_exists
    AND result.direct_caller_count > 0
    AND result.direct_callers_secured
    AND result.privileged_function_grants_secured
    AND result.invoker_secured,
  'named_internal_key_exists', result.named_internal_key_exists,
  'direct_caller_count', result.direct_caller_count,
  'direct_callers_secured', result.direct_callers_secured,
  'jobs', result.jobs,
  'privileged_function_grants_secured',
    result.privileged_function_grants_secured,
  'function_privileges', result.functions,
  'invoker_secured', result.invoker_secured,
  'invoker', result.invoker
) AS verification
FROM verification AS result;
