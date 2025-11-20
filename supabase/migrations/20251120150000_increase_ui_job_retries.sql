-- Increase max_retries for UI jobs (priority 1000) to prevent failures
-- CRITICAL: UI jobs must never fail - users are actively waiting for data
-- Solution: Give UI jobs more retries (5 instead of 3) and ensure they're always processed first

-- Function to set max_retries when creating UI jobs
-- This will be used by queue_refresh_if_not_exists_v2 and other job creation functions
CREATE OR REPLACE FUNCTION public.set_ui_job_max_retries()
RETURNS TRIGGER AS $$
BEGIN
  -- If priority is 1000 (UI job), set max_retries to 5
  IF NEW.priority = 1000 AND NEW.max_retries < 5 THEN
    NEW.max_retries := 5;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set max_retries for UI jobs
DROP TRIGGER IF EXISTS set_ui_job_max_retries_trigger ON public.api_call_queue_v2;
CREATE TRIGGER set_ui_job_max_retries_trigger
  BEFORE INSERT OR UPDATE ON public.api_call_queue_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ui_job_max_retries();

COMMENT ON FUNCTION public.set_ui_job_max_retries IS 'Automatically sets max_retries to 5 for UI jobs (priority 1000) to prevent failures.';

