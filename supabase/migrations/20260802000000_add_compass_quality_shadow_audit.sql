-- Add a service-only shadow audit for the current Compass leaderboard.
--
-- This does not change ranking or eligibility. The provisional gates expose
-- cheap-looking candidates that need to be removed or scored by a specialized
-- model before Compass v2 can safely replace the existing recommendations.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_compass_quality_shadow_audit(
  p_weights jsonb,
  p_limit integer DEFAULT 50,
  p_industries text[] DEFAULT NULL,
  p_exchanges text[] DEFAULT NULL
)
RETURNS TABLE(
  current_rank bigint,
  symbol text,
  current_score numeric,
  company_name text,
  sector text,
  industry text,
  exchange text,
  market_cap bigint,
  average_daily_dollar_volume numeric,
  annual_statement_years integer,
  positive_fcf_years integer,
  latest_annual_date date,
  latest_accepted_at timestamptz,
  revenue_growth_yoy numeric,
  share_dilution_yoy numeric,
  gross_profit_to_assets numeric,
  accrual_ratio numeric,
  free_cash_flow_margin numeric,
  price_to_earnings numeric,
  peg numeric,
  price_to_free_cash_flow numeric,
  enterprise_multiple numeric,
  model_class text,
  passes_provisional_gate boolean,
  gate_failures text[],
  risk_flags text[]
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH current_leaders AS (
    SELECT leaderboard.*
    FROM public.get_weighted_leaderboard(
      p_weights,
      p_industries,
      p_exchanges
    ) AS leaderboard
    ORDER BY leaderboard.rank
    LIMIT greatest(
      1,
      least(coalesce(p_limit, 50), 50)
    )
  ),
  annual_rows AS (
    SELECT
      statements.symbol,
      statements.date,
      statements.accepted_date,
      pg_catalog.row_number() OVER (
        PARTITION BY statements.symbol
        ORDER BY statements.date DESC, statements.accepted_date DESC NULLS LAST
      ) AS recency,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.income_statement_payload -> 'revenue'
        ) = 'number'
          THEN (statements.income_statement_payload ->> 'revenue')::numeric
      END AS revenue,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.income_statement_payload -> 'grossProfit'
        ) = 'number'
          THEN (statements.income_statement_payload ->> 'grossProfit')::numeric
      END AS gross_profit,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.income_statement_payload -> 'netIncome'
        ) = 'number'
          THEN (statements.income_statement_payload ->> 'netIncome')::numeric
      END AS net_income,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.income_statement_payload -> 'weightedAverageShsOutDil'
        ) = 'number'
          THEN (
            statements.income_statement_payload ->> 'weightedAverageShsOutDil'
          )::numeric
        WHEN pg_catalog.jsonb_typeof(
          statements.income_statement_payload -> 'weightedAverageShsOut'
        ) = 'number'
          THEN (
            statements.income_statement_payload ->> 'weightedAverageShsOut'
          )::numeric
      END AS diluted_shares,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.balance_sheet_payload -> 'totalAssets'
        ) = 'number'
          THEN (statements.balance_sheet_payload ->> 'totalAssets')::numeric
      END AS total_assets,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.balance_sheet_payload -> 'totalDebt'
        ) = 'number'
          THEN (statements.balance_sheet_payload ->> 'totalDebt')::numeric
      END AS total_debt,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.cash_flow_payload -> 'operatingCashFlow'
        ) = 'number'
          THEN (
            statements.cash_flow_payload ->> 'operatingCashFlow'
          )::numeric
        WHEN pg_catalog.jsonb_typeof(
          statements.cash_flow_payload -> 'netCashProvidedByOperatingActivities'
        ) = 'number'
          THEN (
            statements.cash_flow_payload
              ->> 'netCashProvidedByOperatingActivities'
          )::numeric
      END AS operating_cash_flow,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statements.cash_flow_payload -> 'freeCashFlow'
        ) = 'number'
          THEN (statements.cash_flow_payload ->> 'freeCashFlow')::numeric
      END AS free_cash_flow
    FROM public.financial_statements AS statements
    INNER JOIN current_leaders AS leaders
      ON leaders.symbol = statements.symbol
    WHERE statements.period = 'FY'
  ),
  annual_summary AS (
    SELECT
      annual.symbol,
      pg_catalog.count(*) FILTER (WHERE annual.recency <= 5)::integer
        AS annual_statement_years,
      pg_catalog.count(*) FILTER (
        WHERE annual.recency <= 5 AND annual.free_cash_flow > 0
      )::integer AS positive_fcf_years,
      pg_catalog.max(annual.date) FILTER (WHERE annual.recency = 1)
        AS latest_annual_date,
      pg_catalog.max(annual.accepted_date) FILTER (WHERE annual.recency = 1)
        AS latest_accepted_at,
      pg_catalog.max(annual.revenue) FILTER (WHERE annual.recency = 1)
        AS latest_revenue,
      pg_catalog.max(annual.revenue) FILTER (WHERE annual.recency = 2)
        AS previous_revenue,
      pg_catalog.max(annual.diluted_shares) FILTER (WHERE annual.recency = 1)
        AS latest_diluted_shares,
      pg_catalog.max(annual.diluted_shares) FILTER (WHERE annual.recency = 2)
        AS previous_diluted_shares,
      pg_catalog.max(annual.gross_profit) FILTER (WHERE annual.recency = 1)
        AS latest_gross_profit,
      pg_catalog.max(annual.net_income) FILTER (WHERE annual.recency = 1)
        AS latest_net_income,
      pg_catalog.max(annual.total_assets) FILTER (WHERE annual.recency = 1)
        AS latest_total_assets,
      pg_catalog.max(annual.operating_cash_flow) FILTER (WHERE annual.recency = 1)
        AS latest_operating_cash_flow,
      pg_catalog.max(annual.free_cash_flow) FILTER (WHERE annual.recency = 1)
        AS latest_free_cash_flow,
      pg_catalog.max(annual.total_debt) FILTER (WHERE annual.recency = 1)
        AS latest_total_debt,
      pg_catalog.max(annual.total_debt) FILTER (WHERE annual.recency = 2)
        AS previous_total_debt
    FROM annual_rows AS annual
    WHERE annual.recency <= 5
    GROUP BY annual.symbol
  ),
  raw_diagnostics AS (
    SELECT
      leaders.rank AS current_rank,
      leaders.symbol,
      leaders.composite_score AS current_score,
      profile.company_name,
      profile.sector,
      leaders.industry,
      profile.exchange,
      profile.market_cap,
      CASE
        WHEN profile.price > 0 AND profile.average_volume > 0
          THEN profile.price::numeric * profile.average_volume::numeric
      END AS average_daily_dollar_volume,
      coalesce(annual.annual_statement_years, 0)
        AS annual_statement_years,
      coalesce(annual.positive_fcf_years, 0)
        AS positive_fcf_years,
      annual.latest_annual_date,
      annual.latest_accepted_at,
      (annual.latest_revenue - annual.previous_revenue)
        / nullif(pg_catalog.abs(annual.previous_revenue), 0)
        AS revenue_growth_yoy,
      (annual.latest_diluted_shares - annual.previous_diluted_shares)
        / nullif(annual.previous_diluted_shares, 0)
        AS share_dilution_yoy,
      annual.latest_gross_profit
        / nullif(pg_catalog.abs(annual.latest_total_assets), 0)
        AS gross_profit_to_assets,
      (annual.latest_net_income - annual.latest_operating_cash_flow)
        / nullif(pg_catalog.abs(annual.latest_total_assets), 0)
        AS accrual_ratio,
      annual.latest_free_cash_flow
        / nullif(pg_catalog.abs(annual.latest_revenue), 0)
        AS free_cash_flow_margin,
      ratios.price_to_earnings_ratio_ttm::numeric AS price_to_earnings,
      ratios.price_to_earnings_growth_ratio_ttm::numeric AS peg,
      ratios.price_to_free_cash_flow_ratio_ttm::numeric
        AS price_to_free_cash_flow,
      ratios.enterprise_value_multiple_ttm::numeric AS enterprise_multiple,
      profile.is_etf,
      profile.is_fund,
      profile.is_adr,
      profile.price,
      profile.modified_at AS profile_updated_at,
      ratios.updated_at AS ratios_updated_at,
      CASE
        WHEN profile.sector ILIKE '%financial%'
          OR profile.industry ~* '(bank|insurance|credit services|asset management|mortgage)'
          THEN 'financial'
        WHEN profile.sector ILIKE '%real estate%'
          OR profile.industry ~* '(reit|real estate)'
          THEN 'real-estate'
        ELSE 'operating'
      END AS model_class,
      CASE
        WHEN profile.company_name ~* '(preferred (stock|shares?)|depositary shares?|warrants?|rights?|units?|notes? due|bonds?|debentures?)'
          OR profile.company_name ~ '[[:space:]][0-9]+([.][0-9]+)?%?$'
          THEN true
        ELSE false
      END AS security_name_requires_review,
      CASE
        WHEN annual.previous_total_debt IS NOT NULL
          THEN (annual.latest_total_debt - annual.previous_total_debt)
            / nullif(pg_catalog.abs(annual.previous_total_debt), 0)
      END AS debt_growth_yoy
    FROM current_leaders AS leaders
    LEFT JOIN public.profiles AS profile
      ON profile.symbol = leaders.symbol
    LEFT JOIN public.ratios_ttm AS ratios
      ON ratios.symbol = leaders.symbol
    LEFT JOIN annual_summary AS annual
      ON annual.symbol = leaders.symbol
  ),
  evaluated AS (
    SELECT
      diagnostics.*,
      pg_catalog.array_remove(ARRAY[
        CASE
          WHEN diagnostics.is_etf IS TRUE OR diagnostics.is_fund IS TRUE
            THEN 'fund_or_etf'
        END,
        CASE
          WHEN diagnostics.security_name_requires_review
            THEN 'security_type_requires_review'
        END,
        CASE
          WHEN diagnostics.model_class <> 'operating'
            THEN 'specialized_sector_model_required'
        END,
        CASE
          WHEN diagnostics.market_cap IS NULL OR diagnostics.market_cap <= 0
            THEN 'missing_market_cap'
          WHEN diagnostics.market_cap < 50000000
            THEN 'market_cap_below_50m'
        END,
        CASE
          WHEN diagnostics.average_daily_dollar_volume IS NULL
            THEN 'missing_average_dollar_volume'
          WHEN diagnostics.average_daily_dollar_volume < 500000
            THEN 'average_dollar_volume_below_500k'
        END,
        CASE
          WHEN diagnostics.annual_statement_years < 3
            THEN 'fewer_than_3_annual_statements'
        END,
        CASE
          WHEN diagnostics.model_class = 'operating'
            AND diagnostics.positive_fcf_years < 3
            THEN 'fewer_than_3_positive_fcf_years'
        END,
        CASE
          WHEN diagnostics.latest_annual_date IS NULL
            OR diagnostics.latest_annual_date < CURRENT_DATE - INTERVAL '21 months'
            THEN 'annual_statements_stale_or_missing'
        END,
        CASE
          WHEN diagnostics.share_dilution_yoy > 0.50
            THEN 'share_dilution_over_50pct'
        END,
        CASE
          WHEN diagnostics.ratios_updated_at IS NULL
            OR diagnostics.ratios_updated_at < pg_catalog.now() - INTERVAL '72 hours'
            THEN 'ratios_stale_or_missing'
        END,
        CASE
          WHEN diagnostics.profile_updated_at IS NULL
            OR diagnostics.profile_updated_at < pg_catalog.now() - INTERVAL '72 hours'
            THEN 'profile_stale_or_missing'
        END
      ]::text[], NULL) AS gate_failures,
      pg_catalog.array_remove(ARRAY[
        CASE
          WHEN diagnostics.market_cap >= 50000000
            AND diagnostics.market_cap < 100000000
            THEN 'microcap_below_100m'
        END,
        CASE
          WHEN diagnostics.average_daily_dollar_volume >= 500000
            AND diagnostics.average_daily_dollar_volume < 1000000
            THEN 'low_liquidity_below_1m_daily'
        END,
        CASE WHEN diagnostics.is_adr IS TRUE THEN 'adr' END,
        CASE WHEN diagnostics.price < 1 THEN 'price_below_1' END,
        CASE
          WHEN diagnostics.peg IS NULL OR diagnostics.peg <= 0
            THEN 'peg_nonpositive_or_missing'
        END,
        CASE
          WHEN diagnostics.price_to_earnings IS NULL
            OR diagnostics.price_to_earnings <= 0
            THEN 'pe_nonpositive_or_missing'
        END,
        CASE
          WHEN diagnostics.price_to_free_cash_flow IS NULL
            OR diagnostics.price_to_free_cash_flow <= 0
            THEN 'price_to_fcf_nonpositive_or_missing'
        END,
        CASE
          WHEN diagnostics.enterprise_multiple IS NULL
            OR diagnostics.enterprise_multiple <= 0
            THEN 'enterprise_multiple_nonpositive_or_missing'
        END,
        CASE
          WHEN diagnostics.share_dilution_yoy > 0.15
            AND diagnostics.share_dilution_yoy <= 0.50
            THEN 'share_dilution_over_15pct'
        END,
        CASE
          WHEN diagnostics.accrual_ratio > 0.10
            THEN 'high_accruals'
        END,
        CASE
          WHEN diagnostics.debt_growth_yoy > 0.50
            THEN 'debt_growth_over_50pct'
        END,
        CASE
          WHEN diagnostics.revenue_growth_yoy < -0.10
            THEN 'revenue_decline_over_10pct'
        END
      ]::text[], NULL) AS risk_flags
    FROM raw_diagnostics AS diagnostics
  )
  SELECT
    evaluated.current_rank,
    evaluated.symbol,
    evaluated.current_score,
    evaluated.company_name,
    evaluated.sector,
    evaluated.industry,
    evaluated.exchange,
    evaluated.market_cap,
    pg_catalog.round(evaluated.average_daily_dollar_volume, 2),
    evaluated.annual_statement_years,
    evaluated.positive_fcf_years,
    evaluated.latest_annual_date,
    evaluated.latest_accepted_at,
    pg_catalog.round(evaluated.revenue_growth_yoy, 4),
    pg_catalog.round(evaluated.share_dilution_yoy, 4),
    pg_catalog.round(evaluated.gross_profit_to_assets, 4),
    pg_catalog.round(evaluated.accrual_ratio, 4),
    pg_catalog.round(evaluated.free_cash_flow_margin, 4),
    evaluated.price_to_earnings,
    evaluated.peg,
    evaluated.price_to_free_cash_flow,
    evaluated.enterprise_multiple,
    evaluated.model_class,
    pg_catalog.cardinality(evaluated.gate_failures) = 0,
    evaluated.gate_failures,
    evaluated.risk_flags
  FROM evaluated
  ORDER BY evaluated.current_rank;
$$;

REVOKE ALL
ON FUNCTION public.get_compass_quality_shadow_audit(
  jsonb, integer, text[], text[]
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_compass_quality_shadow_audit(
  jsonb, integer, text[], text[]
)
TO service_role;

COMMENT ON FUNCTION public.get_compass_quality_shadow_audit(
  jsonb, integer, text[], text[]
) IS
  'Service-only, read-only comparison of current Compass leaders against provisional quality, liquidity, coverage, and security-type gates. It does not alter production ranking.';

COMMIT;
