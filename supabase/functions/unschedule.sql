select cron.unschedule('minute-fetch-fmp-quote-indicators');
select cron.unschedule('daily-fetch-all-exchange-market-status')
select cron.unschedule('monthly-fetch-financial-statements');
select cron.unschedule('hourly-fetch-fmp-profiles');
SELECT cron.unschedule('daily-fetch-fmp-shares-float');
SELECT cron.unschedule('daily-fetch-fmp-ratios-ttm');
