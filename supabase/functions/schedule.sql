  select
  cron.schedule(
    'fetch-fmp-quote-indicators',
    '* * * * *', -- every minute
    $$
    select
      net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-quote-indicators',
          headers:=jsonb_build_object(
            'Content-type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          )
      ) as request_id;
    $$
);

  select
  cron.schedule(
    'fetch-all-exchange-market-status',
    '0 0 * * *', -- every day at midnight
    $$
    select
      net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-all-exchange-market-status',
          headers:=jsonb_build_object(
            'Content-type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          )
      ) as request_id;
    $$
);
