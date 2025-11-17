-- Phase 3: Staleness System
-- Create analytics refresh function (moved from Job 1 to prevent "God Function" bloat)
-- CRITICAL: Heavy TRUNCATE...INSERT operation moved to separate cron job
-- This allows Job 1 (staleness checker) to remain fast and meet its 5-minute schedule

CREATE OR REPLACE FUNCTION public.refresh_analytics_from_presence_v2()
RETURNS void AS $$
DECLARE
  lock_acquired BOOLEAN;
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(45) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'refresh_analytics_from_presence_v2 is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
    -- CRITICAL: This is a heavy operation (TRUNCATE + INSERT of potentially 300k rows)
    -- Moved to separate cron job to prevent Job 1 from exceeding its 5-minute window
    -- CRITICAL: Must run every minute (matches minimum TTL of 1 minute for quotes)
    -- The active_subscriptions_v2 table is updated every minute to keep it accurate for staleness checking

    -- Truncate analytics table
    TRUNCATE TABLE public.active_subscriptions_v2;

    -- TODO: Insert from Realtime Presence
    -- This would require fetching Presence state (via pg_net/http or Edge Function)
    -- For now, this is a placeholder that will be populated by the actual Presence fetch logic
    -- The actual implementation would:
    -- 1. Fetch Presence state from Realtime API
    -- 2. Parse and un-nest dataTypes array
    -- 3. INSERT INTO active_subscriptions_v2

    RAISE NOTICE 'Analytics table refreshed (placeholder - actual Presence fetch to be implemented)';

    -- Release the advisory lock
    PERFORM pg_advisory_unlock(45);

  EXCEPTION
    WHEN OTHERS THEN
      -- Always release the lock
      PERFORM pg_advisory_unlock(45);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.refresh_analytics_from_presence_v2 IS 'Refreshes analytics table from Realtime Presence. Heavy operation moved to separate cron job.';

