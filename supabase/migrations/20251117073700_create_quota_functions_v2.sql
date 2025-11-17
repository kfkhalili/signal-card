-- Phase 2: Queue System
-- Create quota enforcement functions
-- CRITICAL: Quota system prevents quota rebound catastrophe

-- Constants for quota limits (in bytes)
-- 20 GB = 20 * 1024 * 1024 * 1024 bytes
DO $$
BEGIN
  -- Set quota limit (20 GB per month)
  PERFORM set_config('app.settings.quota_limit_bytes', (20 * 1024 * 1024 * 1024)::TEXT, false);

  -- Set safety buffer (95% of quota to prevent overshoot)
  PERFORM set_config('app.settings.quota_safety_buffer', '0.95', false);
END $$;

-- Function to check if quota is exceeded
-- CRITICAL: Uses rolling 30-day window, not calendar month
-- CRITICAL: Includes safety buffer (default 95%) to prevent overshoot
CREATE OR REPLACE FUNCTION public.is_quota_exceeded_v2(
  p_safety_buffer NUMERIC DEFAULT 0.95
)
RETURNS BOOLEAN AS $$
DECLARE
  quota_limit_bytes BIGINT;
  current_usage_bytes BIGINT;
  buffered_quota_bytes BIGINT;
BEGIN
  -- Get quota limit from config (20 GB)
  quota_limit_bytes := (current_setting('app.settings.quota_limit_bytes', true))::BIGINT;

  -- Calculate current usage (rolling 30-day window)
  SELECT COALESCE(SUM(data_size_bytes), 0) INTO current_usage_bytes
  FROM public.api_data_usage_v2
  WHERE recorded_at >= NOW() - INTERVAL '30 days';

  -- Calculate buffered quota (safety buffer to prevent overshoot)
  buffered_quota_bytes := (quota_limit_bytes * p_safety_buffer)::BIGINT;

  -- Return true if usage exceeds buffered quota
  RETURN current_usage_bytes >= buffered_quota_bytes;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_quota_exceeded_v2 IS 'Checks if data quota is exceeded. Uses rolling 30-day window and safety buffer (default 95%) to prevent overshoot.';

-- Function to get current quota usage
CREATE OR REPLACE FUNCTION public.get_quota_usage_v2()
RETURNS TABLE(
  quota_limit_bytes BIGINT,
  current_usage_bytes BIGINT,
  buffered_quota_bytes BIGINT,
  usage_percentage NUMERIC,
  days_remaining INTEGER
) AS $$
DECLARE
  quota_limit BIGINT;
  current_usage BIGINT;
  buffered_quota BIGINT;
  oldest_record TIMESTAMPTZ;
BEGIN
  -- Get quota limit
  quota_limit := (current_setting('app.settings.quota_limit_bytes', true))::BIGINT;

  -- Get current usage (rolling 30-day window)
  SELECT COALESCE(SUM(data_size_bytes), 0) INTO current_usage
  FROM public.api_data_usage_v2
  WHERE recorded_at >= NOW() - INTERVAL '30 days';

  -- Calculate buffered quota
  buffered_quota := (quota_limit * 0.95)::BIGINT;

  -- Find oldest record in 30-day window
  SELECT MIN(recorded_at) INTO oldest_record
  FROM public.api_data_usage_v2
  WHERE recorded_at >= NOW() - INTERVAL '30 days';

  RETURN QUERY SELECT
    quota_limit,
    current_usage,
    buffered_quota,
    ROUND((current_usage::NUMERIC / quota_limit::NUMERIC * 100), 2) AS usage_percentage,
    CASE
      WHEN oldest_record IS NOT NULL THEN
        GREATEST(0, 30 - EXTRACT(DAY FROM NOW() - oldest_record)::INTEGER)
      ELSE 30
    END AS days_remaining;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_quota_usage_v2 IS 'Returns current quota usage statistics for monitoring and alerting.';

