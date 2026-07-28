\set ON_ERROR_STOP on

-- Fail-safe operational rollback. This does not delete audit history.
-- Deactivating the calibration returns every quota function to the unchanged
-- raw rolling ledger, which is currently conservative enough to stop claims.

BEGIN;

UPDATE public.fmp_quota_calibrations
SET active = false
WHERE active;

COMMIT;

SELECT
  effective.is_calibrated,
  effective.current_usage_bytes,
  effective.raw_ledger_usage_bytes,
  effective.safety_buffer,
  public.is_quota_exceeded_v2() AS quota_guard_active
FROM public.get_effective_quota_usage_v2() AS effective;

