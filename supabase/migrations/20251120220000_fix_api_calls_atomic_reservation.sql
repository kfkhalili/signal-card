-- Fix API call tracking with atomic reservation
-- CRITICAL: Multiple processors can check the limit simultaneously
-- They all see it's OK, then all proceed, causing total to exceed 300
-- Solution: Atomic reservation - reserve calls before making them, then confirm or release

-- Step 1: Create atomic reservation function (check AND reserve in one operation)
CREATE OR REPLACE FUNCTION public.reserve_api_calls(
  p_api_calls_to_reserve INTEGER,
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

  -- Get current count with row lock (atomic operation)
  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute
  FOR UPDATE; -- Lock the row to prevent concurrent modifications

  -- Check if adding these calls would exceed the limit
  IF current_calls + p_api_calls_to_reserve > p_max_api_calls_per_minute THEN
    RETURN FALSE; -- Would exceed limit, don't reserve
  END IF;

  -- Reserve the calls (increment immediately)
  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = api_calls_made + p_api_calls_to_reserve,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;

  RETURN TRUE; -- Reservation successful
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reserve_api_calls IS 'Atomically reserves API calls. Checks limit and increments counter in one operation. Returns TRUE if reservation successful, FALSE if would exceed limit. Call this BEFORE making API calls.';

-- Step 2: Create function to release reservation (if API calls fail)
CREATE OR REPLACE FUNCTION public.release_api_calls_reservation(
  p_api_calls_to_release INTEGER
)
RETURNS void AS $$
DECLARE
  current_minute TIMESTAMPTZ;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Release the reservation (decrement, don't go below 0)
  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = GREATEST(0, api_calls_made - p_api_calls_to_release),
      updated_at = NOW()
  WHERE minute_bucket = current_minute;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.release_api_calls_reservation IS 'Releases API call reservation. Call this if API calls fail after reservation. Prevents over-counting.';

-- Step 3: Keep increment_api_calls for successful calls (no-op since we already reserved)
-- Actually, we don't need this anymore - reservation already incremented
-- But keep it for backward compatibility, make it a no-op
CREATE OR REPLACE FUNCTION public.increment_api_calls(
  p_api_calls_made INTEGER
)
RETURNS void AS $$
BEGIN
  -- No-op: Calls were already reserved and incremented in reserve_api_calls
  -- This function is kept for backward compatibility but does nothing
  -- The reservation already counted the calls
  NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.increment_api_calls IS 'No-op: API calls are already reserved and counted in reserve_api_calls. Kept for backward compatibility.';

-- Step 4: Remove old check function (replaced by reserve)
DROP FUNCTION IF EXISTS public.check_api_calls_limit(INTEGER, INTEGER);

