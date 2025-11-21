-- Add circuit breaker to stop processing when API call limit is reached
-- CRITICAL: When we hit the 300 API calls/minute limit, stop processing entirely
-- Wait for the minute to roll over before resuming
-- This prevents exceeding the limit due to concurrent processors

-- Create function to check if we should stop processing (circuit breaker)
CREATE OR REPLACE FUNCTION public.should_stop_processing_api_calls(
  p_api_calls_to_reserve INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300,
  p_safety_buffer INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Get current count
  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute;

  -- If no data, we're safe to proceed
  IF current_calls IS NULL THEN
    RETURN FALSE; -- Safe to proceed
  END IF;

  -- Stop if we're at or near the limit (with safety buffer)
  -- This prevents the last few jobs from pushing us over
  RETURN (current_calls + p_api_calls_to_reserve >= p_max_api_calls_per_minute - p_safety_buffer);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.should_stop_processing_api_calls IS 'Circuit breaker: Returns TRUE if we should stop processing to avoid exceeding API call limit. Uses safety buffer to prevent last-minute overruns.';

