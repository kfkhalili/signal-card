-- A deterministic provider-quality failure will not improve when the same
-- scheduled request is repeated an hour later. Keep the issue open and the
-- last-known-good data intact, but wait one full refresh TTL before probing
-- the provider again. Demand-driven work can still bypass this cooldown.

CREATE OR REPLACE FUNCTION public.refresh_failure_retry_interval_v2(
  p_error_message text,
  p_consecutive_failures integer
)
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_error_message LIKE 'Non-retryable data-quality failure:%'
      THEN interval '24 hours'
    WHEN p_error_message ILIKE '%stale%'
         AND p_error_message ILIKE '%timestamp%'
      THEN interval '24 hours'
    ELSE pg_catalog.make_interval(
      hours => LEAST(
        24,
        pg_catalog.power(
          2,
          LEAST(GREATEST(p_consecutive_failures, 1) - 1, 5)
        )::integer
      )
    )
  END;
$$;

ALTER FUNCTION public.refresh_failure_retry_interval_v2(text, integer)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.refresh_failure_retry_interval_v2(text, integer)
FROM PUBLIC, anon, authenticated, service_role;

-- Extend cooldowns already created by the current rollout. This prevents the
-- scheduler from repeating those billed calls before the next daily probe.
UPDATE public.refresh_failure_cooldowns_v2 AS cooldown
SET
  retry_after = cooldown.last_failure_at + interval '24 hours',
  updated_at = pg_catalog.now()
WHERE cooldown.last_error_message
        LIKE 'Non-retryable data-quality failure:%'
  AND cooldown.retry_after
        < cooldown.last_failure_at + interval '24 hours';

COMMENT ON FUNCTION public.refresh_failure_retry_interval_v2(text, integer) IS
  'Returns a 24-hour cooldown for deterministic data-quality and timestamp-regression failures; other failures retain capped exponential backoff.';
