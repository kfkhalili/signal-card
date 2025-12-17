-- Restore the 5-pillar leaderboard function to match the original design
-- This migration reverts from the 3-pillar system back to the 5-pillar system
-- and ensures the function matches the frontend expectations

CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(weights jsonb)
 RETURNS TABLE(rank bigint, symbol text, composite_score numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, extensions
AS $function$
BEGIN
  RETURN QUERY
  WITH normalized_metrics AS (
    SELECT
      rt.symbol,
      (1 - PERCENT_RANK() OVER (ORDER BY price_to_book_ratio_ttm ASC)) * 100 AS norm_pb,
      (1 - PERCENT_RANK() OVER (ORDER BY price_to_sales_ratio_ttm ASC)) * 100 AS norm_ps,
      (1 - PERCENT_RANK() OVER (ORDER BY enterprise_value_multiple_ttm ASC)) * 100 AS norm_evm,
      (1 - PERCENT_RANK() OVER (ORDER BY price_to_earnings_growth_ratio_ttm ASC)) * 100 AS norm_peg,
      PERCENT_RANK() OVER (ORDER BY net_profit_margin_ttm ASC) * 100 AS norm_npm,
      PERCENT_RANK() OVER (ORDER BY asset_turnover_ttm ASC) * 100 AS norm_at,
      PERCENT_RANK() OVER (ORDER BY dividend_yield_ttm ASC) * 100 AS norm_div_yield,
      (1 - PERCENT_RANK() OVER (ORDER BY debt_to_equity_ratio_ttm ASC)) * 100 AS norm_de
    FROM
      public.ratios_ttm as rt
    INNER JOIN public.listed_symbols ls
      ON rt.symbol = ls.symbol
    WHERE
      ls.is_active = TRUE
  ),
  pillar_scores AS (
    SELECT
      nm.symbol,
      (nm.norm_pb + nm.norm_ps + nm.norm_evm) / 3 AS value_score,
      nm.norm_peg AS growth_score,
      (nm.norm_npm + nm.norm_at) / 2 AS profitability_score,
      nm.norm_div_yield AS income_score,
      nm.norm_de AS health_score
    FROM
      normalized_metrics AS nm
  ),
  composite_scores AS (
    SELECT
      ps.symbol,
      (
        ps.value_score * COALESCE((weights->>'value')::NUMERIC, 0.2) +
        ps.growth_score * COALESCE((weights->>'growth')::NUMERIC, 0.2) +
        ps.profitability_score * COALESCE((weights->>'profitability')::NUMERIC, 0.2) +
        ps.income_score * COALESCE((weights->>'income')::NUMERIC, 0.2) +
        ps.health_score * COALESCE((weights->>'health')::NUMERIC, 0.2)
      ) AS final_score
    FROM
      pillar_scores AS ps
  )
  SELECT
    RANK() OVER (ORDER BY cs.final_score DESC) as rank,
    cs.symbol,
    cs.final_score::NUMERIC AS composite_score
  FROM
    composite_scores cs
  ORDER BY
    cs.final_score DESC
  LIMIT 50;
END;
$function$;

COMMENT ON FUNCTION public.get_weighted_leaderboard(jsonb) IS
'5-pillar leaderboard function for Market Compass.
Uses five pillars: Value (P/B, P/S, EVM), Growth (PEG), Profitability (Net Profit Margin, Asset Turnover),
Income (Dividend Yield), and Health (Debt/Equity).
Weights should be provided as JSONB with keys: value, growth, profitability, income, health (defaults to 0.2 each).';
