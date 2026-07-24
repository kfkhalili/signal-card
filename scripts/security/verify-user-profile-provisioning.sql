-- Read-only production verification for
-- 20260724000000_restore_user_profile_provisioning.sql.
--
-- Returns one JSON value and does not expose user IDs, email addresses, keys,
-- or webhook headers.

WITH trigger_state AS (
  SELECT
    count(*) = 1 AS exactly_one_expected_trigger,
    COALESCE(bool_and(t.tgenabled IN ('O', 'A')), false) AS trigger_enabled,
    COALESCE(
      bool_and(
        function_namespace.nspname = 'public'
        AND function_definition.proname = 'handle_auth_user_created'
        AND (t.tgtype & 4) = 4
      ),
      false
    ) AS trigger_definition_matches
  FROM pg_trigger AS t
  JOIN pg_class AS target_table
    ON target_table.oid = t.tgrelid
  JOIN pg_namespace AS target_namespace
    ON target_namespace.oid = target_table.relnamespace
  JOIN pg_proc AS function_definition
    ON function_definition.oid = t.tgfoid
  JOIN pg_namespace AS function_namespace
    ON function_namespace.oid = function_definition.pronamespace
  WHERE target_namespace.nspname = 'auth'
    AND target_table.relname = 'users'
    AND t.tgname = 'on_auth_user_created'
    AND NOT t.tgisinternal
),
profile_coverage AS (
  SELECT
    count(*) AS total_users,
    count(*) FILTER (WHERE profiles.id IS NULL) AS users_missing_profiles,
    count(*) FILTER (
      WHERE users.created_at >= now() - interval '30 days'
    ) AS users_created_last_30_days,
    count(*) FILTER (
      WHERE users.created_at >= now() - interval '30 days'
        AND profiles.id IS NULL
    ) AS recent_users_missing_profiles,
    max(users.created_at) AS latest_user_created_at
  FROM auth.users AS users
  LEFT JOIN public.user_profiles AS profiles
    ON profiles.id = users.id
),
function_access AS (
  SELECT
    has_function_privilege(
      'anon',
      'public.handle_auth_user_created()',
      'EXECUTE'
    ) AS anon_can_execute,
    has_function_privilege(
      'authenticated',
      'public.handle_auth_user_created()',
      'EXECUTE'
    ) AS authenticated_can_execute,
    has_function_privilege(
      'service_role',
      'public.handle_auth_user_created()',
      'EXECUTE'
    ) AS service_role_can_execute,
    has_function_privilege(
      'supabase_auth_admin',
      'public.handle_auth_user_created()',
      'EXECUTE'
    ) AS supabase_auth_admin_can_execute
)
SELECT jsonb_build_object(
  'verification', jsonb_build_object(
    'all_checks_pass',
      trigger_state.exactly_one_expected_trigger
      AND trigger_state.trigger_enabled
      AND trigger_state.trigger_definition_matches
      AND profile_coverage.users_missing_profiles = 0
      AND NOT function_access.anon_can_execute
      AND NOT function_access.authenticated_can_execute
      AND NOT function_access.service_role_can_execute
      AND function_access.supabase_auth_admin_can_execute,
    'trigger', jsonb_build_object(
      'exactly_one_expected_trigger',
        trigger_state.exactly_one_expected_trigger,
      'enabled', trigger_state.trigger_enabled,
      'definition_matches', trigger_state.trigger_definition_matches
    ),
    'profile_coverage', jsonb_build_object(
      'total_users', profile_coverage.total_users,
      'users_missing_profiles', profile_coverage.users_missing_profiles,
      'users_created_last_30_days',
        profile_coverage.users_created_last_30_days,
      'recent_users_missing_profiles',
        profile_coverage.recent_users_missing_profiles,
      'latest_user_created_at',
        profile_coverage.latest_user_created_at
    ),
    'function_access', jsonb_build_object(
      'anon_can_execute', function_access.anon_can_execute,
      'authenticated_can_execute',
        function_access.authenticated_can_execute,
      'service_role_can_execute',
        function_access.service_role_can_execute,
      'supabase_auth_admin_can_execute',
        function_access.supabase_auth_admin_can_execute
    )
  )
)
FROM trigger_state
CROSS JOIN profile_coverage
CROSS JOIN function_access;
