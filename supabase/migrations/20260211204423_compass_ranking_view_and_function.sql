BEGIN;

-- 1. CLEAN UP 
DROP MATERIALIZED VIEW IF EXISTS public.mv_compass_pillar_scores CASCADE;
DROP FUNCTION IF EXISTS public.get_weighted_leaderboard(jsonb);

-- 2. CREATE THE VIEW (The "Snapshop" of ranks)
CREATE MATERIALIZED VIEW public.mv_compass_pillar_scores AS
WITH insider_impact AS (
    SELECT 
      it.symbol, 
      SUM(CASE WHEN it.acquisition_or_disposition = 'A' THEN (it.securities_transacted * it.price)
               WHEN it.acquisition_or_disposition = 'D' THEN -(it.securities_transacted * it.price)
               ELSE 0 END) as net_value_bought
    FROM public.insider_transactions it
    WHERE it.transaction_date >= (CURRENT_DATE - INTERVAL '1 year')
      AND it.price > 0 
    GROUP BY it.symbol
),
revenue_calc AS (
    -- Strategy: Sum last 4 quarters or use Latest Annual fallback
    WITH q_data AS (
      SELECT
        sub.symbol,
        SUM((sub.income_statement_payload->>'revenue')::numeric * CASE WHEN sub.reported_currency = 'USD' THEN 1.0 ELSE COALESCE(er.rate::numeric, NULL) END) as q_revenue,
        COUNT(*) as q_count
      FROM (
        SELECT fs.symbol, fs.income_statement_payload, fs.reported_currency, ROW_NUMBER() OVER (PARTITION BY fs.symbol ORDER BY fs.date DESC) as rn
        FROM public.financial_statements fs
        WHERE fs.period IS DISTINCT FROM 'FY'
      ) sub
      LEFT JOIN public.exchange_rates er ON sub.reported_currency = er.base_code AND er.target_code = 'USD'
      WHERE sub.rn <= 4
      GROUP BY sub.symbol
    ),
    annual_stats AS (
        SELECT DISTINCT ON (fs.symbol) fs.symbol, (fs.income_statement_payload->>'revenue')::numeric * CASE WHEN fs.reported_currency = 'USD' THEN 1.0 ELSE COALESCE(er.rate::numeric, NULL) END AS revenue
        FROM public.financial_statements fs
        LEFT JOIN public.exchange_rates er ON fs.reported_currency = er.base_code AND er.target_code = 'USD'
        WHERE fs.period = 'FY'
        ORDER BY fs.symbol, fs.date DESC
    )
    SELECT ls.symbol, CASE WHEN qd.q_count = 4 THEN qd.q_revenue ELSE ans.revenue END as revenue_ttm
    FROM public.listed_symbols ls
    LEFT JOIN q_data qd ON ls.symbol = qd.symbol
    LEFT JOIN annual_stats ans ON ls.symbol = ans.symbol
    WHERE ls.is_active = TRUE
),
avg_buyback_stats AS (
    SELECT pys.symbol, AVG(CASE WHEN pys.prev_shares > 0 THEN (pys.shares - pys.prev_shares) / pys.prev_shares ELSE 0 END) as avg_share_change
    FROM (
        SELECT fs.symbol, fs.date, (fs.income_statement_payload->>'weightedAverageShsOut')::numeric AS shares,
        LAG((fs.income_statement_payload->>'weightedAverageShsOut')::numeric) OVER (PARTITION BY fs.symbol ORDER BY fs.date) as prev_shares
        FROM public.financial_statements fs
        WHERE fs.period = 'FY' AND fs.date >= (CURRENT_DATE - INTERVAL '5 years')
    ) pys
    WHERE pys.prev_shares IS NOT NULL
    GROUP BY pys.symbol
),
normalized_metrics AS (
    SELECT
      rt.symbol,
      p.market_cap,
      rc.revenue_ttm,
      PERCENT_RANK() OVER (ORDER BY CASE WHEN p.market_cap > 0 AND rc.revenue_ttm IS NOT NULL THEN rc.revenue_ttm / p.market_cap ELSE NULL END ASC NULLS FIRST) * 100 AS norm_ps,
      RANK() OVER (ORDER BY CASE WHEN p.market_cap > 0 AND rc.revenue_ttm IS NOT NULL THEN rc.revenue_ttm / p.market_cap ELSE NULL END DESC NULLS LAST) as ps_rank,
      (1 - PERCENT_RANK() OVER (ORDER BY CASE WHEN rt.enterprise_value_multiple_ttm > 0 AND rt.enterprise_value_ttm > 0 THEN rt.enterprise_value_multiple_ttm WHEN rt.enterprise_value_multiple_ttm < 0 AND rt.enterprise_value_ttm < 0 THEN rt.enterprise_value_multiple_ttm ELSE NULL END ASC NULLS LAST)) * 100 AS norm_evm,
      RANK() OVER (ORDER BY CASE WHEN rt.enterprise_value_multiple_ttm > 0 AND rt.enterprise_value_ttm > 0 THEN rt.enterprise_value_multiple_ttm WHEN rt.enterprise_value_multiple_ttm < 0 AND rt.enterprise_value_ttm < 0 THEN rt.enterprise_value_multiple_ttm ELSE NULL END ASC NULLS LAST) as evm_rank,
      PERCENT_RANK() OVER (ORDER BY COALESCE(ii.net_value_bought, 0) ASC) * 100 AS norm_sentiment,
      RANK() OVER (ORDER BY COALESCE(ii.net_value_bought, 0) DESC) as sentiment_rank,
      PERCENT_RANK() OVER (ORDER BY CASE WHEN p.price > 0 THEN rt.operating_cash_flow_per_share_ttm / p.price ELSE NULL END ASC NULLS FIRST) * 100 AS norm_ocf_yield,
      PERCENT_RANK() OVER (ORDER BY COALESCE(abs.avg_share_change, 0) DESC) * 100 AS norm_buyback_yield,
      (1 - PERCENT_RANK() OVER (ORDER BY rt.price_to_earnings_growth_ratio_ttm ASC)) * 100 AS norm_peg,
      PERCENT_RANK() OVER (ORDER BY rt.dividend_yield_ttm ASC) * 100 AS norm_div_yield,
      (1 - PERCENT_RANK() OVER (ORDER BY rt.debt_to_equity_ratio_ttm ASC)) * 100 AS norm_de
    FROM public.ratios_ttm as rt
    INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
    LEFT JOIN public.profiles p ON rt.symbol = p.symbol
    LEFT JOIN insider_impact ii ON rt.symbol = ii.symbol
    LEFT JOIN avg_buyback_stats abs ON rt.symbol = abs.symbol
    LEFT JOIN revenue_calc rc ON rt.symbol = rc.symbol
    WHERE ls.is_active = TRUE
)
SELECT * FROM normalized_metrics;

