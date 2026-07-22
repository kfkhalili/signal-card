\set ON_ERROR_STOP on

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = public, extensions;

-- The harness must disable cron before this test starts. This is both a safety
-- assertion and proof that verification cannot invoke an Edge Function.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE active) THEN
    RAISE EXCEPTION 'Zero-FMP preflight failed: active cron jobs exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name IN (
      'project_url', 'anon_key', 'supabase_service_role_key',
      'fmp_api_key', 'FMP_API_KEY'
    )
  ) THEN
    RAISE EXCEPTION 'Zero-FMP preflight failed: callable project/FMP secrets exist';
  END IF;
END;
$$;

DELETE FROM public.exchange_variants WHERE symbol LIKE 'VFY\_%' ESCAPE '\';
DELETE FROM public.compass_pillar_scores WHERE symbol LIKE 'VFY\_%' ESCAPE '\';
DELETE FROM public.listed_symbols WHERE symbol LIKE 'VFY\_%' ESCAPE '\';
DELETE FROM public.profiles WHERE symbol LIKE 'VFY\_%' ESCAPE '\';

INSERT INTO public.profiles (symbol, company_name)
VALUES
  ('VFY_ALPHA', 'Verification Alpha'),
  ('VFY_BETA', 'Verification Beta'),
  ('VFY_GAMMA', 'Verification Gamma'),
  ('VFY_NULL', 'Verification Missing Data');

INSERT INTO public.listed_symbols (symbol, is_active)
VALUES
  ('VFY_ALPHA', TRUE),
  ('VFY_BETA', FALSE),
  ('VFY_GAMMA', TRUE),
  ('VFY_NULL', TRUE);

INSERT INTO public.compass_pillar_scores (
  symbol, industry, market_cap, revenue_ttm,
  norm_ps, ps_rank, norm_evm, evm_rank,
  norm_sentiment, sentiment_rank,
  norm_profitability_yield, profitability_rank,
  norm_buyback_yield, buyback_rank,
  norm_peg, peg_rank, norm_div_yield, div_yield_rank,
  norm_health, health_rank
)
VALUES
  ('VFY_ALPHA', 'VFY Technology', 1000, 500, 80, 1, 80, 1, 80, 1, 80, 1, 80, 1, 80, 1, 80, 1, 80, 1),
  ('VFY_BETA', 'VFY Technology', 900, 450, 60, 2, 60, 2, 60, 2, 60, 2, 60, 2, 60, 2, 60, 2, 60, 2),
  ('VFY_GAMMA', 'VFY Healthcare', 800, 400, 100, 3, 0, 3, 100, 3, 0, 3, 100, 3, 0, 3, 100, 3, 0, 3),
  ('VFY_NULL', 'VFY Technology', 700, NULL, NULL, 4, 40, 4, 40, 4, 40, 4, 40, 4, 40, 4, 40, 4, 40, 4);

INSERT INTO public.exchange_variants (
  symbol, symbol_variant, exchange_short_name
)
VALUES
  ('VFY_ALPHA', 'VFY_ALPHA', 'NASDAQ'),
  ('VFY_BETA', 'VFY_BETA', 'NYSE'),
  ('VFY_GAMMA', 'VFY_GAMMA', 'NASDAQ'),
  ('VFY_NULL', 'VFY_NULL', 'NASDAQ');

DO $$
DECLARE
  equal_weights CONSTANT jsonb :=
    '{"revenue":0.125,"value":0.125,"sentiment":0.125,"growth":0.125,"profitability":0.125,"buyback":0.125,"income":0.125,"health":0.125}'::jsonb;
  actual_symbols text[];
  expected_symbols text[];
  actual_score numeric;
