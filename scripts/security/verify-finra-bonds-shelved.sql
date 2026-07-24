-- Read-only verification for 20260724030000_shelve_finra_bonds.sql.
--
-- An absent table is a valid already-shelved state.

WITH target AS (
  SELECT to_regclass('public.corporate_bonds') AS table_oid
),
verification AS (
  SELECT
    table_oid IS NOT NULL AS table_exists,
    CASE
      WHEN table_oid IS NULL THEN true
      ELSE NOT has_table_privilege('anon', table_oid, 'SELECT')
    END AS anon_select_absent,
    CASE
      WHEN table_oid IS NULL THEN true
      ELSE NOT has_table_privilege('authenticated', table_oid, 'SELECT')
    END AS authenticated_select_absent,
    NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'corporate_bonds'
    ) AS realtime_removed,
    NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'corporate_bonds'
        AND policyname = 'Allow public read access to corporate_bonds'
    ) AS public_policy_absent
  FROM target
)
SELECT jsonb_build_object(
  'verification', jsonb_build_object(
    'table_exists', table_exists,
    'anon_select_absent', anon_select_absent,
    'authenticated_select_absent', authenticated_select_absent,
    'realtime_removed', realtime_removed,
    'public_policy_absent', public_policy_absent,
    'all_checks_pass',
      anon_select_absent
      AND authenticated_select_absent
      AND realtime_removed
      AND public_policy_absent
  )
) AS result
FROM verification;
