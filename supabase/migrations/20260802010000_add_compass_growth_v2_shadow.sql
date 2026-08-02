-- Add a service-only Growth v2 shadow leaderboard.
--
-- Growth v2 measures multi-year, per-share operating progress. PEG is
-- intentionally absent: it is a valuation shortcut and negative PEG values
-- do not represent positive growth. This function does not alter the public
-- Compass leaderboard.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_compass_growth_shadow_leaderboard_v2(
  p_limit integer DEFAULT 50,
  p_industries text[] DEFAULT NULL,
  p_exchanges text[] DEFAULT NULL
)
RETURNS TABLE(
  rank bigint,
  symbol text,
  growth_score numeric,
  company_name text,
  sector text,
  industry text,
  exchange text,
  market_cap bigint,
  average_daily_dollar_volume numeric,
  annual_statement_years integer,
  positive_fcf_years integer,
  latest_annual_date date,
  revenue_per_share_cagr numeric,
  operating_income_per_share_cagr numeric,
  free_cash_flow_per_share_cagr numeric,
  growth_consistency numeric,
  return_on_invested_capital numeric,
  share_dilution_yoy numeric,
  metric_coverage integer,
  revenue_growth_score numeric,
  operating_income_growth_score numeric,
  free_cash_flow_growth_score numeric,
  consistency_score numeric,
  capital_efficiency_score numeric,
  risk_flags text[]
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH eligible_universe AS MATERIALIZED (
    SELECT
      profile.symbol,
      profile.company_name,
      profile.sector,
      profile.industry,
      profile.exchange,
      profile.market_cap,
      profile.price,
      profile.average_volume,
      profile.is_adr,
      profile.modified_at
    FROM public.listed_symbols AS listed
    INNER JOIN public.profiles AS profile
      ON profile.symbol = listed.symbol
    WHERE listed.is_active = true
      AND listed.fmp_is_actively_trading IS DISTINCT FROM false
      AND profile.is_etf IS NOT TRUE
      AND profile.is_fund IS NOT TRUE
      AND profile.market_cap >= 50000000
      AND profile.price > 0
      AND profile.average_volume > 0
      AND profile.price::numeric * profile.average_volume::numeric >= 500000
      AND profile.modified_at >= pg_catalog.now() - INTERVAL '72 hours'
      AND NOT (
        profile.sector ILIKE '%financial%'
        OR profile.industry ~* '(bank|insurance|credit services|asset management|mortgage)'
        OR profile.sector ILIKE '%real estate%'
        OR profile.industry ~* '(reit|real estate)'
      )
      AND NOT (
        profile.company_name ~* '(preferred (stock|shares?)|depositary shares?|warrants?|rights?|units?|notes? due|bonds?|debentures?)'
        OR profile.company_name ~ '[[:space:]][0-9]+([.][0-9]+)?%?$'
      )
      AND (
        p_industries IS NULL
        OR pg_catalog.array_length(p_industries, 1) IS NULL
        OR profile.industry = ANY(p_industries)
      )
      AND (
        p_exchanges IS NULL
        OR pg_catalog.array_length(p_exchanges, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.exchange_variants AS variant
          WHERE variant.symbol = profile.symbol
            AND EXISTS (
              SELECT 1
              FROM pg_catalog.unnest(p_exchanges) AS requested(exchange_name)
              WHERE pg_catalog.upper(requested.exchange_name) =
                    pg_catalog.upper(variant.exchange_short_name)
            )
        )
      )
  ),
  extracted_annual AS (
    SELECT
      statement.symbol,
      statement.date,
      statement.accepted_date,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.income_statement_payload -> 'revenue'
        ) = 'number'
          THEN (statement.income_statement_payload ->> 'revenue')::numeric
      END AS revenue,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.income_statement_payload -> 'operatingIncome'
        ) = 'number'
          THEN (
            statement.income_statement_payload ->> 'operatingIncome'
          )::numeric
      END AS operating_income,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.income_statement_payload -> 'incomeBeforeTax'
        ) = 'number'
          THEN (
            statement.income_statement_payload ->> 'incomeBeforeTax'
          )::numeric
      END AS income_before_tax,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.income_statement_payload -> 'incomeTaxExpense'
        ) = 'number'
          THEN (
            statement.income_statement_payload ->> 'incomeTaxExpense'
          )::numeric
      END AS income_tax_expense,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.income_statement_payload -> 'weightedAverageShsOutDil'
        ) = 'number'
          THEN (
            statement.income_statement_payload ->> 'weightedAverageShsOutDil'
          )::numeric
        WHEN pg_catalog.jsonb_typeof(
          statement.income_statement_payload -> 'weightedAverageShsOut'
        ) = 'number'
          THEN (
            statement.income_statement_payload ->> 'weightedAverageShsOut'
          )::numeric
      END AS diluted_shares,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.balance_sheet_payload -> 'totalStockholdersEquity'
        ) = 'number'
          THEN (
            statement.balance_sheet_payload ->> 'totalStockholdersEquity'
          )::numeric
        WHEN pg_catalog.jsonb_typeof(
          statement.balance_sheet_payload -> 'totalEquity'
        ) = 'number'
          THEN (statement.balance_sheet_payload ->> 'totalEquity')::numeric
      END AS total_equity,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.balance_sheet_payload -> 'totalDebt'
        ) = 'number'
          THEN (statement.balance_sheet_payload ->> 'totalDebt')::numeric
      END AS total_debt,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.balance_sheet_payload -> 'cashAndCashEquivalents'
        ) = 'number'
          THEN (
            statement.balance_sheet_payload ->> 'cashAndCashEquivalents'
          )::numeric
      END AS cash_and_equivalents,
      CASE
        WHEN pg_catalog.jsonb_typeof(
          statement.cash_flow_payload -> 'freeCashFlow'
        ) = 'number'
          THEN (statement.cash_flow_payload ->> 'freeCashFlow')::numeric
      END AS free_cash_flow
    FROM public.financial_statements AS statement
    INNER JOIN eligible_universe AS eligible
      ON eligible.symbol = statement.symbol
    WHERE statement.period = 'FY'
  ),
  ranked_annual AS (
    SELECT
      annual.*,
      pg_catalog.row_number() OVER (
        PARTITION BY annual.symbol
        ORDER BY annual.date DESC, annual.accepted_date DESC NULLS LAST
      ) AS recency,
      annual.revenue / nullif(annual.diluted_shares, 0)
        AS revenue_per_share,
      annual.operating_income / nullif(annual.diluted_shares, 0)
        AS operating_income_per_share,
      annual.free_cash_flow / nullif(annual.diluted_shares, 0)
        AS free_cash_flow_per_share
    FROM extracted_annual AS annual
  ),
  five_year_history AS MATERIALIZED (
    SELECT annual.*
    FROM ranked_annual AS annual
    WHERE annual.recency <= 5
  ),
  history_with_prior AS (
    SELECT
      history.*,
      pg_catalog.lag(history.revenue_per_share) OVER (
        PARTITION BY history.symbol ORDER BY history.date
      ) AS prior_revenue_per_share,
      pg_catalog.lag(history.operating_income_per_share) OVER (
        PARTITION BY history.symbol ORDER BY history.date
      ) AS prior_operating_income_per_share,
      pg_catalog.lag(history.free_cash_flow_per_share) OVER (
        PARTITION BY history.symbol ORDER BY history.date
      ) AS prior_free_cash_flow_per_share
    FROM five_year_history AS history
  ),
  history_summary AS (
    SELECT
      history.symbol,
      pg_catalog.count(*)::integer AS annual_statement_years,
      pg_catalog.count(*) FILTER (
        WHERE history.free_cash_flow > 0
      )::integer AS positive_fcf_years,
      pg_catalog.min(history.date) AS oldest_annual_date,
      pg_catalog.max(history.date) AS latest_annual_date,
      (pg_catalog.max(history.date) - pg_catalog.min(history.date))::numeric
        / 365.25 AS history_span_years,
      (pg_catalog.array_agg(
        history.revenue_per_share ORDER BY history.date ASC
      ))[1] AS oldest_revenue_per_share,
      pg_catalog.max(history.revenue_per_share) FILTER (
        WHERE history.recency = 1
      ) AS latest_revenue_per_share,
      (pg_catalog.array_agg(
        history.operating_income_per_share ORDER BY history.date ASC
      ))[1] AS oldest_operating_income_per_share,
      pg_catalog.max(history.operating_income_per_share) FILTER (
        WHERE history.recency = 1
      ) AS latest_operating_income_per_share,
      (pg_catalog.array_agg(
        history.free_cash_flow_per_share ORDER BY history.date ASC
      ))[1] AS oldest_free_cash_flow_per_share,
      pg_catalog.max(history.free_cash_flow_per_share) FILTER (
        WHERE history.recency = 1
      ) AS latest_free_cash_flow_per_share,
      (pg_catalog.array_agg(
        history.diluted_shares ORDER BY history.date ASC
      ))[1] AS oldest_diluted_shares,
      pg_catalog.max(history.diluted_shares) FILTER (
        WHERE history.recency = 1
      ) AS latest_diluted_shares,
      pg_catalog.max(history.diluted_shares) FILTER (
        WHERE history.recency = 2
      ) AS previous_diluted_shares,
      pg_catalog.max(history.operating_income) FILTER (
        WHERE history.recency = 1
      ) AS latest_operating_income,
      pg_catalog.max(history.income_before_tax) FILTER (
        WHERE history.recency = 1
      ) AS latest_income_before_tax,
      pg_catalog.max(history.income_tax_expense) FILTER (
        WHERE history.recency = 1
      ) AS latest_income_tax_expense,
      pg_catalog.max(history.total_equity) FILTER (
        WHERE history.recency = 1
      ) AS latest_total_equity,
      pg_catalog.max(history.total_debt) FILTER (
        WHERE history.recency = 1
      ) AS latest_total_debt,
      pg_catalog.max(history.cash_and_equivalents) FILTER (
        WHERE history.recency = 1
      ) AS latest_cash_and_equivalents,
      pg_catalog.sum(
        CASE
          WHEN history.prior_revenue_per_share > 0
            AND history.revenue_per_share > 0
            AND history.revenue_per_share > history.prior_revenue_per_share
            THEN 1
          ELSE 0
        END
        + CASE
          WHEN history.prior_operating_income_per_share > 0
            AND history.operating_income_per_share > 0
            AND history.operating_income_per_share >
                history.prior_operating_income_per_share
            THEN 1
          ELSE 0
        END
        + CASE
          WHEN history.prior_free_cash_flow_per_share > 0
            AND history.free_cash_flow_per_share > 0
            AND history.free_cash_flow_per_share >
                history.prior_free_cash_flow_per_share
            THEN 1
          ELSE 0
        END
      )::integer AS positive_growth_checks,
      pg_catalog.sum(
        CASE
          WHEN history.prior_revenue_per_share > 0
            AND history.revenue_per_share > 0
            THEN 1
          ELSE 0
        END
        + CASE
          WHEN history.prior_operating_income_per_share > 0
            AND history.operating_income_per_share > 0
            THEN 1
          ELSE 0
        END
        + CASE
          WHEN history.prior_free_cash_flow_per_share > 0
            AND history.free_cash_flow_per_share > 0
            THEN 1
          ELSE 0
        END
      )::integer AS growth_checks
    FROM history_with_prior AS history
    GROUP BY history.symbol
  ),
  calculated_metrics AS (
    SELECT
      summary.*,
      CASE
        WHEN summary.history_span_years >= 1.5
          AND summary.oldest_revenue_per_share > 0
          AND summary.latest_revenue_per_share > 0
          THEN pg_catalog.power(
            summary.latest_revenue_per_share
              / summary.oldest_revenue_per_share,
            1 / summary.history_span_years
          ) - 1
      END AS revenue_per_share_cagr,
      CASE
        WHEN summary.history_span_years >= 1.5
          AND summary.oldest_operating_income_per_share > 0
          AND summary.latest_operating_income_per_share > 0
          THEN pg_catalog.power(
            summary.latest_operating_income_per_share
              / summary.oldest_operating_income_per_share,
            1 / summary.history_span_years
          ) - 1
      END AS operating_income_per_share_cagr,
      CASE
        WHEN summary.history_span_years >= 1.5
          AND summary.oldest_free_cash_flow_per_share > 0
          AND summary.latest_free_cash_flow_per_share > 0
          THEN pg_catalog.power(
            summary.latest_free_cash_flow_per_share
              / summary.oldest_free_cash_flow_per_share,
            1 / summary.history_span_years
          ) - 1
      END AS free_cash_flow_per_share_cagr,
      summary.positive_growth_checks::numeric
        / nullif(summary.growth_checks, 0) AS growth_consistency,
      CASE
        WHEN summary.latest_operating_income > 0
          AND summary.latest_total_equity + summary.latest_total_debt
              - summary.latest_cash_and_equivalents > 0
          THEN summary.latest_operating_income
            * (
              1 - CASE
                WHEN summary.latest_income_before_tax > 0
                  AND summary.latest_income_tax_expense >= 0
                  THEN least(
                    greatest(
                      summary.latest_income_tax_expense
                        / summary.latest_income_before_tax,
                      0
                    ),
                    0.35
                  )
                ELSE 0.21
              END
            )
            / (
              summary.latest_total_equity
              + summary.latest_total_debt
              - summary.latest_cash_and_equivalents
            )
      END AS return_on_invested_capital,
      (summary.latest_diluted_shares - summary.previous_diluted_shares)
        / nullif(summary.previous_diluted_shares, 0) AS share_dilution_yoy
    FROM history_summary AS summary
  ),
  candidate_metrics AS MATERIALIZED (
    SELECT
      eligible.*,
      metrics.annual_statement_years,
      metrics.positive_fcf_years,
      metrics.latest_annual_date,
      metrics.revenue_per_share_cagr,
      metrics.operating_income_per_share_cagr,
      metrics.free_cash_flow_per_share_cagr,
      metrics.growth_consistency,
      metrics.return_on_invested_capital,
      metrics.share_dilution_yoy,
      (
        (metrics.revenue_per_share_cagr IS NOT NULL)::integer
        + (metrics.operating_income_per_share_cagr IS NOT NULL)::integer
        + (metrics.free_cash_flow_per_share_cagr IS NOT NULL)::integer
        + (metrics.growth_consistency IS NOT NULL)::integer
        + (metrics.return_on_invested_capital IS NOT NULL)::integer
      )::integer AS metric_coverage
    FROM calculated_metrics AS metrics
    INNER JOIN eligible_universe AS eligible
      ON eligible.symbol = metrics.symbol
    WHERE metrics.annual_statement_years >= 3
      AND metrics.positive_fcf_years >= 3
      AND metrics.latest_annual_date >= CURRENT_DATE - INTERVAL '21 months'
      AND metrics.growth_checks >= 4
      AND metrics.share_dilution_yoy IS NOT NULL
      AND metrics.share_dilution_yoy <= 0.50
      AND metrics.revenue_per_share_cagr > 0
      AND (
        metrics.operating_income_per_share_cagr > 0
        OR metrics.free_cash_flow_per_share_cagr > 0
      )
      AND metrics.return_on_invested_capital > 0
  ),
  revenue_scores AS (
    SELECT
      candidate.symbol,
      pg_catalog.percent_rank() OVER (
        ORDER BY candidate.revenue_per_share_cagr
      ) * 100 AS score
    FROM candidate_metrics AS candidate
    WHERE candidate.revenue_per_share_cagr > 0
  ),
  operating_income_scores AS (
    SELECT
      candidate.symbol,
      pg_catalog.percent_rank() OVER (
        ORDER BY candidate.operating_income_per_share_cagr
      ) * 100 AS score
    FROM candidate_metrics AS candidate
    WHERE candidate.operating_income_per_share_cagr > 0
  ),
  free_cash_flow_scores AS (
    SELECT
      candidate.symbol,
      pg_catalog.percent_rank() OVER (
        ORDER BY candidate.free_cash_flow_per_share_cagr
      ) * 100 AS score
    FROM candidate_metrics AS candidate
    WHERE candidate.free_cash_flow_per_share_cagr > 0
  ),
  consistency_scores AS (
    SELECT
      candidate.symbol,
      pg_catalog.percent_rank() OVER (
        ORDER BY candidate.growth_consistency
      ) * 100 AS score
    FROM candidate_metrics AS candidate
    WHERE candidate.growth_consistency IS NOT NULL
  ),
  capital_efficiency_scores AS (
    SELECT
      candidate.symbol,
      pg_catalog.percent_rank() OVER (
        ORDER BY candidate.return_on_invested_capital
      ) * 100 AS score
    FROM candidate_metrics AS candidate
    WHERE candidate.return_on_invested_capital > 0
  ),
  scored AS (
    SELECT
      candidate.*,
      coalesce(revenue.score, 0)::numeric AS revenue_growth_score,
      coalesce(operating.score, 0)::numeric
        AS operating_income_growth_score,
      coalesce(free_cash_flow.score, 0)::numeric
        AS free_cash_flow_growth_score,
      coalesce(consistency.score, 0)::numeric AS consistency_score,
      coalesce(capital_efficiency.score, 0)::numeric
        AS capital_efficiency_score,
      (
        coalesce(revenue.score, 0) * 0.25
        + coalesce(operating.score, 0) * 0.25
        + coalesce(free_cash_flow.score, 0) * 0.25
        + coalesce(consistency.score, 0) * 0.15
        + coalesce(capital_efficiency.score, 0) * 0.10
      )::numeric AS growth_score
    FROM candidate_metrics AS candidate
    LEFT JOIN revenue_scores AS revenue
      ON revenue.symbol = candidate.symbol
    LEFT JOIN operating_income_scores AS operating
      ON operating.symbol = candidate.symbol
    LEFT JOIN free_cash_flow_scores AS free_cash_flow
      ON free_cash_flow.symbol = candidate.symbol
    LEFT JOIN consistency_scores AS consistency
      ON consistency.symbol = candidate.symbol
    LEFT JOIN capital_efficiency_scores AS capital_efficiency
      ON capital_efficiency.symbol = candidate.symbol
    WHERE (
      (candidate.revenue_per_share_cagr IS NOT NULL)::integer
      + (candidate.operating_income_per_share_cagr IS NOT NULL)::integer
      + (candidate.free_cash_flow_per_share_cagr IS NOT NULL)::integer
      + (candidate.growth_consistency IS NOT NULL)::integer
      + (candidate.return_on_invested_capital IS NOT NULL)::integer
    ) >= 4
  ),
  ranked AS (
    SELECT
      pg_catalog.row_number() OVER (
        ORDER BY scored.growth_score DESC, scored.symbol ASC
      )::bigint AS rank,
      scored.*
    FROM scored
  )
  SELECT
    ranked.rank,
    ranked.symbol,
    pg_catalog.round(ranked.growth_score, 2),
    ranked.company_name,
    ranked.sector,
    ranked.industry,
    ranked.exchange,
    ranked.market_cap,
    pg_catalog.round(
      ranked.price::numeric * ranked.average_volume::numeric,
      2
    ),
    ranked.annual_statement_years,
    ranked.positive_fcf_years,
    ranked.latest_annual_date,
    pg_catalog.round(ranked.revenue_per_share_cagr, 4),
    pg_catalog.round(ranked.operating_income_per_share_cagr, 4),
    pg_catalog.round(ranked.free_cash_flow_per_share_cagr, 4),
    pg_catalog.round(ranked.growth_consistency, 4),
    pg_catalog.round(ranked.return_on_invested_capital, 4),
    pg_catalog.round(ranked.share_dilution_yoy, 4),
    ranked.metric_coverage,
    pg_catalog.round(ranked.revenue_growth_score, 2),
    pg_catalog.round(ranked.operating_income_growth_score, 2),
    pg_catalog.round(ranked.free_cash_flow_growth_score, 2),
    pg_catalog.round(ranked.consistency_score, 2),
    pg_catalog.round(ranked.capital_efficiency_score, 2),
    pg_catalog.array_remove(ARRAY[
      CASE
        WHEN ranked.market_cap < 100000000
          THEN 'microcap_below_100m'
      END,
      CASE
        WHEN ranked.price::numeric * ranked.average_volume::numeric < 1000000
          THEN 'low_liquidity_below_1m_daily'
      END,
      CASE WHEN ranked.is_adr IS TRUE THEN 'adr' END,
      CASE
        WHEN ranked.revenue_per_share_cagr < 0.03
          THEN 'revenue_per_share_growth_below_3pct'
      END,
      CASE
        WHEN ranked.operating_income_per_share_cagr IS NULL
          OR ranked.operating_income_per_share_cagr <= 0
          THEN 'operating_income_per_share_not_growing'
      END,
      CASE
        WHEN ranked.free_cash_flow_per_share_cagr IS NULL
          OR ranked.free_cash_flow_per_share_cagr <= 0
          THEN 'free_cash_flow_per_share_not_growing'
      END,
      CASE
        WHEN ranked.growth_consistency < 0.60
          THEN 'growth_consistency_below_60pct'
      END,
      CASE
        WHEN ranked.return_on_invested_capital < 0.10
          THEN 'roic_below_10pct'
      END,
      CASE
        WHEN ranked.share_dilution_yoy > 0.15
          THEN 'share_dilution_over_15pct'
      END,
      CASE
        WHEN ranked.revenue_per_share_cagr > 1
          OR ranked.operating_income_per_share_cagr > 1
          OR ranked.free_cash_flow_per_share_cagr > 1
          THEN 'growth_rate_over_100pct_requires_review'
      END
    ]::text[], NULL) AS risk_flags
  FROM ranked
  WHERE ranked.rank <= greatest(
    1,
    least(coalesce(p_limit, 50), 200)
  )
  ORDER BY ranked.rank;
$$;

REVOKE ALL
ON FUNCTION public.get_compass_growth_shadow_leaderboard_v2(
  integer, text[], text[]
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_compass_growth_shadow_leaderboard_v2(
  integer, text[], text[]
)
TO service_role;

COMMENT ON FUNCTION public.get_compass_growth_shadow_leaderboard_v2(
  integer, text[], text[]
) IS
  'Service-only Growth v2 shadow leaderboard based on multi-year per-share revenue, operating-income, and free-cash-flow growth, consistency, and ROIC. It neither uses PEG nor changes production ranking.';

COMMIT;
