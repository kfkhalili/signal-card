-- Increase rate limit from 95 to 250 jobs per minute
-- CRITICAL: Financial-statements jobs (3 API calls each) are done
-- Remaining jobs are 1 API call each, so 250 jobs/minute = 250 API calls/minute
-- This is safely under the 300 API calls/minute limit

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_jobs_to_process INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_count INTEGER;
  max_jobs_per_minute INTEGER := 250; -- Increased from 95 to 250
BEGIN
  -- Get the current minute bucket (rounded down to the minute)
  current_minute := date_trunc('minute', NOW());

  -- Get or create the current minute's count
  INSERT INTO public.job_processing_rate_tracker (minute_bucket, jobs_processed)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  -- Get current count
  SELECT jobs_processed INTO current_count
  FROM public.job_processing_rate_tracker
  WHERE minute_bucket = current_minute;

  -- Check if adding these jobs would exceed the limit
  IF current_count + p_jobs_to_process > max_jobs_per_minute THEN
    RETURN FALSE; -- Would exceed limit
  END IF;

  -- Increment the count
  UPDATE public.job_processing_rate_tracker
  SET jobs_processed = jobs_processed + p_jobs_to_process,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;

  RETURN TRUE; -- Within limit
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_and_increment_rate_limit IS 'Checks if processing jobs would exceed the global 250 jobs/minute rate limit (250 API calls/minute for 1-call jobs). Returns TRUE if within limit and increments counter, FALSE if would exceed.';