CREATE UNIQUE INDEX idx_mv_pillar_scores_symbol ON public.mv_compass_pillar_scores (symbol);

-- 3. CREATE THE FUNCTION (Reads from the View)
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
  SELECT
    RANK() OVER (ORDER BY (
        mv.norm_ps * COALESCE((weights->>'revenue')::NUMERIC, 0.15) +
        mv.norm_evm * COALESCE((weights->>'value')::NUMERIC, 0.0) +
        mv.norm_sentiment * COALESCE((weights->>'sentiment')::NUMERIC, 0.15) +
        mv.norm_peg * COALESCE((weights->>'growth')::NUMERIC, 0.0) +
        mv.norm_ocf_yield * COALESCE((weights->>'profitability')::NUMERIC, 0.2) +
        mv.norm_buyback_yield * COALESCE((weights->>'buyback')::NUMERIC, 0.15) + 
        mv.norm_div_yield * COALESCE((weights->>'income')::NUMERIC, 0.0) +
        mv.norm_de * COALESCE((weights->>'health')::NUMERIC, 0.35)
    ) DESC) as rank,
    mv.symbol,
    (
        mv.norm_ps * COALESCE((weights->>'revenue')::NUMERIC, 0.15) +
        mv.norm_evm * COALESCE((weights->>'value')::NUMERIC, 0.0) +
        mv.norm_sentiment * COALESCE((weights->>'sentiment')::NUMERIC, 0.15) +
        mv.norm_peg * COALESCE((weights->>'growth')::NUMERIC, 0.0) +
        mv.norm_ocf_yield * COALESCE((weights->>'profitability')::NUMERIC, 0.2) +
        mv.norm_buyback_yield * COALESCE((weights->>'buyback')::NUMERIC, 0.15) + 
        mv.norm_div_yield * COALESCE((weights->>'income')::NUMERIC, 0.0) +
        mv.norm_de * COALESCE((weights->>'health')::NUMERIC, 0.35)
    )::NUMERIC(10, 2) AS composite_score,
    mv.market_cap,
    mv.revenue_ttm as revenue,
    mv.ps_rank,
    mv.evm_rank,
    mv.sentiment_rank
  FROM
    public.mv_compass_pillar_scores mv
  ORDER BY 3 DESC
  LIMIT 50;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weighted_leaderboard(jsonb) TO anon, authenticated, service_role;

COMMIT;