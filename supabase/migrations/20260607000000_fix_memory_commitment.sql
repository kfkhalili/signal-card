-- =============================================================================
-- Memory & Stability Fixes (2026-06-07)
--
-- Part of a broader analysis session (see docs/supabase/guides/memory-management.md)
-- that addressed CPU (50%→2%), Disk I/O (15%→0%), and broken pipelines.
-- =============================================================================

-- =============================================================================
-- FIX 1: Reduce work_mem from 256MB to 32MB in compass refresh
-- 
-- The refresh_compass_pillar_scores() function was setting work_mem = 256MB.
-- With 8+ window functions (PERCENT_RANK, RANK), each sort operation could
-- allocate up to 256MB, causing hourly memory spikes of up to ~2GB.
-- This correlated with "job startup timeout" clusters in cron logs at :05/:13
-- after each hourly refresh.
-- 
-- 32MB is 9x the default (3.5MB) and sufficient for ~18K row window sorts.
-- Peak drops from ~2GB to ~256MB total.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_compass_pillar_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Increase work_mem for this refresh, but keep it reasonable.
    -- 32MB × 8 sorts = 256MB peak, versus the previous 256MB × 8 = 2GB peak.
    SET LOCAL work_mem = '32MB';

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

-- =============================================================================
-- FIX 2: Fix get_active_subscriptions_from_realtime() column type mismatch
--
-- The `check-stale-data-v2` cron job was failing EVERY MINUTE with:
--   "ERROR: structure of query does not match function result type"
-- 
-- Root cause: realtime.subscription.created_at is `timestamp` (without TZ),
-- but the function declares subscribed_at/last_seen_at as TIMESTAMPTZ (with TZ).
-- Supabase likely changed the column type in a platform update.
-- 
-- Fix: explicitly cast rs.created_at::timestamptz in the SELECT.
-- This restored the entire staleness pipeline (1,440 failures/day eliminated).
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_active_subscriptions_from_realtime();
CREATE OR REPLACE FUNCTION public.get_active_subscriptions_from_realtime()
RETURNS TABLE(
  user_id UUID,
  symbol TEXT,
  data_type TEXT,
  subscribed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (rs.claims->>'sub')::UUID AS user_id,
    SUBSTRING(rs.filters::text FROM 'symbol,eq,([^)]+)') AS symbol,
    CASE
      WHEN rs.entity::text = 'profiles' THEN 'profile'
      WHEN rs.entity::text = 'live_quote_indicators' THEN 'quote'
      WHEN rs.entity::text = 'financial_statements' THEN 'financial-statements'
      WHEN rs.entity::text = 'ratios_ttm' THEN 'ratios-ttm'
      WHEN rs.entity::text = 'dividend_history' THEN 'dividend-history'
      WHEN rs.entity::text = 'revenue_product_segmentation' THEN 'revenue-product-segmentation'
      WHEN rs.entity::text = 'grades_historical' THEN 'grades-historical'
      WHEN rs.entity::text = 'exchange_variants' THEN 'exchange-variants'
      WHEN rs.entity::text = 'insider_trading_statistics' THEN 'insider-trading-statistics'
      WHEN rs.entity::text = 'insider_transactions' THEN 'insider-transactions'
    END AS data_type,
    rs.created_at::timestamptz AS subscribed_at,
    rs.created_at::timestamptz AS last_seen_at
  FROM realtime.subscription rs
  WHERE
    rs.filters::text LIKE '%symbol,eq,%'
    AND rs.entity::text IN (
      'profiles', 'live_quote_indicators', 'financial_statements', 'ratios_ttm',
      'dividend_history', 'revenue_product_segmentation',
      'grades_historical', 'exchange_variants', 'insider_trading_statistics', 'insider_transactions'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_subscriptions_from_realtime() TO service_role;

COMMENT ON FUNCTION public.get_active_subscriptions_from_realtime IS 'Extracts active subscriptions from realtime.subscription table. Returns user_id, symbol, data_type, subscribed_at, and last_seen_at. Casts created_at to TIMESTAMPTZ to match return type declaration.';
