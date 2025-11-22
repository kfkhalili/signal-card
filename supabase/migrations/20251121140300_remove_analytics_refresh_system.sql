-- Migration: Remove analytics refresh system (no longer needed after realtime.subscription migration)
-- MIGRATED: Subscriptions are now tracked via realtime.subscription (Supabase built-in)
-- No manual cleanup needed - subscriptions auto-remove on disconnect

-- Step 1: Remove the cron job
SELECT cron.unschedule('refresh-analytics-v2');

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.refresh_analytics_from_presence_v2();

-- Step 3: Verify removal
DO $$
BEGIN
  -- Check if cron job still exists
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'refresh-analytics-v2'
  ) THEN
    RAISE EXCEPTION 'refresh-analytics-v2 cron job still exists after unschedule';
  END IF;

  -- Check if function still exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'refresh_analytics_from_presence_v2'
  ) THEN
    RAISE EXCEPTION 'refresh_analytics_from_presence_v2 function still exists after DROP';
  END IF;

  RAISE NOTICE 'Successfully removed analytics refresh system';
END $$;

COMMENT ON SCHEMA public IS 'MIGRATED: Analytics refresh system removed. Subscriptions now tracked via realtime.subscription (Supabase built-in).';

