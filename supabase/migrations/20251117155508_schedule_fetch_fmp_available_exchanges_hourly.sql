-- Schedule fetch-fmp-available-exchanges to run once per hour at the top of the hour
-- Schedule: '0 * * * *' means "at minute 0 of every hour" (e.g., 1:00, 2:00, 3:00, etc.)

DO $$
BEGIN
  -- Check if job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-fetch-fmp-available-exchanges'
  ) THEN
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
    RAISE NOTICE 'Scheduled hourly-fetch-fmp-available-exchanges to run at the top of every hour';
  ELSE
    RAISE NOTICE 'Job hourly-fetch-fmp-available-exchanges already exists';
  END IF;
END $$;

