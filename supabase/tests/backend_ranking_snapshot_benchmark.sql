\set ON_ERROR_STOP on
\timing on

BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL jit = off;
SET LOCAL search_path = public, extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE active) THEN
    RAISE EXCEPTION 'Zero-FMP preflight failed: active cron jobs exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name IN (
      'project_url', 'supabase_url', 'anon_key', 'service_role_key',
      'fmp_api_key', 'FMP_API_KEY'
    )
  ) THEN
    RAISE EXCEPTION 'Zero-FMP preflight failed: callable project/FMP secrets exist';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users)
     OR EXISTS (SELECT 1 FROM public.user_profiles) THEN
    RAISE EXCEPTION 'Snapshot sanitization failed: user data exists';
  END IF;
END;
$$;

ANALYZE public.profiles;
ANALYZE public.listed_symbols;
ANALYZE public.exchange_variants;
ANALYZE public.compass_pillar_scores;

\echo 'SNAPSHOT: dataset coverage'
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS profiles,
  (SELECT COUNT(*) FROM public.listed_symbols) AS listed_symbols,
  (SELECT COUNT(*) FROM public.listed_symbols WHERE is_active) AS active_symbols,
  (SELECT COUNT(*) FROM public.exchange_variants) AS exchange_variants,
  (SELECT COUNT(*) FROM public.compass_pillar_scores) AS scored_symbols,
  (
    SELECT COUNT(*)
    FROM public.compass_pillar_scores
    WHERE norm_ps IS NULL
       OR norm_evm IS NULL
       OR norm_sentiment IS NULL
       OR norm_profitability_yield IS NULL
       OR norm_buyback_yield IS NULL
       OR norm_peg IS NULL
       OR norm_div_yield IS NULL
       OR norm_health IS NULL
  ) AS incomplete_scores;

CREATE TEMP TABLE snapshot_benchmark_filters AS
WITH industry_counts AS (
  SELECT industry, COUNT(*) AS row_count
  FROM public.compass_pillar_scores
  WHERE industry IS NOT NULL
  GROUP BY industry
  ORDER BY row_count DESC, industry
  LIMIT 2
),
exchange_counts AS (
  SELECT exchange_short_name, COUNT(DISTINCT symbol) AS symbol_count
  FROM public.exchange_variants
  GROUP BY exchange_short_name
  ORDER BY symbol_count DESC, exchange_short_name
  LIMIT 2
)
SELECT
  ARRAY(
    SELECT industry
    FROM industry_counts
    ORDER BY row_count DESC, industry
  )::text[] AS industries,
  ARRAY(
    SELECT exchange_short_name
    FROM exchange_counts
    ORDER BY symbol_count DESC, exchange_short_name
  )::text[] AS exchanges;

\echo 'SNAPSHOT: production-skew filters'
TABLE snapshot_benchmark_filters;

CREATE TEMP TABLE snapshot_benchmark_samples (
  variant text NOT NULL,
  sample_no integer NOT NULL,
  elapsed_ms double precision NOT NULL
);

DO $$
DECLARE
  benchmark_weights CONSTANT jsonb :=
    '{"revenue":0.13,"value":0.12,"sentiment":0.13,"growth":0.12,"profitability":0.12,"buyback":0.13,"income":0.12,"health":0.13}'::jsonb;
  selected_industries text[];
  selected_exchanges text[];
  sample_number integer;
  started_at timestamptz;
BEGIN
  SELECT industries, exchanges
  INTO selected_industries, selected_exchanges
  FROM snapshot_benchmark_filters;

  -- Prime relation and function caches before collecting alternating samples.
  PERFORM *
  FROM public.get_weighted_leaderboard(benchmark_weights, NULL, NULL);

  PERFORM *
  FROM public.get_weighted_leaderboard(
    benchmark_weights, selected_industries, selected_exchanges
  );

  FOR sample_number IN 1..30 LOOP
    started_at := clock_timestamp();
    PERFORM *
    FROM public.get_weighted_leaderboard(benchmark_weights, NULL, NULL);
    INSERT INTO snapshot_benchmark_samples
    VALUES (
      'unfiltered', sample_number,
      EXTRACT(EPOCH FROM clock_timestamp() - started_at) * 1000
    );

    started_at := clock_timestamp();
    PERFORM *
    FROM public.get_weighted_leaderboard(
      benchmark_weights, selected_industries, selected_exchanges
    );
    INSERT INTO snapshot_benchmark_samples
    VALUES (
      'top-2-industries+exchanges', sample_number,
      EXTRACT(EPOCH FROM clock_timestamp() - started_at) * 1000
    );
  END LOOP;
END;
$$;

\echo 'SNAPSHOT: 30-sample latency summary (server-side milliseconds)'
SELECT
  variant,
  COUNT(*) AS samples,
  ROUND(MIN(elapsed_ms)::numeric, 3) AS minimum_ms,
  ROUND(AVG(elapsed_ms)::numeric, 3) AS average_ms,
  ROUND(
    percentile_cont(0.50) WITHIN GROUP (ORDER BY elapsed_ms)::numeric,
    3
  ) AS p50_ms,
  ROUND(
    percentile_cont(0.95) WITHIN GROUP (ORDER BY elapsed_ms)::numeric,
    3
  ) AS p95_ms,
  ROUND(MAX(elapsed_ms)::numeric, 3) AS maximum_ms
FROM snapshot_benchmark_samples
GROUP BY variant
ORDER BY variant;

\echo 'SNAPSHOT PLAN: unfiltered leaderboard'
EXPLAIN (ANALYZE, BUFFERS, TIMING, SUMMARY)
SELECT *
FROM public.get_weighted_leaderboard(
  '{"revenue":0.13,"value":0.12,"sentiment":0.13,"growth":0.12,"profitability":0.12,"buyback":0.13,"income":0.12,"health":0.13}'::jsonb,
  NULL,
  NULL
);

\echo 'SNAPSHOT PLAN: top-2 industry/exchange filters'
EXPLAIN (ANALYZE, BUFFERS, TIMING, SUMMARY)
SELECT *
FROM public.get_weighted_leaderboard(
  '{"revenue":0.13,"value":0.12,"sentiment":0.13,"growth":0.12,"profitability":0.12,"buyback":0.13,"income":0.12,"health":0.13}'::jsonb,
  (SELECT industries FROM snapshot_benchmark_filters),
  (SELECT exchanges FROM snapshot_benchmark_filters)
);

ROLLBACK;

\echo 'backend_ranking_snapshot_benchmark: COMPLETE'
