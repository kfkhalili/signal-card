-- Add a service-only Hidden Gems shadow ranking.
--
-- This is a read-only discovery screen, not a replacement for the public
-- Compass leaderboard. It reuses precomputed Growth v2 scores and existing
-- durable data. It never queues work or invokes FMP.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_compass_hidden_gems_shadow_v1(
  p_limit integer DEFAULT 50,
  p_industries text[] DEFAULT NULL,
  p_exchanges text[] DEFAULT NULL
)
RETURNS TABLE(
  rank bigint,
  symbol text,
  opportunity_score numeric,
  opportunity_type text,
  neglected_compounder_score numeric,
  quality_dislocation_score numeric,
  company_name text,
  sector text,
  industry text,
  exchange text,
  market_cap bigint,
  average_daily_dollar_volume numeric,
  improvement_score numeric,
  valuation_score numeric,
  insider_conviction_score numeric,
  recognition_score numeric,
  resilience_score numeric,
  dislocation_score numeric,
  repricing_penalty numeric,
  enterprise_multiple numeric,
  price_to_free_cash_flow numeric,
  net_insider_value numeric,
  insider_buyers integer,
  analyst_coverage_count integer,
  price_to_sma_200 numeric,
  year_range_position numeric,
  growth_v2_updated_at timestamptz,
  risk_flags text[]
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH relevant_quality_issues AS (
    SELECT
      issue.symbol,
      pg_catalog.count(*)::integer AS issue_count
    FROM public.data_quality_issues AS issue
    WHERE issue.status = 'open'
      AND issue.severity = 'critical'
      AND issue.check_code IN (
        'balance_sheet_reconciliation',
        'market_cap_reconciliation',
        'reporting_period_integrity',
        'source_timestamp_regression'
      )
    GROUP BY issue.symbol
  ),
  insider_activity AS (
    SELECT
      transaction.symbol,
      pg_catalog.sum(
        CASE
          WHEN transaction.acquisition_or_disposition = 'A'
            AND (
              pg_catalog.upper(transaction.transaction_type) = 'P'
              OR pg_catalog.upper(transaction.transaction_type) LIKE 'P-%'
              OR pg_catalog.upper(transaction.transaction_type) LIKE '%PURCHASE%'
            )
            THEN transaction.securities_transacted::numeric
              * transaction.price::numeric
          WHEN transaction.acquisition_or_disposition = 'D'
            AND (
              pg_catalog.upper(transaction.transaction_type) = 'S'
              OR pg_catalog.upper(transaction.transaction_type) LIKE 'S-%'
              OR pg_catalog.upper(transaction.transaction_type) LIKE '%SALE%'
            )
            THEN -(transaction.securities_transacted::numeric
              * transaction.price::numeric)
          ELSE 0
        END
      ) AS net_insider_value,
      pg_catalog.count(DISTINCT transaction.reporting_cik) FILTER (
        WHERE transaction.acquisition_or_disposition = 'A'
          AND (
            pg_catalog.upper(transaction.transaction_type) = 'P'
            OR pg_catalog.upper(transaction.transaction_type) LIKE 'P-%'
            OR pg_catalog.upper(transaction.transaction_type) LIKE '%PURCHASE%'
          )
      )::integer AS insider_buyers
    FROM public.insider_transactions AS transaction
    WHERE transaction.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
      AND transaction.price > 0
    GROUP BY transaction.symbol
  ),
  eligible AS MATERIALIZED (
    SELECT
      scores.symbol,
      scores.norm_growth_v2::numeric AS improvement_score,
      scores.norm_health::numeric AS health_score,
      scores.growth_v2_metrics,
      scores.growth_v2_updated_at,
      profile.company_name,
      profile.sector,
      profile.industry,
      profile.exchange,
      profile.market_cap,
      profile.price,
      profile.average_volume,
      profile.is_adr,
      ratios.enterprise_value_multiple_ttm::numeric AS enterprise_multiple,
      ratios.price_to_free_cash_flow_ratio_ttm::numeric
        AS price_to_free_cash_flow,
      coalesce(insider.net_insider_value, 0)::numeric AS net_insider_value,
      coalesce(insider.insider_buyers, 0)::integer AS insider_buyers,
      grades.analyst_coverage_count,
      CASE
        WHEN quote.fetched_at >= pg_catalog.now() - INTERVAL '7 days'
          AND quote.current_price > 0
          AND quote.sma_200d > 0
          THEN quote.current_price::numeric / quote.sma_200d::numeric
      END AS price_to_sma_200,
      CASE
        WHEN quote.fetched_at >= pg_catalog.now() - INTERVAL '7 days'
          AND quote.current_price > 0
          AND quote.year_high > quote.year_low
          THEN (quote.current_price::numeric - quote.year_low::numeric)
            / (quote.year_high::numeric - quote.year_low::numeric)
      END AS year_range_position,
      quote.fetched_at AS quote_fetched_at
    FROM public.compass_pillar_scores AS scores
    INNER JOIN public.listed_symbols AS listed
      ON listed.symbol = scores.symbol
      AND listed.is_active = true
      AND listed.fmp_is_actively_trading IS DISTINCT FROM false
    INNER JOIN public.profiles AS profile
      ON profile.symbol = scores.symbol
    INNER JOIN public.ratios_ttm AS ratios
      ON ratios.symbol = scores.symbol
    LEFT JOIN public.live_quote_indicators AS quote
      ON quote.symbol = scores.symbol
    LEFT JOIN insider_activity AS insider
      ON insider.symbol = scores.symbol
    LEFT JOIN LATERAL (
      SELECT (
        coalesce(history.analyst_ratings_strong_buy, 0)
        + coalesce(history.analyst_ratings_buy, 0)
        + coalesce(history.analyst_ratings_hold, 0)
        + coalesce(history.analyst_ratings_sell, 0)
        + coalesce(history.analyst_ratings_strong_sell, 0)
      )::integer AS analyst_coverage_count
      FROM public.grades_historical AS history
      WHERE history.symbol = scores.symbol
        AND history.fetched_at >= pg_catalog.now() - INTERVAL '45 days'
      ORDER BY history.date DESC
      LIMIT 1
    ) AS grades ON true
    LEFT JOIN relevant_quality_issues AS quality
      ON quality.symbol = scores.symbol
    WHERE scores.norm_growth_v2 IS NOT NULL
      AND scores.norm_health IS NOT NULL
      AND scores.growth_v2_metrics IS NOT NULL
      AND scores.growth_v2_updated_at >= pg_catalog.now() - INTERVAL '25 hours'
      AND profile.modified_at >= pg_catalog.now() - INTERVAL '72 hours'
      AND ratios.updated_at >= pg_catalog.now() - INTERVAL '72 hours'
      AND profile.is_etf IS NOT TRUE
      AND profile.is_fund IS NOT TRUE
      AND profile.market_cap >= 50000000
      AND profile.price > 0
      AND profile.average_volume > 0
      AND profile.price::numeric * profile.average_volume::numeric >= 500000
      AND coalesce(quality.issue_count, 0) = 0
      AND (
        ratios.enterprise_value_multiple_ttm > 0
        OR ratios.price_to_free_cash_flow_ratio_ttm > 0
      )
  ),
  enterprise_ranked AS (
    SELECT
      eligible.symbol,
      pg_catalog.count(*) OVER (
        PARTITION BY eligible.industry
      )::integer AS industry_observations,
      (
        1 - pg_catalog.percent_rank() OVER (
          PARTITION BY eligible.industry
          ORDER BY eligible.enterprise_multiple ASC
        )
      ) * 100 AS industry_score,
      (
        1 - pg_catalog.percent_rank() OVER (
          ORDER BY eligible.enterprise_multiple ASC
        )
      ) * 100 AS global_score
    FROM eligible
    WHERE eligible.enterprise_multiple > 0
  ),
  free_cash_flow_ranked AS (
    SELECT
      eligible.symbol,
      pg_catalog.count(*) OVER (
        PARTITION BY eligible.industry
      )::integer AS industry_observations,
      (
        1 - pg_catalog.percent_rank() OVER (
          PARTITION BY eligible.industry
          ORDER BY eligible.price_to_free_cash_flow ASC
        )
      ) * 100 AS industry_score,
      (
        1 - pg_catalog.percent_rank() OVER (
          ORDER BY eligible.price_to_free_cash_flow ASC
        )
      ) * 100 AS global_score
    FROM eligible
    WHERE eligible.price_to_free_cash_flow > 0
  ),
  analyst_ranked AS (
    SELECT
      eligible.symbol,
      (
        1 - pg_catalog.percent_rank() OVER (
          ORDER BY eligible.analyst_coverage_count ASC
        )
      ) * 100 AS analyst_attention_score
    FROM eligible
    WHERE eligible.analyst_coverage_count IS NOT NULL
  ),
  insider_ranked AS (
    SELECT
      eligible.symbol,
      pg_catalog.cume_dist() OVER (
        ORDER BY eligible.net_insider_value
          / nullif(eligible.market_cap::numeric, 0) ASC
      ) * 100 AS insider_intensity_score
    FROM eligible
    WHERE eligible.net_insider_value > 0
  ),
  normalized AS (
    SELECT
      eligible.*,
      CASE
        WHEN enterprise.industry_observations >= 5
          THEN enterprise.industry_score
        ELSE enterprise.global_score
      END AS enterprise_value_score,
      CASE
        WHEN free_cash_flow.industry_observations >= 5
          THEN free_cash_flow.industry_score
        ELSE free_cash_flow.global_score
      END AS free_cash_flow_value_score,
      (
        1 - pg_catalog.percent_rank() OVER (
          ORDER BY eligible.market_cap ASC
        )
      ) * 100 AS market_cap_attention_score,
      coalesce(analyst.analyst_attention_score, 50) AS analyst_attention_score,
      coalesce(insider.insider_intensity_score, 0) AS insider_intensity_score
    FROM eligible
    LEFT JOIN enterprise_ranked AS enterprise
      ON enterprise.symbol = eligible.symbol
    LEFT JOIN free_cash_flow_ranked AS free_cash_flow
      ON free_cash_flow.symbol = eligible.symbol
    LEFT JOIN analyst_ranked AS analyst
      ON analyst.symbol = eligible.symbol
    LEFT JOIN insider_ranked AS insider
      ON insider.symbol = eligible.symbol
  ),
  components AS (
    SELECT
      normalized.*,
      CASE
        WHEN normalized.enterprise_value_score IS NOT NULL
          AND normalized.free_cash_flow_value_score IS NOT NULL
          THEN (
            normalized.enterprise_value_score
            + normalized.free_cash_flow_value_score
          ) / 2
        ELSE coalesce(
          normalized.enterprise_value_score,
          normalized.free_cash_flow_value_score,
          0
        )
      END AS valuation_score,
      (
        normalized.insider_intensity_score * 0.70
        + least(normalized.insider_buyers, 3)::numeric / 3 * 100 * 0.30
      ) AS insider_conviction_score,
      (
        normalized.market_cap_attention_score * 0.25
        + normalized.analyst_attention_score * 0.75
      ) AS recognition_score,
      (
        normalized.health_score * 0.70
        + coalesce(
          (normalized.growth_v2_metrics ->> 'growth_consistency')::numeric
            * 100,
          0
        ) * 0.30
      ) AS resilience_score,
      (
        CASE
          WHEN normalized.price_to_sma_200 IS NULL THEN 50
          WHEN normalized.price_to_sma_200 <= 0.80 THEN 100
          WHEN normalized.price_to_sma_200 >= 1.20 THEN 0
          ELSE (1.20 - normalized.price_to_sma_200) / 0.40 * 100
        END
        + CASE
          WHEN normalized.year_range_position IS NULL THEN 50
          ELSE (
            1 - greatest(
              0,
              least(normalized.year_range_position, 1)
            )
          ) * 100
        END
      ) / 2 AS dislocation_score,
      (
        CASE
          WHEN normalized.price_to_sma_200 IS NULL THEN 5
          WHEN normalized.price_to_sma_200 <= 1.10 THEN 0
          WHEN normalized.price_to_sma_200 <= 1.50
            THEN (normalized.price_to_sma_200 - 1.10) / 0.40 * 10
          ELSE 10 + least(
            (normalized.price_to_sma_200 - 1.50) / 0.50,
            1
          ) * 5
        END
        + CASE
          WHEN normalized.year_range_position IS NULL THEN 2.5
          WHEN normalized.year_range_position <= 0.75 THEN 0
          ELSE least(
            (normalized.year_range_position - 0.75) / 0.25,
            1
          ) * 5
        END
      ) AS repricing_penalty
    FROM normalized
  ),
  scored AS (
    SELECT
      components.*,
      greatest(
        0,
        components.improvement_score * 0.35
          + components.valuation_score * 0.25
          + components.insider_conviction_score * 0.15
          + components.recognition_score * 0.15
          + components.resilience_score * 0.10
          - components.repricing_penalty
      ) AS neglected_compounder_score,
      CASE
        WHEN components.dislocation_score >= 60
          THEN greatest(
            0,
            components.improvement_score * 0.30
              + components.valuation_score * 0.25
              + components.insider_conviction_score * 0.05
              + components.resilience_score * 0.25
              + components.dislocation_score * 0.15
          )
        ELSE 0
      END AS quality_dislocation_score,
      pg_catalog.array_remove(ARRAY[
        CASE
          WHEN components.quote_fetched_at IS NULL
            OR components.quote_fetched_at < pg_catalog.now() - INTERVAL '7 days'
            THEN 'quote_missing_or_stale'
        END,
        CASE
          WHEN components.price_to_sma_200 IS NULL
            OR components.year_range_position IS NULL
            THEN 'price_history_proxy_incomplete'
        END,
        CASE
          WHEN components.analyst_coverage_count IS NULL
            THEN 'analyst_coverage_missing'
        END,
        CASE
          WHEN components.enterprise_multiple IS NULL
            OR components.enterprise_multiple <= 0
            THEN 'enterprise_multiple_missing_or_nonpositive'
        END,
        CASE
          WHEN components.price_to_free_cash_flow IS NULL
            OR components.price_to_free_cash_flow <= 0
            THEN 'price_to_fcf_missing_or_nonpositive'
        END,
        CASE
          WHEN components.net_insider_value <= 0
            THEN 'no_positive_net_insider_buying'
        END,
        CASE
          WHEN components.market_cap < 100000000
            THEN 'microcap_below_100m'
        END,
        CASE
          WHEN components.price::numeric * components.average_volume::numeric
            < 1000000
            THEN 'average_dollar_volume_below_1m'
        END,
        CASE WHEN components.is_adr IS TRUE THEN 'adr' END,
        CASE
          WHEN components.price_to_sma_200 > 1.50
            THEN 'price_over_150pct_of_sma_200'
        END,
        CASE
          WHEN components.year_range_position > 0.90
            THEN 'price_in_top_10pct_of_52_week_range'
        END,
        CASE
          WHEN coalesce(
            components.growth_v2_metrics -> 'risk_flags',
            '[]'::jsonb
          ) ? 'growth_rate_over_100pct_requires_review'
            THEN 'growth_rate_over_100pct_requires_review'
        END
      ]::text[], NULL) AS risk_flags
    FROM components
  ),
  strategies AS (
    SELECT
      scored.*,
      greatest(
        scored.neglected_compounder_score,
        scored.quality_dislocation_score
      ) AS opportunity_score,
      CASE
        WHEN scored.quality_dislocation_score
          >= scored.neglected_compounder_score
          THEN 'quality_dislocation'
        ELSE 'neglected_compounder'
      END AS opportunity_type
    FROM scored
  ),
  filtered AS (
    SELECT scored.*
    FROM strategies AS scored
    WHERE (
      p_industries IS NULL
      OR pg_catalog.array_length(p_industries, 1) IS NULL
      OR scored.industry = ANY(p_industries)
    )
      AND (
        p_exchanges IS NULL
        OR pg_catalog.array_length(p_exchanges, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(p_exchanges) AS requested(exchange_name)
          WHERE pg_catalog.upper(requested.exchange_name)
            = pg_catalog.upper(scored.exchange)
        )
      )
  ),
  ranked AS (
    SELECT
      pg_catalog.row_number() OVER (
        ORDER BY filtered.opportunity_score DESC, filtered.symbol ASC
      )::bigint AS opportunity_rank,
      filtered.*
    FROM filtered
  )
  SELECT
    ranked.opportunity_rank,
    ranked.symbol,
    pg_catalog.round(ranked.opportunity_score::numeric, 2),
    ranked.opportunity_type,
    pg_catalog.round(ranked.neglected_compounder_score::numeric, 2),
    pg_catalog.round(ranked.quality_dislocation_score::numeric, 2),
    ranked.company_name,
    ranked.sector,
    ranked.industry,
    ranked.exchange,
    ranked.market_cap,
    pg_catalog.round(
      ranked.price::numeric * ranked.average_volume::numeric,
      2
    ),
    pg_catalog.round(ranked.improvement_score::numeric, 2),
    pg_catalog.round(ranked.valuation_score::numeric, 2),
    pg_catalog.round(ranked.insider_conviction_score::numeric, 2),
    pg_catalog.round(ranked.recognition_score::numeric, 2),
    pg_catalog.round(ranked.resilience_score::numeric, 2),
    pg_catalog.round(ranked.dislocation_score::numeric, 2),
    pg_catalog.round(ranked.repricing_penalty::numeric, 2),
    pg_catalog.round(ranked.enterprise_multiple::numeric, 2),
    pg_catalog.round(ranked.price_to_free_cash_flow::numeric, 2),
    pg_catalog.round(ranked.net_insider_value::numeric, 2),
    ranked.insider_buyers,
    ranked.analyst_coverage_count,
    pg_catalog.round(ranked.price_to_sma_200::numeric, 4),
    pg_catalog.round(ranked.year_range_position::numeric, 4),
    ranked.growth_v2_updated_at,
    ranked.risk_flags
  FROM ranked
  WHERE ranked.opportunity_rank <= greatest(
    1,
    least(coalesce(p_limit, 50), 200)
  )
  ORDER BY ranked.opportunity_rank;
$$;

REVOKE ALL
ON FUNCTION public.get_compass_hidden_gems_shadow_v1(
  integer, text[], text[]
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_compass_hidden_gems_shadow_v1(
  integer, text[], text[]
)
TO service_role;

COMMENT ON FUNCTION public.get_compass_hidden_gems_shadow_v1(
  integer, text[], text[]
) IS
  'Service-only, read-only opportunity screen with separate neglected-compounder and quality-dislocation strategies. Uses precomputed improvement, industry-relative value, insider buying, attention, resilience, and price-position proxies. Makes no external requests and does not alter the public Compass leaderboard.';

COMMIT;
