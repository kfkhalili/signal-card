-- Temporarily set the timeout to 15 minutes for this massive index build
SET statement_timeout = '15min';

-- 1. Create the CORRECT composite index (symbol + date) to make LATERAL join instant
CREATE INDEX IF NOT EXISTS idx_insider_transactions_symbol_date ON public.insider_transactions(symbol, transaction_date DESC);

-- 2. Drop the old view and its dependent permissions
DROP MATERIALIZED VIEW IF EXISTS public.mv_compass_pillar_scores CASCADE;

-- 3. Create the optimized view with LATERAL joins
CREATE MATERIALIZED VIEW public.mv_compass_pillar_scores AS
WITH insider_impact AS (
    SELECT ls.symbol, lat.net_value_bought
    FROM public.listed_symbols ls
    LEFT JOIN LATERAL (
      SELECT SUM(
        CASE 
          WHEN it.acquisition_or_disposition = 'A' AND (UPPER(it.transaction_type) LIKE '%PURCHASE%' OR UPPER(it.transaction_type) = 'P' OR UPPER(it.transaction_type) LIKE 'P-%') THEN (it.securities_transacted * it.price)
          WHEN it.acquisition_or_disposition = 'D' AND (UPPER(it.transaction_type) LIKE '%SALE%' OR UPPER(it.transaction_type) = 'S' OR UPPER(it.transaction_type) LIKE 'S-%') THEN -(it.securities_transacted * it.price)
          ELSE 0 
        END
      ) as net_value_bought
      FROM public.insider_transactions it
      WHERE it.symbol = ls.symbol AND it.transaction_date >= (CURRENT_DATE - INTERVAL '6 months') AND it.price > 0
    ) lat ON true
    WHERE ls.is_active = TRUE
),
revenue_calc AS (
    WITH q_data AS (
      SELECT ls.symbol, lat.q_revenue, lat.q_count
      FROM public.listed_symbols ls
      LEFT JOIN LATERAL (
        SELECT 
          SUM((fs.income_statement_payload->>'revenue')::numeric * CASE WHEN fs.reported_currency = 'USD' THEN 1.0 ELSE COALESCE(er.rate::numeric, NULL) END) as q_revenue,
          COUNT(*) as q_count
        FROM (
          SELECT * FROM public.financial_statements fs2
          WHERE fs2.symbol = ls.symbol AND fs2.period IS DISTINCT FROM 'FY'
          ORDER BY fs2.date DESC
          LIMIT 4
        ) fs
        LEFT JOIN public.exchange_rates er ON fs.reported_currency = er.base_code AND er.target_code = 'USD'
      ) lat ON true
      WHERE ls.is_active = TRUE
    ),
    annual_stats AS (
      SELECT ls.symbol, lat.revenue
      FROM public.listed_symbols ls
      LEFT JOIN LATERAL (
        SELECT (fs.income_statement_payload->>'revenue')::numeric * CASE WHEN fs.reported_currency = 'USD' THEN 1.0 ELSE COALESCE(er.rate::numeric, NULL) END AS revenue
        FROM public.financial_statements fs
        LEFT JOIN public.exchange_rates er ON fs.reported_currency = er.base_code AND er.target_code = 'USD'
        WHERE fs.symbol = ls.symbol AND fs.period = 'FY'
        ORDER BY fs.date DESC
        LIMIT 1
      ) lat ON true
      WHERE ls.is_active = TRUE
    )
    SELECT qd.symbol, CASE WHEN qd.q_count = 4 THEN qd.q_revenue ELSE ans.revenue END as revenue_ttm
    FROM q_data qd
    LEFT JOIN annual_stats ans ON qd.symbol = ans.symbol
),
avg_buyback_stats AS (
    SELECT ls.symbol, lat.avg_share_change
    FROM public.listed_symbols ls
    LEFT JOIN LATERAL (
        SELECT AVG(CASE WHEN prev_shares > 0 THEN (shares - prev_shares) / prev_shares ELSE 0 END) as avg_share_change
        FROM (
            SELECT 
              (fs.income_statement_payload->>'weightedAverageShsOut')::numeric AS shares,
              LAG((fs.income_statement_payload->>'weightedAverageShsOut')::numeric) OVER (ORDER BY fs.date ASC) as prev_shares
            FROM public.financial_statements fs
            WHERE fs.symbol = ls.symbol AND fs.period = 'FY' AND fs.date >= (CURRENT_DATE - INTERVAL '5 years')
        ) pys
        WHERE prev_shares IS NOT NULL
    ) lat ON true
    WHERE ls.is_active = TRUE
),
health_categorized AS (
    SELECT 
        rt.symbol,
        (COALESCE(rt.interest_debt_per_share_ttm, 0) - COALESCE(rt.cash_per_share_ttm, 0)) AS net_debt_ps,
        LEAST(
            COALESCE(rt.operating_cash_flow_per_share_ttm, 0),
            COALESCE(rt.revenue_per_share_ttm * rt.ebitda_margin_ttm, rt.operating_cash_flow_per_share_ttm, 0)
        ) AS ocf_ps,
        rt.quick_ratio_ttm,
        CASE 
            WHEN (COALESCE(rt.interest_debt_per_share_ttm, 0) - COALESCE(rt.cash_per_share_ttm, 0)) <= 0 
             AND LEAST(COALESCE(rt.operating_cash_flow_per_share_ttm, 0), COALESCE(rt.revenue_per_share_ttm * rt.ebitda_margin_ttm, rt.operating_cash_flow_per_share_ttm, 0)) > 0 THEN 1
            WHEN (COALESCE(rt.interest_debt_per_share_ttm, 0) - COALESCE(rt.cash_per_share_ttm, 0)) <= 0 
             AND LEAST(COALESCE(rt.operating_cash_flow_per_share_ttm, 0), COALESCE(rt.revenue_per_share_ttm * rt.ebitda_margin_ttm, rt.operating_cash_flow_per_share_ttm, 0)) <= 0 THEN 2
            WHEN (COALESCE(rt.interest_debt_per_share_ttm, 0) - COALESCE(rt.cash_per_share_ttm, 0)) > 0 
             AND LEAST(COALESCE(rt.operating_cash_flow_per_share_ttm, 0), COALESCE(rt.revenue_per_share_ttm * rt.ebitda_margin_ttm, rt.operating_cash_flow_per_share_ttm, 0)) > 0 THEN 3
            ELSE 4
        END as health_tier
    FROM public.ratios_ttm rt
    INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
    WHERE ls.is_active = TRUE
),
health_scored AS (
    SELECT 
        symbol,
        CASE health_tier
            WHEN 1 THEN 75.0 + (PERCENT_RANK() OVER (PARTITION BY health_tier ORDER BY quick_ratio_ttm ASC NULLS FIRST) * 25.0)
            WHEN 2 THEN 50.0 + (PERCENT_RANK() OVER (PARTITION BY health_tier ORDER BY (net_debt_ps / NULLIF(ocf_ps, 0)) ASC NULLS FIRST) * 25.0)
            WHEN 3 THEN 25.0 + (PERCENT_RANK() OVER (PARTITION BY health_tier ORDER BY (net_debt_ps / NULLIF(ocf_ps, 0)) DESC NULLS LAST) * 25.0)
            WHEN 4 THEN 0.0  + (PERCENT_RANK() OVER (PARTITION BY health_tier ORDER BY (ABS(ocf_ps) / NULLIF(net_debt_ps, 0)) DESC NULLS LAST) * 25.0)
        END as norm_health
    FROM health_categorized
),
normalized_metrics AS (
    SELECT
      rt.symbol,
      p.industry,
      p.market_cap,
      rc.revenue_ttm,
      PERCENT_RANK() OVER (ORDER BY CASE WHEN p.market_cap > 0 AND rc.revenue_ttm IS NOT NULL THEN rc.revenue_ttm / p.market_cap ELSE NULL END ASC NULLS FIRST) * 100 AS norm_ps,
      RANK() OVER (ORDER BY CASE WHEN p.market_cap > 0 AND rc.revenue_ttm IS NOT NULL THEN rc.revenue_ttm / p.market_cap ELSE NULL END DESC NULLS LAST) as ps_rank,
      (1 - PERCENT_RANK() OVER (ORDER BY CASE WHEN rt.enterprise_value_multiple_ttm > 0 AND rt.enterprise_value_ttm > 0 THEN rt.enterprise_value_multiple_ttm WHEN rt.enterprise_value_multiple_ttm < 0 AND rt.enterprise_value_ttm < 0 THEN rt.enterprise_value_multiple_ttm ELSE NULL END ASC NULLS LAST)) * 100 AS norm_evm,
      RANK() OVER (ORDER BY CASE WHEN rt.enterprise_value_multiple_ttm > 0 AND rt.enterprise_value_ttm > 0 THEN rt.enterprise_value_multiple_ttm WHEN rt.enterprise_value_multiple_ttm < 0 AND rt.enterprise_value_ttm < 0 THEN rt.enterprise_value_multiple_ttm ELSE NULL END ASC NULLS LAST) as evm_rank,
      PERCENT_RANK() OVER (ORDER BY COALESCE(ii.net_value_bought, 0) ASC) * 100 AS norm_sentiment,
      RANK() OVER (ORDER BY COALESCE(ii.net_value_bought, 0) DESC) as sentiment_rank,
      PERCENT_RANK() OVER (ORDER BY CASE WHEN p.price > 0 THEN LEAST(rt.net_income_per_share_ttm, rt.free_cash_flow_per_share_ttm) / p.price ELSE NULL END ASC NULLS FIRST) * 100 AS norm_profitability_yield,
      PERCENT_RANK() OVER (ORDER BY COALESCE(abs.avg_share_change, 0) DESC) * 100 AS norm_buyback_yield,
      (1 - PERCENT_RANK() OVER (ORDER BY rt.price_to_earnings_growth_ratio_ttm ASC)) * 100 AS norm_peg,
      PERCENT_RANK() OVER (ORDER BY rt.dividend_yield_ttm ASC) * 100 AS norm_div_yield,
      hc.norm_health
    FROM public.ratios_ttm as rt
    INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
    LEFT JOIN public.profiles p ON rt.symbol = p.symbol
    LEFT JOIN insider_impact ii ON rt.symbol = ii.symbol
    LEFT JOIN avg_buyback_stats abs ON rt.symbol = abs.symbol
    LEFT JOIN revenue_calc rc ON rt.symbol = rc.symbol
    LEFT JOIN health_scored hc ON rt.symbol = hc.symbol
    WHERE ls.is_active = TRUE
)
SELECT * FROM normalized_metrics;

CREATE UNIQUE INDEX idx_mv_pillar_scores_symbol ON public.mv_compass_pillar_scores (symbol);

-- 4. Re-grant permissions because DROP CASCADE wiped them out
GRANT SELECT ON public.mv_compass_pillar_scores TO anon, authenticated, service_role;