BEGIN
  SELECT array_agg(symbol ORDER BY rank)
  INTO actual_symbols
  FROM public.get_weighted_leaderboard(equal_weights, ARRAY['VFY Technology', 'VFY Healthcare'], NULL)
  WHERE symbol LIKE 'VFY\_%' ESCAPE '\';

  IF actual_symbols IS DISTINCT FROM ARRAY['VFY_ALPHA', 'VFY_GAMMA', 'VFY_NULL']::text[] THEN
    RAISE EXCEPTION 'Ranking/active/missing-data order mismatch: %', actual_symbols;
  END IF;

  SELECT composite_score
  INTO actual_score
  FROM public.get_weighted_leaderboard(equal_weights, ARRAY['VFY Technology'], NULL)
  WHERE symbol = 'VFY_ALPHA';

  IF actual_score IS DISTINCT FROM 80.00::numeric THEN
    RAISE EXCEPTION 'Manual score mismatch for VFY_ALPHA: expected 80.00, got %', actual_score;
  END IF;

  SELECT composite_score
  INTO actual_score
  FROM public.get_weighted_leaderboard(equal_weights, ARRAY['VFY Healthcare'], NULL)
  WHERE symbol = 'VFY_GAMMA';

  IF actual_score IS DISTINCT FROM 50.00::numeric THEN
    RAISE EXCEPTION 'Manual score mismatch for VFY_GAMMA: expected 50.00, got %', actual_score;
  END IF;

  SELECT array_agg(symbol ORDER BY rank)
  INTO actual_symbols
  FROM public.get_weighted_leaderboard(equal_weights, ARRAY['VFY Technology'], ARRAY['nasdaq'])
  WHERE symbol LIKE 'VFY\_%' ESCAPE '\';

  IF actual_symbols IS DISTINCT FROM ARRAY['VFY_ALPHA', 'VFY_NULL']::text[] THEN
    RAISE EXCEPTION 'Combined industry/exchange filter mismatch: %', actual_symbols;
  END IF;

  SELECT array_agg(symbol ORDER BY rank)
  INTO actual_symbols
  FROM public.get_weighted_leaderboard(equal_weights, ARRAY[]::text[], ARRAY[]::text[]);

  SELECT array_agg(symbol ORDER BY rank)
  INTO expected_symbols
  FROM public.get_weighted_leaderboard(equal_weights, NULL, NULL);

  IF actual_symbols IS DISTINCT FROM expected_symbols THEN
    RAISE EXCEPTION 'Empty filters should behave as no filters: empty=%, null=%',
      actual_symbols, expected_symbols;
  END IF;
END;
$$;

-- Queue/rate-limit runtime checks. These specifically cover functions that
-- cron and the queue processor depend on, not just their SQL definitions.
DELETE FROM public.api_call_queue_v2 WHERE symbol LIKE 'VFY\_QUEUE\_%' ESCAPE '\';
DELETE FROM public.api_calls_rate_tracker
WHERE minute_bucket = date_trunc('minute', NOW());

DO $$
BEGIN
  IF NOT public.reserve_api_calls(299, 300) THEN
    RAISE EXCEPTION 'Initial API-call reservation unexpectedly failed';
  END IF;
  IF public.reserve_api_calls(2, 300) THEN
    RAISE EXCEPTION 'Rate limiter allowed a reservation above 300 calls/minute';
  END IF;
  IF NOT public.should_stop_processing_api_calls(1, 300, 5) THEN
    RAISE EXCEPTION 'Rate-limit safety buffer did not stop processing';
  END IF;
  PERFORM public.release_api_calls_reservation(299);
END;
$$;

SELECT public.queue_refresh_if_not_exists_v2('VFY_QUEUE_A', 'quote', 10, 100);
SELECT public.queue_refresh_if_not_exists_v2('VFY_QUEUE_A', 'quote', 20, 100);
SELECT public.queue_refresh_if_not_exists_v2('VFY_QUEUE_B', 'quote', 10, 100);

