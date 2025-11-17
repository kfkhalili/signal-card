-- Phase 2: Queue System
-- Create recovery functions
-- CRITICAL: Uses FOR UPDATE SKIP LOCKED to prevent deadlocks

-- Function to recover stuck jobs (poisoned batch recovery)
-- CRITICAL: Uses FOR UPDATE SKIP LOCKED to prevent deadlocks with concurrent complete_queue_job calls
CREATE OR REPLACE FUNCTION public.recover_stuck_jobs_v2()
RETURNS INTEGER AS $$
DECLARE
  stuck_job_count INTEGER := 0;
  recovered_count INTEGER := 0;
BEGIN
  -- Find jobs stuck in 'processing' state for more than 5 minutes
  -- CRITICAL: Use FOR UPDATE SKIP LOCKED to prevent deadlocks
  WITH stuck_jobs AS (
    SELECT id
    FROM public.api_call_queue_v2
    WHERE status = 'processing'
      AND processed_at < NOW() - INTERVAL '5 minutes'
    FOR UPDATE SKIP LOCKED
    LIMIT 100 -- Process in batches to avoid long locks
  )
  UPDATE public.api_call_queue_v2
  SET
    status = 'pending',
    processed_at = NULL
  FROM stuck_jobs
  WHERE api_call_queue_v2.id = stuck_jobs.id
  RETURNING id INTO stuck_job_count;

  GET DIAGNOSTICS recovered_count = ROW_COUNT;

  IF recovered_count > 0 THEN
    RAISE NOTICE 'Recovered % stuck jobs', recovered_count;
  END IF;

  RETURN recovered_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.recover_stuck_jobs_v2 IS 'Recovers jobs stuck in processing state for more than 5 minutes. Uses FOR UPDATE SKIP LOCKED to prevent deadlocks.';

