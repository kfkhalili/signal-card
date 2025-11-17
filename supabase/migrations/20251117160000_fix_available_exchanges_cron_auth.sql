-- Fix authentication for hourly-fetch-fmp-available-exchanges cron job
-- The Edge Function uses ensureCronAuth which expects SUPABASE_ANON_KEY,
-- so we need to use 'anon_key' from vault instead of 'supabase_service_role_key'

DO $$
BEGIN
  -- Unschedule the existing job
  PERFORM cron.unschedule('hourly-fetch-fmp-available-exchanges');

  -- Reschedule with correct authentication
  PERFORM cron.schedule(
    'hourly-fetch-fmp-available-exchanges',
    '0 * * * *', -- At minute 0 of every hour (top of the hour)
    $cron$
    SELECT
      net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/fetch-fmp-available-exchanges',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $cron$
  );

  RAISE NOTICE 'Updated hourly-fetch-fmp-available-exchanges to use anon_key for authentication';
END $$;

