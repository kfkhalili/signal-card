-- Migration to update Compass ranking function with new metrics (Sentiment, Buyback, etc.)
-- Updates return signature to include market_cap, revenue, and sub-ranks.

-- First, drop the existing function because the return type (columns) has changed
DROP FUNCTION IF EXISTS public.get_weighted_leaderboard(jsonb);

-- Recreate the function with the new logic and signature
CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(weights jsonb)
 RETURNS TABLE(
   rank bigint,
   symbol text,
   composite_score numeric,
   market_cap bigint,
   revenue numeric,
   ps_rank bigint,
   evm_rank bigint,
   sentiment_rank bigint
 )
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, extensions
AS $function$
BEGIN
  RETURN QUERY
  WITH insider_impact AS (
    -- Calculate Net Insider Value Bought (Last 12 Months)
    SELECT 
      symbol, 
      SUM(
        CASE 
          WHEN acquisition_or_disposition = 'A' THEN (securities_transacted * price)
          WHEN acquisition_or_disposition = 'D' THEN -(securities_transacted * price)
          ELSE 0 
        END
      ) as net_value_bought
    FROM public.insider_transactions
    WHERE 
      transaction_date >= (CURRENT_DATE - INTERVAL '1 year')
      AND price > 0 
    GROUP BY symbol
  ),
  annual_stats AS (
    -- Get Latest Annual Data: Revenue (for fallback), converted to USD
    SELECT DISTINCT ON (fs.symbol)
      fs.symbol,
      fs.date,
      (fs.income_statement_payload->>'revenue')::numeric * CASE 
          WHEN fs.reported_currency = 'USD' THEN 1.0
          ELSE COALESCE(er.rate::numeric, NULL) -- Returns NULL if rate is missing for non-USD
        END AS revenue
    FROM public.financial_statements fs
    LEFT JOIN public.exchange_rates er 
      ON fs.reported_currency = er.base_code 
      AND er.target_code = 'USD'
    WHERE fs.period = 'FY'
    ORDER BY fs.symbol, fs.date DESC
  ),
  historical_shares AS (
    -- Get Historical Shares for Buyback Calc (Last 5 Years FY)
    SELECT
      symbol,
      date,
      (income_statement_payload->>'weightedAverageShsOut')::numeric AS shares
    FROM public.financial_statements
    WHERE period = 'FY'
    AND date >= (CURRENT_DATE - INTERVAL '5 years')
  ),
  prev_year_shares AS (
    -- Calculate previous year's shares for change computation
    SELECT
      symbol,
      date,
      shares,
      LAG(shares) OVER (PARTITION BY symbol ORDER BY date) as prev_shares
    FROM historical_shares
  ),
  avg_buyback_stats AS (
    -- Average the percentage changes
    SELECT
      symbol,
      AVG(CASE WHEN prev_shares > 0 THEN (shares - prev_shares) / prev_shares ELSE 0 END) as avg_share_change
    FROM prev_year_shares
    WHERE prev_shares IS NOT NULL
    GROUP BY symbol
  ),
  revenue_calc AS (
    -- Calculate Revenue TTM with Currency Conversion
    -- Strategy: Sum last 4 quarters (converted to USD). If incomplete (<4), use Latest Annual (converted).
    WITH q_data AS (
      SELECT
        sub.symbol,
        SUM(
          (sub.income_statement_payload->>'revenue')::numeric * CASE 
            WHEN sub.reported_currency = 'USD' THEN 1.0
            ELSE COALESCE(er.rate::numeric, NULL)
          END
        ) as q_revenue,
        COUNT(*) as q_count
      FROM (
        SELECT
          symbol,
          income_statement_payload,
          reported_currency,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
        FROM public.financial_statements
        WHERE period IS DISTINCT FROM 'FY'
      ) sub
      LEFT JOIN public.exchange_rates er 
        ON sub.reported_currency = er.base_code 
        AND er.target_code = 'USD'
      WHERE sub.rn <= 4
      GROUP BY sub.symbol
    )
    SELECT
      ls.symbol,
      CASE 
        WHEN qd.q_count = 4 THEN qd.q_revenue
        ELSE ans.revenue 
      END as revenue_ttm
    FROM public.listed_symbols ls
    LEFT JOIN q_data qd ON ls.symbol = qd.symbol
    LEFT JOIN annual_stats ans ON ls.symbol = ans.symbol
    WHERE ls.is_active = TRUE
  ),
  normalized_metrics AS (
    SELECT
      rt.symbol,
      
      -- DATA FOR OUTPUT
      p.market_cap,
      rc.revenue_ttm,

      -- METRIC 1: Revenue / Market Cap (Sales Yield)
      -- Revenue is now in USD. Assuming Market Cap is USD-aligned.
      PERCENT_RANK() OVER (ORDER BY 
        CASE 
          WHEN p.market_cap > 0 AND rc.revenue_ttm IS NOT NULL THEN rc.revenue_ttm / p.market_cap 
          ELSE NULL 
        END ASC NULLS FIRST
      ) * 100 AS norm_ps,

      RANK() OVER (ORDER BY 
        CASE 
           WHEN p.market_cap > 0 AND rc.revenue_ttm IS NOT NULL THEN rc.revenue_ttm / p.market_cap 
          ELSE NULL 
        END DESC NULLS LAST
      ) as ps_rank,
      
      -- METRIC 2: EV / EBITDA
      (1 - PERCENT_RANK() OVER (ORDER BY 
        CASE 
          WHEN enterprise_value_multiple_ttm > 0 AND enterprise_value_ttm > 0 THEN enterprise_value_multiple_ttm 
          WHEN enterprise_value_multiple_ttm < 0 AND enterprise_value_ttm < 0 THEN enterprise_value_multiple_ttm
          ELSE NULL 
        END ASC NULLS LAST
      )) * 100 AS norm_evm,

      RANK() OVER (ORDER BY 
        CASE 
          WHEN enterprise_value_multiple_ttm > 0 AND enterprise_value_ttm > 0 THEN enterprise_value_multiple_ttm 
          WHEN enterprise_value_multiple_ttm < 0 AND enterprise_value_ttm < 0 THEN enterprise_value_multiple_ttm
          ELSE NULL 
        END ASC NULLS LAST
      ) as evm_rank,

      -- METRIC 3: Sentiment (Insider Net Value Bought)
      PERCENT_RANK() OVER (ORDER BY COALESCE(ii.net_value_bought, 0) ASC) * 100 AS norm_sentiment,
      RANK() OVER (ORDER BY COALESCE(ii.net_value_bought, 0) DESC) as sentiment_rank,

      -- METRIC 4: Profitability (Operating Cash Flow Yield)
      PERCENT_RANK() OVER (ORDER BY 
        CASE 
          WHEN p.price > 0 THEN rt.operating_cash_flow_per_share_ttm / p.price 
          ELSE NULL 
        END ASC NULLS FIRST
      ) * 100 AS norm_ocf_yield,

      -- METRIC 5: Buyback Score (Avg % Change in Shares)
      PERCENT_RANK() OVER (ORDER BY 
        COALESCE(abs.avg_share_change, 0) DESC
      ) * 100 AS norm_buyback_yield,

      -- Other Metrics
      (1 - PERCENT_RANK() OVER (ORDER BY price_to_earnings_growth_ratio_ttm ASC)) * 100 AS norm_peg,
      PERCENT_RANK() OVER (ORDER BY dividend_yield_ttm ASC) * 100 AS norm_div_yield,
      (1 - PERCENT_RANK() OVER (ORDER BY debt_to_equity_ratio_ttm ASC)) * 100 AS norm_de

    FROM
      public.ratios_ttm as rt
    INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
    LEFT JOIN public.profiles p ON rt.symbol = p.symbol
    LEFT JOIN insider_impact ii ON rt.symbol = ii.symbol
    LEFT JOIN avg_buyback_stats abs ON rt.symbol = abs.symbol
    LEFT JOIN revenue_calc rc ON rt.symbol = rc.symbol
    WHERE
      ls.is_active = TRUE
  ),
  pillar_scores AS (
    SELECT
      nm.symbol,
      nm.market_cap,
      nm.revenue_ttm,
      nm.ps_rank,
      nm.evm_rank,
      nm.sentiment_rank,
      
      COALESCE(nm.norm_ps, 0) AS score_ps,
      COALESCE(nm.norm_evm, 0) AS score_evm,
      COALESCE(nm.norm_sentiment, 50) AS score_sentiment,
      
      nm.norm_peg AS growth_score,
      
      -- Profitability Score
      nm.norm_ocf_yield AS profitability_score,
      
      -- Buyback Score
      nm.norm_buyback_yield AS buyback_score,

      nm.norm_div_yield AS income_score,
      nm.norm_de AS health_score
    FROM
      normalized_metrics AS nm
  ),
  composite_scores AS (
    SELECT
      ps.symbol,
      ps.market_cap,
      ps.revenue_ttm,
      ps.ps_rank,
      ps.evm_rank,
      ps.sentiment_rank,
      (
        ps.score_ps * COALESCE((weights->>'revenue')::NUMERIC, 0.15) +
        ps.score_evm * COALESCE((weights->>'value')::NUMERIC, 0.0) +
        ps.score_sentiment * COALESCE((weights->>'sentiment')::NUMERIC, 0.15) +
        
        ps.growth_score * COALESCE((weights->>'growth')::NUMERIC, 0.0) +
        ps.profitability_score * COALESCE((weights->>'profitability')::NUMERIC, 0.2) +
        ps.buyback_score * COALESCE((weights->>'buyback')::NUMERIC, 0.15) + 
        
        ps.income_score * COALESCE((weights->>'income')::NUMERIC, 0.0) +
        ps.health_score * COALESCE((weights->>'health')::NUMERIC, 0.35)
      ) AS final_score
    FROM
      pillar_scores AS ps
  )
  SELECT
    RANK() OVER (ORDER BY cs.final_score DESC) as rank,
    cs.symbol,
    cs.final_score::NUMERIC(10, 2) AS composite_score,
    cs.market_cap,
    cs.revenue_ttm as revenue,
    cs.ps_rank,
    cs.evm_rank,
    cs.sentiment_rank
  FROM
    composite_scores cs
  ORDER BY
    cs.final_score DESC
  LIMIT 50;
END;
$function$;

COMMENT ON FUNCTION public.get_weighted_leaderboard(jsonb) IS
'Compass ranking function v3.
Metrics: 
- Revenue (Sales Yield): Revenue/MarketCap
- Value (EVM): EV/EBITDA
- Sentiment: Insider Net Value Bought (1yr)
- Profitability: OCF Yield (OCF/Price)
- Buyback: Avg % Change in Shares (5yr)
- Growth: PEG
- Income: Dividend Yield
- Health: Debt/Equity
Weights defaults: Revenue(0.15), Profitability(0.20), Health(0.35), Sentiment(0.15), Buyback(0.15).';

GRANT EXECUTE ON FUNCTION public.get_weighted_leaderboard(jsonb) TO anon, authenticated, service_role;