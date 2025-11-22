-- Phase 2: Queue System
-- Create quota enforcement functions
-- CRITICAL: Quota system prevents quota rebound catastrophe

-- Constants for quota limits (in bytes)
-- 20 GB = 20 * 1024 * 1024 * 1024 bytes
-- CRITICAL: Cast to BIGINT before multiplication to avoid integer overflow
DO $$
BEGIN
  -- Set quota limit (20 GB per month)
  PERFORM set_config('app.settings.quota_limit_bytes', (20::BIGINT * 1024::BIGINT * 1024::BIGINT * 1024::BIGINT)::TEXT, false);

  -- Set safety buffer (95% of quota to prevent overshoot)
  PERFORM set_config('app.settings.quota_safety_buffer', '0.95', false);
END $$;

-- Function to check if quota is exceeded
-- CRITICAL: Uses rolling 30-day window, not calendar month
-- CRITICAL: Includes safety buffer (default 95%) to prevent overshoot
CREATE OR REPLACE FUNCTION public.is_quota_exceeded_v2(
  p_safety_buffer NUMERIC DEFAULT 0.95
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
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
$$;

COMMENT ON FUNCTION public.is_quota_exceeded_v2 IS 'Checks if data quota is exceeded. Uses rolling 30-day window and safety buffer (default 95%) to prevent overshoot.';

-- Function to get current quota usage
CREATE OR REPLACE FUNCTION public.get_quota_usage_v2()
RETURNS TABLE(
  quota_limit_bytes BIGINT,
  current_usage_bytes BIGINT,
  buffered_quota_bytes BIGINT,
  usage_percentage NUMERIC,
  days_remaining INTEGER
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
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
$$;

COMMENT ON FUNCTION public.get_quota_usage_v2 IS 'Returns current quota usage statistics for monitoring and alerting.';

-- Function to increment API calls (no-op: calls already reserved)
-- CRITICAL: This is a no-op function for backward compatibility
-- API calls are already reserved and counted in reserve_api_calls
CREATE OR REPLACE FUNCTION public.increment_api_calls(p_api_calls_made INTEGER)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NULL; -- No-op: Calls were already reserved and counted
END;
$$;

COMMENT ON FUNCTION public.increment_api_calls IS 'No-op function for backward compatibility. API calls are already reserved and counted in reserve_api_calls.';

-- Function to reserve API calls (rate limiting)
-- CRITICAL: Atomic reservation prevents exceeding 300 calls/minute limit
CREATE OR REPLACE FUNCTION public.reserve_api_calls(
  p_api_calls_to_reserve INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  current_minute := date_trunc('minute', NOW());

  INSERT INTO public.api_calls_rate_tracker (minute_bucket, api_calls_made)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute
  FOR UPDATE;

  IF current_calls + p_api_calls_to_reserve > p_max_api_calls_per_minute THEN
    RETURN FALSE;
  END IF;

  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = api_calls_made + p_api_calls_to_reserve,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.reserve_api_calls IS 'Atomically reserves API calls. Returns false if reservation would exceed rate limit.';

-- Function to release API calls reservation
CREATE OR REPLACE FUNCTION public.release_api_calls_reservation(p_api_calls_to_release INTEGER)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  current_minute TIMESTAMPTZ;
BEGIN
  current_minute := date_trunc('minute', NOW());

  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = GREATEST(0, api_calls_made - p_api_calls_to_release),
      updated_at = NOW()
  WHERE minute_bucket = current_minute;
END;
$$;

COMMENT ON FUNCTION public.release_api_calls_reservation IS 'Releases previously reserved API calls.';

-- Function to check if processing should stop (rate limiting)
CREATE OR REPLACE FUNCTION public.should_stop_processing_api_calls(
  p_api_calls_to_reserve INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300,
  p_safety_buffer INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  current_minute := date_trunc('minute', NOW());

  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute;

  IF current_calls IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (current_calls + p_api_calls_to_reserve >= p_max_api_calls_per_minute - p_safety_buffer);
END;
$$;

COMMENT ON FUNCTION public.should_stop_processing_api_calls IS 'Checks if processing should stop to avoid exceeding rate limit. Includes safety buffer.';

