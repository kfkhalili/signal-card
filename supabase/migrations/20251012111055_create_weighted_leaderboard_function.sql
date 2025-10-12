CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(weights jsonb)
 RETURNS TABLE(rank bigint, symbol text, composite_score numeric)
 LANGUAGE plpgsql
AS $function$BEGIN
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
        ps.value_score * (weights->>'value')::NUMERIC +
        ps.growth_score * (weights->>'growth')::NUMERIC +
        ps.profitability_score * (weights->>'profitability')::NUMERIC +
        ps.income_score * (weights->>'income')::NUMERIC +
        ps.health_score * (weights->>'health')::NUMERIC
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
END;$function$
;