DO $$
DECLARE
  claimed_count integer;
  recovered_count integer;
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.api_call_queue_v2
    WHERE symbol = 'VFY_QUEUE_A'
      AND data_type = 'quote'
      AND status IN ('pending', 'processing')
  ) <> 1 THEN
    RAISE EXCEPTION 'Idempotent queueing produced duplicate active jobs';
  END IF;

  IF (
    SELECT MAX(priority)
    FROM public.api_call_queue_v2
    WHERE symbol = 'VFY_QUEUE_A' AND data_type = 'quote'
  ) <> 20 THEN
    RAISE EXCEPTION 'Idempotent queueing did not promote priority';
  END IF;

  SELECT COUNT(*) INTO claimed_count
  FROM public.get_queue_batch_v2(2, 1000)
  WHERE symbol LIKE 'VFY\_QUEUE\_%' ESCAPE '\';

  IF claimed_count <> 2 THEN
    RAISE EXCEPTION 'Queue batch claim expected 2 jobs, got %', claimed_count;
  END IF;

  UPDATE public.api_call_queue_v2
  SET processed_at = NOW() - INTERVAL '10 minutes'
  WHERE symbol LIKE 'VFY\_QUEUE\_%' ESCAPE '\'
    AND status = 'processing';

  SELECT public.recover_stuck_jobs_v2() INTO recovered_count;
  IF recovered_count < 2 THEN
    RAISE EXCEPTION 'Stuck-job recovery expected at least 2 jobs, got %', recovered_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.get_quota_usage_v2()
    WHERE quota_limit_bytes IS NULL OR quota_limit_bytes <= 0
  ) THEN
    RAISE EXCEPTION 'Quota fallback is missing or invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.check_quota_usage_alert()
    WHERE total_bytes >= 0 AND alert_status IN ('healthy', 'alert')
  ) THEN
    RAISE EXCEPTION 'Quota alert function returned an invalid result';
  END IF;

  IF POSITION(
       'pg_advisory_xact_lock'
       IN pg_get_functiondef(
         'public.queue_refresh_if_not_exists_v2(text,text,integer,bigint)'::regprocedure
       )
     ) = 0 THEN
    RAISE EXCEPTION 'Concurrent queue uniqueness lock is missing';
  END IF;

  IF POSITION(
       'status_code'
       IN pg_get_functiondef(
         'public.invoke_edge_function_v2(text,jsonb,integer)'::regprocedure
       )
     ) > 0 THEN
    RAISE EXCEPTION 'Asynchronous pg_net invoker still treats request id as a response';
  END IF;
END;
$$;

-- Scheduler uniqueness and lock contracts.
DO $$
DECLARE
  duplicate_names text[];
