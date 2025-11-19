-- Phase 3: Staleness System
-- Create analytics refresh function (moved from Job 1 to prevent "God Function" bloat)
-- CRITICAL: Uses Edge Function to query Realtime Presence and update active_subscriptions_v2
-- This keeps last_seen_at accurate based on actual Presence state
-- CRITICAL: Must run every minute (matches minimum TTL of 1 minute for quotes)
-- The active_subscriptions_v2 table is updated every minute to keep it accurate for staleness checking

CREATE OR REPLACE FUNCTION public.refresh_analytics_from_presence_v2()
RETURNS void AS $$
DECLARE
  lock_acquired BOOLEAN;
  project_url TEXT;
  service_role_key TEXT;
  http_response RECORD;
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(45) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'refresh_analytics_from_presence_v2 is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
    -- Get project URL and service role key from vault
    SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets
    WHERE name = 'project_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key';

    IF project_url IS NULL OR service_role_key IS NULL THEN
      RAISE EXCEPTION 'Missing project_url or supabase_service_role_key in vault';
    END IF;

    -- CRITICAL: Call Edge Function to refresh analytics from Presence
    -- This is fire-and-forget (we don't wait for response to prevent timeouts)
    SELECT * INTO http_response
    FROM net.http_post(
      url := project_url || '/functions/v1/refresh-analytics-from-presence-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb
    );

    -- Release the advisory lock
    PERFORM pg_advisory_unlock(45);

    RAISE NOTICE 'Analytics refresh Edge Function invoked (request_id: %)', http_response.request_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Always release the lock
      PERFORM pg_advisory_unlock(45);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.refresh_analytics_from_presence_v2 IS 'Invokes Edge Function to refresh analytics table from Realtime Presence. Edge Function queries Presence and updates active_subscriptions_v2 with last_seen_at.';

