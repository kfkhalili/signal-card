-- Contract #25: the public Compass leaderboard uses precomputed Growth v2,
-- excludes ineligible companies only when Growth is weighted, and does not
-- fall back to PEG.

BEGIN;
SELECT plan(6);

SELECT ok(
  position(
    'norm_growth_v2'
    IN pg_get_functiondef(
      'public.get_weighted_leaderboard(jsonb,text[],text[])'::regprocedure
    )
  ) > 0,
  'Contract #25: public Compass reads the precomputed Growth v2 score'
);

SELECT ok(
  position(
    'norm_peg * w_gro'
    IN pg_get_functiondef(
      'public.get_weighted_leaderboard(jsonb,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #25: public Compass no longer derives Growth from PEG'
);

INSERT INTO public.profiles (symbol, company_name)
VALUES
  ('VFY_CUTOVER_VALID', 'Verification Growth v2 Eligible'),
  ('VFY_CUTOVER_LEGACY', 'Verification Legacy PEG Only');

INSERT INTO public.listed_symbols (
  symbol,
  is_active,
  fmp_is_actively_trading
)
VALUES
  ('VFY_CUTOVER_VALID', true, true),
  ('VFY_CUTOVER_LEGACY', true, true);

INSERT INTO public.compass_pillar_scores (
  symbol,
  industry,
  market_cap,
  revenue_ttm,
  norm_ps,
  ps_rank,
  norm_evm,
  evm_rank,
  norm_sentiment,
  sentiment_rank,
  norm_profitability_yield,
  profitability_rank,
  norm_buyback_yield,
  buyback_rank,
  norm_peg,
  peg_rank,
  norm_div_yield,
  div_yield_rank,
  norm_health,
  health_rank,
  norm_growth_v2,
  growth_v2_rank
)
VALUES
  (
    'VFY_CUTOVER_VALID', 'VFY Growth Cutover', 100000000, 50000000,
    10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 1, 99, 10, 1, 10, 1,
    90, 7
  ),
  (
    'VFY_CUTOVER_LEGACY', 'VFY Growth Cutover', 100000000, 50000000,
    20, 2, 20, 2, 20, 2, 20, 2, 20, 2, 100, 1, 20, 2, 20, 2,
    NULL, NULL
  );

SELECT is(
  (
    SELECT pg_catalog.count(*)::integer
    FROM public.get_weighted_leaderboard(
      '{"revenue":0,"value":0,"sentiment":0,"growth":1,"profitability":0,"buyback":0,"income":0,"health":0}'::jsonb,
      ARRAY['VFY Growth Cutover'],
      NULL
    )
  ),
  1,
  'Contract #25: positive Growth weight excludes candidates without Growth v2'
);

SELECT is(
  (
    SELECT composite_score
    FROM public.get_weighted_leaderboard(
      '{"revenue":0,"value":0,"sentiment":0,"growth":1,"profitability":0,"buyback":0,"income":0,"health":0}'::jsonb,
      ARRAY['VFY Growth Cutover'],
      NULL
    )
    WHERE symbol = 'VFY_CUTOVER_VALID'
  ),
  90.00::numeric,
  'Contract #25: Growth weight contributes the Growth v2 score'
);

SELECT is(
  (
    SELECT peg_rank
    FROM public.get_weighted_leaderboard(
      '{"revenue":0,"value":0,"sentiment":0,"growth":1,"profitability":0,"buyback":0,"income":0,"health":0}'::jsonb,
      ARRAY['VFY Growth Cutover'],
      NULL
    )
    WHERE symbol = 'VFY_CUTOVER_VALID'
  ),
  7::bigint,
  'Contract #25: compatibility rank field reports Growth v2 rank'
);

SELECT is(
  (
    SELECT pg_catalog.count(*)::integer
    FROM public.get_weighted_leaderboard(
      '{"revenue":0,"value":0,"sentiment":0,"growth":0,"profitability":0,"buyback":0,"income":0,"health":1}'::jsonb,
      ARRAY['VFY Growth Cutover'],
      NULL
    )
  ),
  2,
  'Contract #25: zero Growth weight preserves non-Growth candidates'
);

SELECT * FROM finish();
ROLLBACK;
