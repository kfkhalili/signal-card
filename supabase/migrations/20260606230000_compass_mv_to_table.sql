-- 1. Drop existing dependencies
DROP FUNCTION IF EXISTS public.get_weighted_leaderboard(jsonb, text[]);
DROP FUNCTION IF EXISTS public.get_weighted_leaderboard(jsonb);
DROP MATERIALIZED VIEW IF EXISTS public.mv_compass_pillar_scores CASCADE;
DROP VIEW IF EXISTS public.mv_compass_pillar_scores CASCADE;

-- 2. Create the physical table
CREATE TABLE IF NOT EXISTS public.compass_pillar_scores (
    symbol TEXT PRIMARY KEY,
    industry TEXT,
    market_cap BIGINT,
    revenue_ttm NUMERIC,
    norm_ps DOUBLE PRECISION,
    ps_rank BIGINT,
    norm_evm DOUBLE PRECISION,
    evm_rank BIGINT,
    norm_sentiment DOUBLE PRECISION,
    sentiment_rank BIGINT,
    norm_profitability_yield DOUBLE PRECISION,
    norm_buyback_yield DOUBLE PRECISION,
    norm_peg DOUBLE PRECISION,
    norm_div_yield DOUBLE PRECISION,
    norm_health DOUBLE PRECISION,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create the refresh function that upserts data
CREATE OR REPLACE FUNCTION public.refresh_compass_pillar_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Temporarily increase work_mem just for this refresh transaction to avoid disk spillage
    SET LOCAL work_mem = '256MB';

    INSERT INTO public.compass_pillar_scores (
        symbol, industry, market_cap, revenue_ttm, norm_ps, ps_rank, norm_evm, evm_rank,
        norm_sentiment, sentiment_rank, norm_profitability_yield, norm_buyback_yield,
        norm_peg, norm_div_yield, norm_health, updated_at
    )
    WITH insider_impact AS (
        SELECT 
          it.symbol,
          SUM(
            CASE 
              WHEN it.acquisition_or_disposition = 'A' AND (UPPER(it.transaction_type) LIKE '%PURCHASE%' OR UPPER(it.transaction_type) = 'P' OR UPPER(it.transaction_type) LIKE 'P-%') THEN (it.securities_transacted * it.price)
              WHEN it.acquisition_or_disposition = 'D' AND (UPPER(it.transaction_type) LIKE '%SALE%' OR UPPER(it.transaction_type) = 'S' OR UPPER(it.transaction_type) LIKE 'S-%') THEN -(it.securities_transacted * it.price)
              ELSE 0 
            END
          ) as net_value_bought
        FROM public.insider_transactions it
        WHERE it.transaction_date >= (CURRENT_DATE - INTERVAL '6 months') AND it.price > 0
        GROUP BY it.symbol
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
          hc.norm_health,
          NOW()
        FROM public.ratios_ttm as rt
        INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
        LEFT JOIN public.profiles p ON rt.symbol = p.symbol
        LEFT JOIN insider_impact ii ON rt.symbol = ii.symbol
        LEFT JOIN avg_buyback_stats abs ON rt.symbol = abs.symbol
        LEFT JOIN revenue_calc rc ON rt.symbol = rc.symbol
        LEFT JOIN health_scored hc ON rt.symbol = hc.symbol
        WHERE ls.is_active = TRUE
    )
    SELECT * FROM normalized_metrics
    ON CONFLICT (symbol) DO UPDATE SET
        industry = EXCLUDED.industry,
        market_cap = EXCLUDED.market_cap,
        revenue_ttm = EXCLUDED.revenue_ttm,
        norm_ps = EXCLUDED.norm_ps,
        ps_rank = EXCLUDED.ps_rank,
        norm_evm = EXCLUDED.norm_evm,
        evm_rank = EXCLUDED.evm_rank,
        norm_sentiment = EXCLUDED.norm_sentiment,
        sentiment_rank = EXCLUDED.sentiment_rank,
        norm_profitability_yield = EXCLUDED.norm_profitability_yield,
        norm_buyback_yield = EXCLUDED.norm_buyback_yield,
        norm_peg = EXCLUDED.norm_peg,
        norm_div_yield = EXCLUDED.norm_div_yield,
        norm_health = EXCLUDED.norm_health,
        updated_at = EXCLUDED.updated_at;
END;
$$;

-- 4. Recreate the leaderboard RPC to point to the physical table
CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(weights jsonb, p_industries text[] DEFAULT NULL)
 RETURNS TABLE(
   rank bigint,
   symbol text,
   composite_score numeric,
   market_cap bigint,
   revenue numeric,
   ps_rank bigint,
   evm_rank bigint,
   sentiment_rank bigint,
   industry text
 )
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, extensions
AS $function$
DECLARE
  w_rev NUMERIC := COALESCE((weights->>'revenue')::NUMERIC, 0.15);
  w_val NUMERIC := COALESCE((weights->>'value')::NUMERIC, 0.0);
  w_sent NUMERIC := COALESCE((weights->>'sentiment')::NUMERIC, 0.15);
  w_gro NUMERIC := COALESCE((weights->>'growth')::NUMERIC, 0.0);
  w_prof NUMERIC := COALESCE((weights->>'profitability')::NUMERIC, 0.2);
  w_buy NUMERIC := COALESCE((weights->>'buyback')::NUMERIC, 0.15);
  w_inc NUMERIC := COALESCE((weights->>'income')::NUMERIC, 0.0);
  w_health NUMERIC := COALESCE((weights->>'health')::NUMERIC, 0.35);
BEGIN
  RETURN QUERY
  WITH calculated_scores AS (
    SELECT
      mv.symbol,
      (
          mv.norm_ps * w_rev +
          mv.norm_evm * w_val +
          mv.norm_sentiment * w_sent +
          mv.norm_peg * w_gro +
          mv.norm_profitability_yield * w_prof +
          mv.norm_buyback_yield * w_buy + 
          mv.norm_div_yield * w_inc +
          mv.norm_health * w_health
      )::NUMERIC(10, 2) AS composite_score,
      mv.market_cap,
      mv.revenue_ttm as revenue,
      mv.ps_rank,
      mv.evm_rank,
      mv.sentiment_rank,
      mv.industry
    FROM
      public.compass_pillar_scores mv
    WHERE 
      p_industries IS NULL 
      OR array_length(p_industries, 1) IS NULL 
      OR mv.industry = ANY(p_industries)
    ORDER BY 2 DESC
    LIMIT 50
  )
  SELECT
    (ROW_NUMBER() OVER (ORDER BY c.composite_score DESC))::bigint as rank,
    c.symbol,
    c.composite_score,
    c.market_cap,
    c.revenue,
    c.ps_rank,
    c.evm_rank,
    c.sentiment_rank,
    c.industry
  FROM calculated_scores c
  ORDER BY c.composite_score DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weighted_leaderboard(jsonb, text[]) TO anon, authenticated, service_role;

-- 5. Update the cron job to use the new refresh function
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('refresh-compass-leaderboard-mv');
  EXCEPTION WHEN OTHERS THEN
    -- Job doesn't exist, ignore
  END;
  PERFORM cron.schedule(
    'refresh-compass-leaderboard-mv',
    '0 * * * *',
    'SELECT public.refresh_compass_pillar_scores();'
  );
END $$;

-- Optional: Initial population of the table
-- SELECT public.refresh_compass_pillar_scores();
