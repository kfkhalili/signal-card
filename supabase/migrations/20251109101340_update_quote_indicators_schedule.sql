-- Update quote indicators cron jobs
-- Schedule exchange prices API job

-- Schedule the new exchange prices API job
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'minute-fetch-fmp-exchange-prices-api'
  ) THEN
    PERFORM cron.schedule(
      'minute-fetch-fmp-exchange-prices-api',
      '* * * * *', -- every minute
      $cron$
      select
        net.http_post(
            url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-exchange-prices-api',
            headers:=jsonb_build_object(
              'Content-type', 'application/json',
              'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
            )
        ) as request_id;
      $cron$
    );
  END IF;
END $$;

