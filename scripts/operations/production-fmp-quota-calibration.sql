\set ON_ERROR_STOP on

-- Production-only write: record the authoritative rolling-30-day FMP
-- dashboard snapshot supplied on 2026-07-28.
--
-- Preconditions:
--   1. 20260728000000_reconcile_fmp_quota_ledger.sql is applied.
--   2. All FMP callers and the queue processor remain paused.
--   3. Only database-only cron maintenance jobs are active.
--
-- The endpoint values are the dashboard's final MB column. Their total is
-- 16,084.68 MiB = 15.7077 GiB, which reconciles to the 15.71 GB headline.

BEGIN;

SELECT public.record_fmp_quota_calibration_v2(
  p_dashboard_headline_usage_gib => 15.71,
  p_dashboard_limit_gib => 20,
  p_endpoint_usage_mib => jsonb_build_object(
    '/stable/insider-trading/search', 14180.00,
    '/stable/balance-sheet-statement', 427.96,
    '/stable/cash-flow-statement', 351.57,
    '/stable/income-statement', 278.95,
    '/stable/ratios-ttm', 230.72,
    '/stable/insider-trading/statistics', 218.24,
    '/stable/profile', 185.76,
    '/stable/shares-float-all', 79.59,
    '/v3/is-the-market-open', 66.35,
    '/stable/quote', 55.37,
    '/stable/all-exchange-market-hours', 6.15,
    '/stable/available-exchanges', 3.99,
    '/stable/grades-historical', 0.03,
    '/stable/price-target-consensus', 0,
    '/stable/discounted-cash-flow', 0,
    '/stable/dividends', 0,
    '/stable/revenue-product-segmentation', 0,
    '/stable/search-exchange-variants', 0
  ),
  p_source =>
    'FMP dashboard rolling-30-day endpoint export supplied 2026-07-28; '
    || 'headline 15.71 GB / 20 GB; FMP callers paused during capture',
  p_captured_at => now(),
  p_safety_buffer => 0.80,
  p_max_batch_jobs => 25
) AS calibration_id;

COMMIT;

SELECT
  effective.calibration_id,
  effective.calibrated_at,
  effective.is_calibrated,
  effective.quota_limit_bytes,
  effective.current_usage_bytes,
  effective.baseline_usage_bytes,
  effective.post_calibration_usage_bytes,
  effective.raw_ledger_usage_bytes,
  round(
    effective.current_usage_bytes::numeric
      / effective.quota_limit_bytes
      * 100,
    2
  ) AS effective_usage_percentage,
  effective.safety_buffer,
  effective.max_batch_jobs,
  (
    effective.quota_limit_bytes * effective.safety_buffer
  )::bigint - effective.current_usage_bytes AS bytes_to_recovery_ceiling
FROM public.get_effective_quota_usage_v2() AS effective;

