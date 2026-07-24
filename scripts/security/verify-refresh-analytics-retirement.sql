-- Read-only production dependency check for retiring
-- refresh-analytics-from-presence-v2.

WITH verification AS (
  SELECT
    to_regclass('public.active_subscriptions_v2') IS NULL
      AS legacy_table_absent,
    to_regprocedure('public.refresh_analytics_from_presence_v2()') IS NULL
      AS legacy_invoker_absent,
    NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'refresh-analytics-v2'
         OR command ILIKE '%refresh-analytics-from-presence-v2%'
         OR command ILIKE '%refresh_analytics_from_presence_v2%'
    ) AS legacy_cron_absent,
    to_regprocedure('public.get_active_subscriptions_from_realtime()') IS NOT NULL
      AS realtime_replacement_exists
)
SELECT jsonb_build_object(
  'verification', jsonb_build_object(
    'legacy_table_absent', legacy_table_absent,
    'legacy_invoker_absent', legacy_invoker_absent,
    'legacy_cron_absent', legacy_cron_absent,
    'realtime_replacement_exists', realtime_replacement_exists,
    'safe_to_retire',
      legacy_table_absent
      AND legacy_invoker_absent
      AND legacy_cron_absent,
    'all_checks_pass',
      legacy_table_absent
      AND legacy_invoker_absent
      AND legacy_cron_absent
  )
) AS result
FROM verification;
