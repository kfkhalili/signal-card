-- Change exchange market status fetch from daily to hourly
-- Exchange status needs to be updated hourly to reflect market open/closed status accurately
-- Old schedule: '0 0 * * *' (daily at midnight UTC)
-- New schedule: '0 * * * *' (hourly at the top of each hour)

DO $$
BEGIN
  -- Unschedule the old daily job
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-fetch-fmp-all-exchange-market-status'
  ) THEN
    PERFORM cron.unschedule('daily-fetch-fmp-all-exchange-market-status');
    RAISE NOTICE 'Unscheduled daily-fetch-fmp-all-exchange-market-status';
  END IF;

  -- Schedule the new hourly job
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-fetch-fmp-all-exchange-market-status'
  ) THEN
    PERFORM cron.schedule(
      'hourly-fetch-fmp-all-exchange-market-status',
      '0 * * * *', -- At minute 0 of every hour (top of the hour)
      $cron$
      SELECT
        net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/fetch-fmp-all-exchange-market-status',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
          )
        ) AS request_id;
      $cron$
    );
    RAISE NOTICE 'Scheduled hourly-fetch-fmp-all-exchange-market-status to run at the top of every hour';
  ELSE
    RAISE NOTICE 'Job hourly-fetch-fmp-all-exchange-market-status already exists';
  END IF;
END $$;

