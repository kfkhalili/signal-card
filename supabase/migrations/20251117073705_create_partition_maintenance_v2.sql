-- Phase 2: Queue System
-- Create partition maintenance function
-- CRITICAL: Polite TRUNCATE with lock timeout to prevent stop-the-world deadlocks

-- Function to maintain queue partitions
-- CRITICAL: Truncates completed/failed partitions weekly to prevent infinite bloat
-- CRITICAL: Uses lock_timeout and exception handling for polite operation
CREATE OR REPLACE FUNCTION public.maintain_queue_partitions_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  -- CRITICAL: Set short lock timeout (1 second)
  -- This prevents "stop-the-world" deadlocks with active processors
  SET LOCAL lock_timeout = '1s';

  BEGIN
    -- Truncate completed partition (polite - will fail gracefully if locked)
    TRUNCATE TABLE public.api_call_queue_v2_completed;
    RAISE NOTICE 'Truncated api_call_queue_v2_completed partition';
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE WARNING 'Could not truncate completed partition: lock not available (processors may be active)';
    WHEN OTHERS THEN
      RAISE WARNING 'Error truncating completed partition: %', SQLERRM;
  END;

  BEGIN
    -- Truncate failed partition (polite - will fail gracefully if locked)
    TRUNCATE TABLE public.api_call_queue_v2_failed;
    RAISE NOTICE 'Truncated api_call_queue_v2_failed partition';
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE WARNING 'Could not truncate failed partition: lock not available (processors may be active)';
    WHEN OTHERS THEN
      RAISE WARNING 'Error truncating failed partition: %', SQLERRM;
    END;
END;
$$;

COMMENT ON FUNCTION public.maintain_queue_partitions_v2 IS 'Maintains queue partitions by truncating completed/failed partitions. Uses polite lock timeout to prevent deadlocks.';