BEGIN
  SELECT array_agg(jobname)
  INTO duplicate_names
  FROM (
    SELECT jobname
    FROM cron.job
    GROUP BY jobname
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_names IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate cron jobs found: %', duplicate_names;
  END IF;

  IF (SELECT COUNT(*) FROM cron.job WHERE jobname = 'check-stale-data-v2') <> 1
     OR (SELECT COUNT(*) FROM cron.job WHERE jobname = 'queue-scheduled-refreshes-v2') <> 1
     OR (SELECT COUNT(*) FROM cron.job WHERE jobname = 'invoke-processor-v2') <> 1
     OR (SELECT COUNT(*) FROM cron.job WHERE jobname = 'maintain-queue-partitions-v2') <> 1
     OR (SELECT COUNT(*) FROM cron.job WHERE jobname = 'refresh-compass-leaderboard-mv') <> 1 THEN
    RAISE EXCEPTION 'One or more required scheduler jobs are missing or non-unique';
  END IF;

  IF POSITION(
       'pg_try_advisory_lock(42)'
       IN pg_get_functiondef('public.check_and_queue_stale_data_from_presence_v2()'::regprocedure)
     ) = 0
     OR POSITION(
       'pg_try_advisory_lock(43)'
       IN pg_get_functiondef('public.queue_scheduled_refreshes_v2()'::regprocedure)
     ) = 0
     OR POSITION(
       'pg_try_advisory_lock(44)'
       IN pg_get_functiondef('public.invoke_processor_if_healthy_v2()'::regprocedure)
     ) = 0 THEN
    RAISE EXCEPTION 'Expected scheduler advisory-lock contract is missing';
  END IF;
END;
$$;

-- Heartbeat/presence and freshness contracts remain callable on an empty local
-- Realtime/cron history and must return a typed, non-error result.
DO $$
DECLARE
  presence_count bigint;
  freshness timestamptz;
  expected_freshness timestamptz := clock_timestamp() - INTERVAL '3 minutes';
  compass_job_id bigint;
BEGIN
  SELECT COUNT(*) INTO presence_count
  FROM public.get_active_subscriptions_from_realtime();

  SELECT jobid INTO compass_job_id
  FROM cron.job
  WHERE jobname = 'refresh-compass-leaderboard-mv';

  INSERT INTO cron.job_run_details (
    jobid, runid, database, username, command, status, start_time, end_time
  )
  VALUES (
    compass_job_id, -2207202601, current_database(), current_user,
    'verification fixture', 'succeeded',
    expected_freshness - INTERVAL '1 second', expected_freshness
  );

  SELECT public.get_compass_freshness() INTO freshness;

  IF presence_count < 0 THEN
    RAISE EXCEPTION 'Presence function returned an impossible row count';
  END IF;

  IF freshness IS DISTINCT FROM expected_freshness THEN
    RAISE EXCEPTION
      'Compass freshness mismatch: expected %, got %',
      expected_freshness, freshness;
  END IF;
END;
$$;

-- Closed-market stale-quote behavior: fresh quotes skip, quotes older than 24
-- hours bypass the market gate, and missing quotes queue exactly once.
DELETE FROM public.api_call_queue_v2 WHERE symbol LIKE 'VFY\_QUOTE\_%' ESCAPE '\';
DELETE FROM public.live_quote_indicators WHERE symbol LIKE 'VFY\_QUOTE\_%' ESCAPE '\';
DELETE FROM public.exchange_market_status WHERE exchange_code = 'VFY_CLOSED';

INSERT INTO public.exchange_market_status (
  exchange_code, name, timezone, is_market_open
)
VALUES ('VFY_CLOSED', 'Verification Closed Exchange', 'UTC', FALSE);

INSERT INTO public.live_quote_indicators (
  symbol, current_price, api_timestamp, fetched_at, exchange
)
VALUES
  ('VFY_QUOTE_FRESH', 10, EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '5 minutes', 'VFY_CLOSED'),
  ('VFY_QUOTE_STALE', 10, EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '25 hours', 'VFY_CLOSED');

SELECT public.check_and_queue_stale_batch_v2('VFY_QUOTE_FRESH', ARRAY['quote'], 7);
SELECT public.check_and_queue_stale_batch_v2('VFY_QUOTE_STALE', ARRAY['quote'], 7);
SELECT public.check_and_queue_stale_batch_v2('VFY_QUOTE_MISSING', ARRAY['quote'], 7);
SELECT public.check_and_queue_stale_batch_v2('VFY_QUOTE_STALE', ARRAY['quote'], 9);

DO $$
DECLARE
  fresh_count integer;
  stale_count integer;
  missing_count integer;
  stale_priority integer;
BEGIN
  SELECT COUNT(*) INTO fresh_count
  FROM public.api_call_queue_v2
  WHERE symbol = 'VFY_QUOTE_FRESH' AND status IN ('pending', 'processing');

  SELECT COUNT(*), MAX(priority) INTO stale_count, stale_priority
  FROM public.api_call_queue_v2
  WHERE symbol = 'VFY_QUOTE_STALE' AND status IN ('pending', 'processing');

  SELECT COUNT(*) INTO missing_count
  FROM public.api_call_queue_v2
  WHERE symbol = 'VFY_QUOTE_MISSING' AND status IN ('pending', 'processing');

  IF fresh_count <> 0 OR stale_count <> 1 OR missing_count <> 1 OR stale_priority <> 9 THEN
    RAISE EXCEPTION
      'Stale quote behavior mismatch (fresh %, stale %, missing %, priority %)',
      fresh_count, stale_count, missing_count, stale_priority;
  END IF;
END;
$$;

ROLLBACK;

\echo 'backend_ranking_verification: PASS'
