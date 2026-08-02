\set ON_ERROR_STOP on

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = public, extensions;

DELETE FROM public.listed_symbols
WHERE symbol LIKE 'VFY_GROWTH\_%' ESCAPE '\';
DELETE FROM public.profiles
WHERE symbol LIKE 'VFY_GROWTH\_%' ESCAPE '\';

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
    'VFY_GROWTH_GOOD', 'Verification Durable Growth', 20, 500000000,
    200000, 'NASDAQ', 'Technology', 'VFY Growth', false, false, false
  ),
  (
    'VFY_GROWTH_SLOW', 'Verification Slow Growth', 20, 500000000,
    200000, 'NASDAQ', 'Technology', 'VFY Growth', false, false, false
  ),
  (
    'VFY_GROWTH_DILUTED', 'Verification Diluted Growth', 20, 500000000,
    200000, 'NASDAQ', 'Technology', 'VFY Growth', false, false, false
  ),
  (
    'VFY_GROWTH_BANK', 'Verification Growth Bank', 20, 500000000,
    200000, 'NYSE', 'Financial Services', 'VFY Growth', false, false, false
  );

INSERT INTO public.listed_symbols (
  symbol,
  is_active,
  fmp_is_actively_trading
)
VALUES
  ('VFY_GROWTH_GOOD', true, true),
  ('VFY_GROWTH_SLOW', true, true),
  ('VFY_GROWTH_DILUTED', true, true),
  ('VFY_GROWTH_BANK', true, true);

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
    'VFY_GROWTH_GOOD', (CURRENT_DATE - INTERVAL '6 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '5 months',
    '{"revenue":144,"operatingIncome":14.4,"incomeBeforeTax":15,"incomeTaxExpense":3,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":60,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":11.52}'
  ),
  (
    'VFY_GROWTH_GOOD', (CURRENT_DATE - INTERVAL '18 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '17 months',
    '{"revenue":120,"operatingIncome":12,"incomeBeforeTax":12.5,"incomeTaxExpense":2.5,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":55,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":9.6}'
  ),
  (
    'VFY_GROWTH_GOOD', (CURRENT_DATE - INTERVAL '30 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '29 months',
    '{"revenue":100,"operatingIncome":10,"incomeBeforeTax":10.5,"incomeTaxExpense":2.1,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":50,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":8}'
  ),
  (
    'VFY_GROWTH_SLOW', (CURRENT_DATE - INTERVAL '6 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '5 months',
    '{"revenue":110.25,"operatingIncome":11.025,"incomeBeforeTax":11.5,"incomeTaxExpense":2.3,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":75,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":8.82}'
  ),
  (
    'VFY_GROWTH_SLOW', (CURRENT_DATE - INTERVAL '18 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '17 months',
    '{"revenue":105,"operatingIncome":10.5,"incomeBeforeTax":11,"incomeTaxExpense":2.2,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":72,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":8.4}'
  ),
  (
    'VFY_GROWTH_SLOW', (CURRENT_DATE - INTERVAL '30 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '29 months',
    '{"revenue":100,"operatingIncome":10,"incomeBeforeTax":10.5,"incomeTaxExpense":2.1,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":70,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":8}'
  ),
  (
    'VFY_GROWTH_DILUTED', (CURRENT_DATE - INTERVAL '6 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '5 months',
    '{"revenue":200,"operatingIncome":20,"incomeBeforeTax":21,"incomeTaxExpense":4.2,"weightedAverageShsOutDil":100}',
    '{"totalStockholdersEquity":80,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":16}'
  ),
  (
    'VFY_GROWTH_DILUTED', (CURRENT_DATE - INTERVAL '18 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '17 months',
    '{"revenue":150,"operatingIncome":15,"incomeBeforeTax":16,"incomeTaxExpense":3.2,"weightedAverageShsOutDil":20}',
    '{"totalStockholdersEquity":60,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":12}'
  ),
  (
    'VFY_GROWTH_DILUTED', (CURRENT_DATE - INTERVAL '30 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '29 months',
    '{"revenue":100,"operatingIncome":10,"incomeBeforeTax":10.5,"incomeTaxExpense":2.1,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":50,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":8}'
  ),
  (
    'VFY_GROWTH_BANK', (CURRENT_DATE - INTERVAL '6 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '5 months',
    '{"revenue":144,"operatingIncome":14.4,"incomeBeforeTax":15,"incomeTaxExpense":3,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":60,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":11.52}'
  ),
  (
    'VFY_GROWTH_BANK', (CURRENT_DATE - INTERVAL '18 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '17 months',
    '{"revenue":120,"operatingIncome":12,"incomeBeforeTax":12.5,"incomeTaxExpense":2.5,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":55,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":9.6}'
  ),
  (
    'VFY_GROWTH_BANK', (CURRENT_DATE - INTERVAL '30 months')::date, 'FY',
    CURRENT_DATE - INTERVAL '29 months',
    '{"revenue":100,"operatingIncome":10,"incomeBeforeTax":10.5,"incomeTaxExpense":2.1,"weightedAverageShsOutDil":10}',
    '{"totalStockholdersEquity":50,"totalDebt":10,"cashAndCashEquivalents":5}',
    '{"freeCashFlow":8}'
  );

DO $$
DECLARE
  actual_symbols text[];
  good record;
  slow record;
BEGIN
  SELECT pg_catalog.array_agg(result.symbol ORDER BY result.rank)
  INTO actual_symbols
  FROM public.get_compass_growth_shadow_leaderboard_v2(
    50,
    ARRAY['VFY Growth'],
    NULL
  ) AS result;

  IF actual_symbols IS DISTINCT FROM
     ARRAY['VFY_GROWTH_GOOD', 'VFY_GROWTH_SLOW']::text[] THEN
    RAISE EXCEPTION 'Growth v2 eligibility/order mismatch: %', actual_symbols;
  END IF;

  SELECT * INTO good
  FROM public.get_compass_growth_shadow_leaderboard_v2(
    50,
    ARRAY['VFY Growth'],
    NULL
  )
  WHERE symbol = 'VFY_GROWTH_GOOD';

  SELECT * INTO slow
  FROM public.get_compass_growth_shadow_leaderboard_v2(
    50,
    ARRAY['VFY Growth'],
    NULL
  )
  WHERE symbol = 'VFY_GROWTH_SLOW';

  IF good.rank <> 1 OR good.growth_score <= slow.growth_score THEN
    RAISE EXCEPTION 'Durable growth should outrank slow growth: good %, slow %',
      good, slow;
  END IF;

  IF good.revenue_per_share_cagr NOT BETWEEN 0.19 AND 0.21
     OR good.operating_income_per_share_cagr NOT BETWEEN 0.19 AND 0.21
     OR good.free_cash_flow_per_share_cagr NOT BETWEEN 0.19 AND 0.21
     OR good.growth_consistency IS DISTINCT FROM 1.0000::numeric THEN
    RAISE EXCEPTION 'Durable-growth calculations mismatch: %', good;
  END IF;

  IF good.metric_coverage <> 5 OR good.return_on_invested_capital <= 0 THEN
    RAISE EXCEPTION 'Growth v2 coverage/ROIC mismatch: %', good;
  END IF;

  IF pg_catalog.has_function_privilege(
    'anon',
    'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])',
    'EXECUTE'
  ) OR pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_compass_growth_shadow_leaderboard_v2(integer,text[],text[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Growth v2 shadow leaderboard must be service-only';
  END IF;
END;
$$;

ROLLBACK;

\echo 'compass_growth_v2_shadow: PASS'
