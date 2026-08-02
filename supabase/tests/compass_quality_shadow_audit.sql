\set ON_ERROR_STOP on

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = public, extensions;

DELETE FROM public.compass_pillar_scores
WHERE symbol IN ('VFY_QUALITY_GEM', 'VFY_VALUE_TRAP');
DELETE FROM public.listed_symbols
WHERE symbol IN ('VFY_QUALITY_GEM', 'VFY_VALUE_TRAP');
DELETE FROM public.profiles
WHERE symbol IN ('VFY_QUALITY_GEM', 'VFY_VALUE_TRAP');

INSERT INTO public.profiles (
  symbol,
  company_name,
  price,
  market_cap,
  average_volume,
  exchange,
  sector,
  industry,
  is_etf,
  is_fund,
  is_adr
)
VALUES
  (
    'VFY_QUALITY_GEM', 'Verification Quality Gem', 20, 500000000,
    200000, 'NASDAQ', 'Technology', 'Software', false, false, false
  ),
  (
    'VFY_VALUE_TRAP', 'Verification Value Trap', 0.5, 10000000,
    1000, 'NASDAQ', 'Technology', 'Software', false, false, false
  );

INSERT INTO public.listed_symbols (
  symbol,
  is_active,
  fmp_is_actively_trading
)
VALUES
  ('VFY_QUALITY_GEM', true, true),
  ('VFY_VALUE_TRAP', true, true);

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
  (
    'VFY_QUALITY_GEM', 'Software', 500000000, 120000000,
    90, 1, 90, 1, 90, 1, 90, 1, 90, 1, 90, 1, 90, 1, 90, 1
  ),
  (
    'VFY_VALUE_TRAP', 'Software', 10000000, 80000000,
    95, 2, 95, 2, 95, 2, 95, 2, 95, 2, 95, 2, 95, 2, 95, 2
  );

INSERT INTO public.ratios_ttm (
  symbol,
  price_to_earnings_ratio_ttm,
  price_to_earnings_growth_ratio_ttm,
  price_to_free_cash_flow_ratio_ttm,
  enterprise_value_multiple_ttm
)
VALUES
  ('VFY_QUALITY_GEM', 12, 1.2, 15, 9),
  ('VFY_VALUE_TRAP', 0, -3, -1, -2);

INSERT INTO public.financial_statements (
  symbol,
  date,
  period,
  accepted_date,
  income_statement_payload,
  balance_sheet_payload,
  cash_flow_payload
)
VALUES
  (
    'VFY_QUALITY_GEM', '2025-12-31', 'FY', '2026-02-15T12:00:00Z',
    '{"revenue":120000000,"grossProfit":60000000,"netIncome":20000000,"weightedAverageShsOutDil":9500000}',
    '{"totalAssets":500000000,"totalDebt":80000000}',
    '{"operatingCashFlow":30000000,"freeCashFlow":25000000}'
  ),
  (
    'VFY_QUALITY_GEM', '2024-12-31', 'FY', '2025-02-15T12:00:00Z',
    '{"revenue":100000000,"grossProfit":48000000,"netIncome":16000000,"weightedAverageShsOutDil":10000000}',
    '{"totalAssets":450000000,"totalDebt":90000000}',
    '{"operatingCashFlow":25000000,"freeCashFlow":20000000}'
  ),
  (
    'VFY_QUALITY_GEM', '2023-12-31', 'FY', '2024-02-15T12:00:00Z',
    '{"revenue":90000000,"grossProfit":42000000,"netIncome":14000000,"weightedAverageShsOutDil":10200000}',
    '{"totalAssets":420000000,"totalDebt":95000000}',
    '{"operatingCashFlow":22000000,"freeCashFlow":18000000}'
  ),
  (
    'VFY_VALUE_TRAP', '2025-12-31', 'FY', '2026-02-15T12:00:00Z',
    '{"revenue":80000000,"grossProfit":-5000000,"netIncome":-10000000,"weightedAverageShsOutDil":100000000}',
    '{"totalAssets":10000000,"totalDebt":9000000}',
    '{"operatingCashFlow":-5000000,"freeCashFlow":-5000000}'
  ),
  (
    'VFY_VALUE_TRAP', '2024-12-31', 'FY', '2025-02-15T12:00:00Z',
    '{"revenue":100000000,"grossProfit":1000000,"netIncome":-2000000,"weightedAverageShsOutDil":20000000}',
    '{"totalAssets":12000000,"totalDebt":7000000}',
    '{"operatingCashFlow":-1000000,"freeCashFlow":-2000000}'
  ),
  (
    'VFY_VALUE_TRAP', '2023-12-31', 'FY', '2024-02-15T12:00:00Z',
    '{"revenue":105000000,"grossProfit":2000000,"netIncome":1000000,"weightedAverageShsOutDil":18000000}',
    '{"totalAssets":15000000,"totalDebt":5000000}',
    '{"operatingCashFlow":2000000,"freeCashFlow":1000000}'
  );

DO $$
DECLARE
  equal_weights CONSTANT jsonb :=
    '{"revenue":0.125,"value":0.125,"sentiment":0.125,"growth":0.125,"profitability":0.125,"buyback":0.125,"income":0.125,"health":0.125}'::jsonb;
  gem record;
  trap record;
BEGIN
  SELECT * INTO gem
  FROM public.get_compass_quality_shadow_audit(
    equal_weights, 50, ARRAY['Software'], NULL
  )
  WHERE symbol = 'VFY_QUALITY_GEM';

  SELECT * INTO trap
  FROM public.get_compass_quality_shadow_audit(
    equal_weights, 50, ARRAY['Software'], NULL
  )
  WHERE symbol = 'VFY_VALUE_TRAP';

  IF gem.symbol IS NULL OR NOT gem.passes_provisional_gate THEN
    RAISE EXCEPTION 'Quality-gem fixture should pass: %', gem;
  END IF;

  IF gem.positive_fcf_years <> 3
     OR gem.share_dilution_yoy IS DISTINCT FROM -0.0500::numeric
     OR gem.revenue_growth_yoy IS DISTINCT FROM 0.2000::numeric THEN
    RAISE EXCEPTION 'Quality-gem diagnostics mismatch: %', gem;
  END IF;

  IF trap.symbol IS NULL OR trap.passes_provisional_gate THEN
    RAISE EXCEPTION 'Value-trap fixture should fail: %', trap;
  END IF;

  IF NOT trap.gate_failures @> ARRAY[
    'market_cap_below_50m',
    'average_dollar_volume_below_500k',
    'fewer_than_3_positive_fcf_years',
    'share_dilution_over_50pct'
  ]::text[] THEN
    RAISE EXCEPTION 'Expected value-trap failures are missing: %', trap.gate_failures;
  END IF;

  IF NOT trap.risk_flags @> ARRAY[
    'peg_nonpositive_or_missing',
    'pe_nonpositive_or_missing',
    'price_to_fcf_nonpositive_or_missing',
    'enterprise_multiple_nonpositive_or_missing',
    'revenue_decline_over_10pct'
  ]::text[] THEN
    RAISE EXCEPTION 'Expected value-trap warnings are missing: %', trap.risk_flags;
  END IF;

  IF pg_catalog.has_function_privilege(
    'anon',
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])',
    'EXECUTE'
  ) OR pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Shadow audit must remain inaccessible to client roles';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'service_role',
    'public.get_compass_quality_shadow_audit(jsonb,integer,text[],text[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Service role cannot execute shadow audit';
  END IF;
END;
$$;

ROLLBACK;

\echo 'compass_quality_shadow_audit: PASS'
