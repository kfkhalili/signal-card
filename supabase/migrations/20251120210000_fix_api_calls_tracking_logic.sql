-- Fix API call tracking logic
-- CRITICAL: We should only increment AFTER making API calls, not before
-- Current bug: check_and_increment_api_calls increments before calls are made
-- Then we decrement on failure, causing the counter to go up and down
-- Solution: Separate check from increment

-- Step 1: Create read-only check function (no increment)
CREATE OR REPLACE FUNCTION public.check_api_calls_limit(
  p_api_calls_to_make INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Get or create the current minute's count
  INSERT INTO public.api_calls_rate_tracker (minute_bucket, api_calls_made)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  -- Get current count (read-only, no lock needed)
  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute;

  -- Check if adding these calls would exceed the limit
  RETURN (current_calls + p_api_calls_to_make <= p_max_api_calls_per_minute);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.check_api_calls_limit IS 'Read-only check if making N API calls would exceed the limit. Returns TRUE if within limit, FALSE if would exceed. Does NOT increment counter.';

-- Step 2: Create increment function (only call after making API calls)
CREATE OR REPLACE FUNCTION public.increment_api_calls(
  p_api_calls_made INTEGER
)
RETURNS void AS $$
DECLARE
  current_minute TIMESTAMPTZ;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Get or create the current minute's count
  INSERT INTO public.api_calls_rate_tracker (minute_bucket, api_calls_made)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  -- Increment the count (with row lock to prevent race conditions)
  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = api_calls_made + p_api_calls_made,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.increment_api_calls IS 'Increments API call counter. Call this AFTER making API calls, not before.';

-- Step 3: Keep check_and_increment_api_calls for backward compatibility but mark as deprecated
-- Actually, let's remove it since we're changing the logic
DROP FUNCTION IF EXISTS public.check_and_increment_api_calls(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.decrement_api_calls(INTEGER);

COMMENT ON FUNCTION public.check_api_calls_limit IS 'Read-only check if making N API calls would exceed the limit. Returns TRUE if within limit, FALSE if would exceed. Does NOT increment counter.';
COMMENT ON FUNCTION public.increment_api_calls IS 'Increments API call counter. Call this AFTER making API calls, not before.';

