-- P1.2 production caller inventory.
--
-- Safety properties:
-- - Contains only catalog SELECTs plus a session-local statement timeout.
-- - Does not invoke an Edge Function, database function, webhook, or cron job.
-- - Reads Vault metadata from vault.secrets, never vault.decrypted_secrets.
-- - Returns fingerprints and authentication indicators instead of SQL bodies,
--   headers, URLs, encrypted values, or decrypted secret values.

SET statement_timeout = '30s';

WITH
cron_callers AS (
  SELECT
    job.jobid,
    job.jobname,
    job.schedule,
    job.active,
    job.database,
    job.username,
    (
      regexp_match(
        job.command,
        $regex$/functions/v1/([A-Za-z0-9_-]+)$regex$
      )
    )[1] AS direct_edge_function,
    (
      regexp_match(
        job.command,
        $regex$invoke_edge_function_v2\s*\(\s*'([A-Za-z0-9_-]+)'$regex$,
        'i'
      )
    )[1] AS invoker_edge_function,
    (
      regexp_match(
        job.command,
        $regex$(?:select|perform)\s+(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\s*\($regex$,
        'i'
      )
    )[1] AS database_entrypoint,
    job.command ILIKE '%anon_key%' AS references_anon_key_name,
    job.command ILIKE '%supabase_service_role_key%'
      AS references_service_role_key_name,
    job.command ILIKE '%apikey%' AS mentions_apikey_header,
    job.command ILIKE '%authorization%' AS mentions_authorization_header,
    md5(job.command) AS command_fingerprint
  FROM cron.job AS job
),
vault_secret_names AS (
  SELECT
    COALESCE(secret.name, '<unnamed>') AS name,
    secret.created_at,
    secret.updated_at
  FROM vault.secrets AS secret
),
function_sources AS (
  SELECT
    namespace.nspname AS function_schema,
    procedure.proname AS function_name,
    pg_get_function_identity_arguments(procedure.oid) AS identity_arguments,
    procedure.prosecdef AS security_definer,
    pg_get_functiondef(procedure.oid) AS definition
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE procedure.prokind = 'f'
    AND namespace.nspname IN ('auth', 'public', 'supabase_functions')
),
http_capable_functions AS (
  SELECT
    source.function_schema,
    source.function_name,
    source.identity_arguments,
    source.security_definer,
    (
      regexp_match(
        source.definition,
        $regex$/functions/v1/([A-Za-z0-9_-]+)$regex$
      )
    )[1] AS static_edge_function,
    source.definition ILIKE '%net.http_post%'
      OR source.definition ILIKE '%net.http_get%'
      OR source.definition ILIKE '%supabase_functions.http_request%'
      AS calls_http_primitive,
    source.definition ILIKE '%invoke_edge_function_v2%'
      AS calls_edge_invoker,
    source.definition ILIKE '%vault.decrypted_secrets%'
      AS reads_decrypted_vault_view,
    source.definition ILIKE '%anon_key%' AS references_anon_key_name,
    source.definition ILIKE '%supabase_service_role_key%'
      AS references_service_role_key_name,
    source.definition ILIKE '%apikey%' AS mentions_apikey_header,
    source.definition ILIKE '%authorization%'
      AS mentions_authorization_header,
    md5(source.definition) AS definition_fingerprint
  FROM function_sources AS source
  WHERE source.definition ILIKE '%net.http_post%'
     OR source.definition ILIKE '%net.http_get%'
     OR source.definition ILIKE '%supabase_functions.http_request%'
     OR source.definition ILIKE '%invoke_edge_function_v2%'
     OR source.definition ILIKE '%/functions/v1/%'
),
trigger_sources AS (
  SELECT
    table_namespace.nspname AS table_schema,
    relation.relname AS table_name,
    trigger.tgname AS trigger_name,
    trigger.tgenabled <> 'D' AS enabled,
    function_namespace.nspname AS function_schema,
    procedure.proname AS function_name,
    pg_get_triggerdef(trigger.oid, true) AS definition
  FROM pg_trigger AS trigger
  JOIN pg_class AS relation
    ON relation.oid = trigger.tgrelid
  JOIN pg_namespace AS table_namespace
    ON table_namespace.oid = relation.relnamespace
  JOIN pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
  JOIN pg_namespace AS function_namespace
    ON function_namespace.oid = procedure.pronamespace
  WHERE NOT trigger.tgisinternal
),
webhook_or_auth_triggers AS (
  SELECT
    source.table_schema,
    source.table_name,
    source.trigger_name,
    source.enabled,
    source.function_schema,
    source.function_name,
    (
      regexp_match(
        source.definition,
        $regex$/functions/v1/([A-Za-z0-9_-]+)$regex$
      )
    )[1] AS static_edge_function,
    source.function_schema = 'supabase_functions'
      AND source.function_name = 'http_request'
      AS database_webhook,
    source.table_schema = 'auth' AND source.table_name = 'users'
      AS auth_users_trigger,
    md5(source.definition) AS definition_fingerprint
  FROM trigger_sources AS source
  WHERE (
      source.function_schema = 'supabase_functions'
      AND source.function_name = 'http_request'
    )
    OR (source.table_schema = 'auth' AND source.table_name = 'users')
    OR source.definition ILIKE '%/functions/v1/%'
),
explicit_auth_admin_grants AS (
  SELECT DISTINCT
    namespace.nspname AS function_schema,
    procedure.proname AS function_name,
    pg_get_function_identity_arguments(procedure.oid) AS identity_arguments,
    pg_get_userbyid(procedure.proowner) AS function_owner,
    procedure.prosecdef AS security_definer
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  CROSS JOIN LATERAL aclexplode(procedure.proacl) AS privilege
  JOIN pg_roles AS grantee
    ON grantee.oid = privilege.grantee
  WHERE namespace.nspname IN ('auth', 'public')
    AND (
      namespace.nspname = 'public'
      OR pg_get_userbyid(procedure.proowner) <> 'supabase_auth_admin'
    )
    AND grantee.rolname = 'supabase_auth_admin'
    AND privilege.privilege_type = 'EXECUTE'
)
SELECT jsonb_pretty(
  jsonb_build_object(
    'captured_at', now(),
    'database', current_database(),
    'query_mode', 'catalog-select-only',
    'cron_jobs', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(caller)
          ORDER BY caller.jobname, caller.jobid
        )
        FROM cron_callers AS caller
      ),
      '[]'::jsonb
    ),
    'vault_secret_names', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(secret_name)
          ORDER BY secret_name.name
        )
        FROM vault_secret_names AS secret_name
      ),
      '[]'::jsonb
    ),
    'http_capable_database_functions', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(function_record)
          ORDER BY
            function_record.function_schema,
            function_record.function_name,
            function_record.identity_arguments
        )
        FROM http_capable_functions AS function_record
      ),
      '[]'::jsonb
    ),
    'database_webhook_or_auth_triggers', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(trigger_record)
          ORDER BY
            trigger_record.table_schema,
            trigger_record.table_name,
            trigger_record.trigger_name
        )
        FROM webhook_or_auth_triggers AS trigger_record
      ),
      '[]'::jsonb
    ),
    'explicit_supabase_auth_admin_execute_grants', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(grant_record)
          ORDER BY
            grant_record.function_schema,
            grant_record.function_name,
            grant_record.identity_arguments
        )
        FROM explicit_auth_admin_grants AS grant_record
      ),
      '[]'::jsonb
    ),
    'not_discoverable_from_database', jsonb_build_array(
      'HTTP Auth Hooks configured only in the Supabase Dashboard',
      'external monitoring provider configuration',
      'deployed Edge Function gateway verify_jwt settings'
    )
  )
) AS edge_function_caller_inventory;
