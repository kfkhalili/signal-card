\set ON_ERROR_STOP on
\timing on

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL jit = off;
SET LOCAL search_path = public, extensions;

INSERT INTO public.profiles (symbol, company_name)
SELECT
  'VFY_BENCH_' || LPAD(series::text, 5, '0'),
  'Verification Benchmark ' || series
FROM generate_series(1, 18000) AS series;

INSERT INTO public.listed_symbols (symbol, is_active)
SELECT
  'VFY_BENCH_' || LPAD(series::text, 5, '0'),
  series % 20 <> 0
FROM generate_series(1, 18000) AS series;

INSERT INTO public.compass_pillar_scores (
  symbol, industry, market_cap, revenue_ttm,
  norm_ps, ps_rank, norm_evm, evm_rank,
  norm_sentiment, sentiment_rank,
  norm_profitability_yield, profitability_rank,
  norm_buyback_yield, buyback_rank,
  norm_peg, peg_rank, norm_div_yield, div_yield_rank,
  norm_health, health_rank, updated_at
)
SELECT
  'VFY_BENCH_' || LPAD(series::text, 5, '0'),
  CASE series % 4
    WHEN 0 THEN 'Technology'
    WHEN 1 THEN 'Healthcare'
    WHEN 2 THEN 'Industrials'
    ELSE 'Financial Services'
  END,
  series::bigint * 1000000,
  series::numeric * 400000,
  (series * 3) % 101, series,
  (series * 5) % 101, series,
  (series * 7) % 101, series,
  (series * 11) % 101, series,
  (series * 13) % 101, series,
  (series * 17) % 101, series,
  (series * 19) % 101, series,
  (series * 23) % 101, series,
  NOW() - ((series % 120) || ' minutes')::interval
FROM generate_series(1, 18000) AS series;

INSERT INTO public.exchange_variants (
  symbol, symbol_variant, exchange_short_name
)
SELECT
  'VFY_BENCH_' || LPAD(series::text, 5, '0'),
  'VFY_BENCH_' || LPAD(series::text, 5, '0'),
  CASE series % 3
    WHEN 0 THEN 'NASDAQ'
    WHEN 1 THEN 'NYSE'
    ELSE 'XETRA'
  END
FROM generate_series(1, 18000) AS series;

ANALYZE public.listed_symbols;
ANALYZE public.compass_pillar_scores;
ANALYZE public.exchange_variants;

\echo 'BENCHMARK: unfiltered 18k-symbol leaderboard'
EXPLAIN (ANALYZE, BUFFERS, TIMING, SUMMARY)
SELECT *
FROM public.get_weighted_leaderboard(
  '{"revenue":0.13,"value":0.12,"sentiment":0.13,"growth":0.12,"profitability":0.12,"buyback":0.13,"income":0.12,"health":0.13}'::jsonb,
  NULL,
  NULL
);

\echo 'BENCHMARK: combined industry/exchange filter'
EXPLAIN (ANALYZE, BUFFERS, TIMING, SUMMARY)
SELECT *
FROM public.get_weighted_leaderboard(
  '{"revenue":0.13,"value":0.12,"sentiment":0.13,"growth":0.12,"profitability":0.12,"buyback":0.13,"income":0.12,"health":0.13}'::jsonb,
  ARRAY['Technology', 'Healthcare'],
  ARRAY['nasdaq', 'nyse']
);

ROLLBACK;

\echo 'backend_ranking_benchmark: COMPLETE'
