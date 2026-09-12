-- Non-persistent production QA for the Hidden Gems shadow screen.
-- SQL Editor compatible. Temporary results are rolled back; the script makes
-- no HTTP requests and queues no work.

BEGIN;

CREATE TEMPORARY TABLE hidden_gems_quality_results (
  check_name text PRIMARY KEY,
  result jsonb NOT NULL
) ON COMMIT DROP;

WITH requested(symbol) AS (
  VALUES ('PDD'), ('SRAD'), ('SDHC'), ('DY'), ('ADBE')
),
candidates AS MATERIALIZED (
  SELECT candidate.*
  FROM public.get_compass_hidden_gems_shadow_v1(200, NULL, NULL) AS candidate
),
insider_source AS (
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
    )::integer AS insider_buyers,
    pg_catalog.max(transaction.fetched_at) AS newest_fetched_at
  FROM public.insider_transactions AS transaction
  JOIN requested ON requested.symbol = transaction.symbol
  WHERE transaction.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
    AND transaction.price > 0
  GROUP BY transaction.symbol
),
source_values AS (
  SELECT
    requested.symbol AS audit_symbol,
    candidate.*,
    listed.is_active,
    listed.fmp_is_actively_trading,
    profile.modified_at AS profile_modified_at,
    profile.price AS profile_price,
    profile.market_cap AS profile_market_cap,
    profile.average_volume AS profile_average_volume,
    profile.is_etf,
    profile.is_fund,
    profile.is_adr,
    score.growth_v2_metrics,
    ratios.updated_at AS ratios_updated_at,
    ratios.enterprise_value_multiple_ttm AS source_enterprise_multiple,
    ratios.price_to_free_cash_flow_ratio_ttm AS source_price_to_fcf,
    quote.fetched_at AS quote_fetched_at,
    quote.current_price AS quote_price,
    quote.sma_200d,
    quote.year_high,
    quote.year_low,
    grades.date AS analyst_snapshot_date,
    grades.fetched_at AS analyst_fetched_at,
    grades.coverage_count AS source_analyst_coverage_count,
    coalesce(insider.net_insider_value, 0)::numeric
      AS source_net_insider_value,
    coalesce(insider.insider_buyers, 0)::integer
      AS source_insider_buyers,
    insider.newest_fetched_at AS insider_fetched_at,
    coalesce(freshness.value, '{}'::jsonb) AS fetch_freshness,
    coalesce(quality.value, '[]'::jsonb) AS open_quality_issues,
    coalesce(quality.critical_count, 0) AS open_critical_issue_count
  FROM requested
  LEFT JOIN candidates AS candidate
    ON candidate.symbol = requested.symbol
  LEFT JOIN public.listed_symbols AS listed
    ON listed.symbol = requested.symbol
  LEFT JOIN public.profiles AS profile
    ON profile.symbol = requested.symbol
  LEFT JOIN public.compass_pillar_scores AS score
    ON score.symbol = requested.symbol
  LEFT JOIN public.ratios_ttm AS ratios
    ON ratios.symbol = requested.symbol
  LEFT JOIN public.live_quote_indicators AS quote
    ON quote.symbol = requested.symbol
  LEFT JOIN insider_source AS insider
    ON insider.symbol = requested.symbol
  LEFT JOIN LATERAL (
    SELECT
      history.date,
      history.fetched_at,
      (
        coalesce(history.analyst_ratings_strong_buy, 0)
        + coalesce(history.analyst_ratings_buy, 0)
        + coalesce(history.analyst_ratings_hold, 0)
        + coalesce(history.analyst_ratings_sell, 0)
        + coalesce(history.analyst_ratings_strong_sell, 0)
      )::integer AS coverage_count
    FROM public.grades_historical AS history
    WHERE history.symbol = requested.symbol
      AND history.fetched_at >= pg_catalog.now() - INTERVAL '45 days'
    ORDER BY history.date DESC
    LIMIT 1
  ) AS grades ON true
  LEFT JOIN LATERAL (
    SELECT pg_catalog.jsonb_object_agg(
      freshness_row.data_type,
      pg_catalog.jsonb_build_object(
        'last_success_at', freshness_row.last_success_at,
        'result_kind', freshness_row.result_kind,
        'response_size_bytes', freshness_row.response_size_bytes
      )
      ORDER BY freshness_row.data_type
    ) AS value
    FROM public.data_fetch_freshness_v2 AS freshness_row
    WHERE freshness_row.symbol = requested.symbol
      AND freshness_row.data_type IN (
        'profile',
        'quote',
        'ratios-ttm',
        'financial-statements',
        'grades-historical',
        'insider-transactions'
      )
  ) AS freshness ON true
  LEFT JOIN LATERAL (
    SELECT
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'check_code', issue.check_code,
          'severity', issue.severity,
          'message', issue.message,
          'last_seen_at', issue.last_seen_at
        )
        ORDER BY issue.severity DESC, issue.check_code
      ) AS value,
      pg_catalog.count(*) FILTER (
        WHERE issue.severity = 'critical'
      ) AS critical_count
    FROM public.data_quality_issues AS issue
    WHERE issue.symbol = requested.symbol
      AND issue.status = 'open'
  ) AS quality ON true
),
recomputed AS (
  SELECT
    source_values.*,
    CASE WHEN source_values.rank IS NOT NULL THEN
      source_values.improvement_score * 0.35
        + source_values.valuation_score * 0.25
        + source_values.insider_conviction_score * 0.15
        + source_values.recognition_score * 0.15
        + source_values.resilience_score * 0.10
        - source_values.repricing_penalty
    END AS expected_neglected_score,
    CASE
      WHEN source_values.rank IS NULL THEN NULL
      WHEN source_values.dislocation_score >= 60 THEN
        source_values.improvement_score * 0.30
          + source_values.valuation_score * 0.25
          + source_values.insider_conviction_score * 0.05
          + source_values.resilience_score * 0.25
          + source_values.dislocation_score * 0.15
      ELSE 0
    END AS expected_quality_score,
    CASE
      WHEN source_values.quote_fetched_at >= pg_catalog.now() - INTERVAL '7 days'
        AND source_values.quote_price > 0
        AND source_values.sma_200d > 0
        THEN source_values.quote_price::numeric
          / source_values.sma_200d::numeric
    END AS expected_price_to_sma_200,
    CASE
      WHEN source_values.quote_fetched_at >= pg_catalog.now() - INTERVAL '7 days'
        AND source_values.quote_price > 0
        AND source_values.year_high > source_values.year_low
        THEN (
          source_values.quote_price::numeric
            - source_values.year_low::numeric
        ) / (
          source_values.year_high::numeric
            - source_values.year_low::numeric
        )
    END AS expected_year_range_position
  FROM source_values
),
checked AS (
  SELECT
    recomputed.*,
    greatest(
      recomputed.expected_neglected_score,
      recomputed.expected_quality_score
    ) AS expected_opportunity_score,
    CASE
      WHEN recomputed.expected_quality_score
        >= recomputed.expected_neglected_score
        THEN 'quality_dislocation'
      ELSE 'neglected_compounder'
    END AS expected_opportunity_type
  FROM recomputed
),
results AS (
  SELECT
    checked.*,
    checked.rank IS NOT NULL AS candidate_present,
    pg_catalog.abs(
      checked.opportunity_score - checked.expected_opportunity_score
    ) <= 0.05 AS score_matches,
    checked.opportunity_type = checked.expected_opportunity_type
      AS strategy_matches,
    checked.analyst_coverage_count IS NOT DISTINCT FROM
      checked.source_analyst_coverage_count AS analyst_coverage_matches,
    pg_catalog.abs(
      checked.net_insider_value - checked.source_net_insider_value
    ) <= 0.01
      AND checked.insider_buyers = checked.source_insider_buyers
      AS insider_totals_match,
    checked.price_to_sma_200 IS NOT DISTINCT FROM
      pg_catalog.round(checked.expected_price_to_sma_200, 4)
      AND checked.year_range_position IS NOT DISTINCT FROM
        pg_catalog.round(checked.expected_year_range_position, 4)
      AS price_proxies_match
  FROM checked
)
INSERT INTO hidden_gems_quality_results (check_name, result)
SELECT
  'candidate_quality',
  pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'score_tolerance', 0.05,
  'summary', pg_catalog.jsonb_build_object(
    'requested_symbols', pg_catalog.count(*),
    'returned_candidates', pg_catalog.count(*) FILTER (
      WHERE candidate_present
    ),
    'score_matches', pg_catalog.count(*) FILTER (WHERE score_matches),
    'strategy_matches', pg_catalog.count(*) FILTER (WHERE strategy_matches),
    'source_matches', pg_catalog.count(*) FILTER (
      WHERE analyst_coverage_matches
        AND insider_totals_match
        AND price_proxies_match
    ),
    'candidates_with_open_critical_issues', pg_catalog.count(*) FILTER (
      WHERE candidate_present AND open_critical_issue_count > 0
    )
  ),
  'candidates', pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'symbol', audit_symbol,
      'rank', rank,
      'candidate_present', candidate_present,
      'opportunity_type', opportunity_type,
      'reported_score', opportunity_score,
      'expected_score', pg_catalog.round(expected_opportunity_score, 2),
      'score_delta', pg_catalog.round(
        pg_catalog.abs(opportunity_score - expected_opportunity_score),
        4
      ),
      'score_matches', score_matches,
      'strategy_matches', strategy_matches,
      'analyst_coverage_matches', analyst_coverage_matches,
      'insider_totals_match', insider_totals_match,
      'price_proxies_match', price_proxies_match,
      'risk_flags', risk_flags,
      'growth', pg_catalog.jsonb_build_object(
        'updated_at', growth_v2_updated_at,
        'metrics', growth_v2_metrics
      ),
      'profile', pg_catalog.jsonb_build_object(
        'modified_at', profile_modified_at,
        'price', profile_price,
        'market_cap', profile_market_cap,
        'average_volume', profile_average_volume,
        'is_etf', is_etf,
        'is_fund', is_fund,
        'is_adr', is_adr,
        'is_active', is_active,
        'fmp_is_actively_trading', fmp_is_actively_trading
      ),
      'valuation', pg_catalog.jsonb_build_object(
        'updated_at', ratios_updated_at,
        'enterprise_multiple', source_enterprise_multiple,
        'price_to_free_cash_flow', source_price_to_fcf
      ),
      'quote', pg_catalog.jsonb_build_object(
        'fetched_at', quote_fetched_at,
        'price', quote_price,
        'sma_200d', sma_200d,
        'year_high', year_high,
        'year_low', year_low
      ),
      'analyst', pg_catalog.jsonb_build_object(
        'snapshot_date', analyst_snapshot_date,
        'fetched_at', analyst_fetched_at,
        'coverage_count', source_analyst_coverage_count
      ),
      'insider', pg_catalog.jsonb_build_object(
        'fetched_at', insider_fetched_at,
        'net_value', source_net_insider_value,
        'buyers', source_insider_buyers
      ),
      'fetch_freshness', fetch_freshness,
      'open_quality_issues', open_quality_issues
    )
    ORDER BY rank NULLS LAST, audit_symbol
  )
)
FROM results;

-- Verify production filter behavior and safe degradation in one result.
WITH baseline AS MATERIALIZED (
  SELECT *
  FROM public.get_compass_hidden_gems_shadow_v1(200, NULL, NULL)
),
reference AS (
  SELECT symbol, industry, exchange
  FROM baseline
  ORDER BY rank
  LIMIT 1
),
industry_filtered AS MATERIALIZED (
  SELECT candidate.*
  FROM reference
  CROSS JOIN LATERAL public.get_compass_hidden_gems_shadow_v1(
    200,
    ARRAY[reference.industry],
    NULL
  ) AS candidate
),
exchange_filtered AS MATERIALIZED (
  SELECT candidate.*
  FROM reference
  CROSS JOIN LATERAL public.get_compass_hidden_gems_shadow_v1(
    200,
    NULL,
    ARRAY[pg_catalog.lower(reference.exchange)]
  ) AS candidate
),
impossible_filtered AS MATERIALIZED (
  SELECT *
  FROM public.get_compass_hidden_gems_shadow_v1(
    200,
    ARRAY['__NO_SUCH_INDUSTRY__'],
    ARRAY['__NO_SUCH_EXCHANGE__']
  )
),
facts AS (
  SELECT
    (SELECT count(*) FROM baseline) AS baseline_candidates,
    EXISTS (
      SELECT 1
      FROM industry_filtered, reference
      WHERE industry_filtered.symbol = reference.symbol
    )
      AND NOT EXISTS (
        SELECT 1
        FROM industry_filtered, reference
        WHERE industry_filtered.industry IS DISTINCT FROM reference.industry
      ) AS industry_filter_correct,
    EXISTS (
      SELECT 1
      FROM exchange_filtered, reference
      WHERE exchange_filtered.symbol = reference.symbol
    )
      AND NOT EXISTS (
        SELECT 1
        FROM exchange_filtered, reference
        WHERE pg_catalog.upper(exchange_filtered.exchange)
          IS DISTINCT FROM pg_catalog.upper(reference.exchange)
      ) AS case_insensitive_exchange_filter_correct,
    (SELECT count(*) FROM impossible_filtered) = 0
      AS impossible_filters_return_empty,
    count(*) FILTER (
      WHERE 'quote_missing_or_stale' = ANY(baseline.risk_flags)
    ) AS missing_quote_candidates,
    count(*) FILTER (
      WHERE 'analyst_coverage_missing' = ANY(baseline.risk_flags)
    ) AS missing_analyst_candidates,
    count(*) FILTER (
      WHERE (
        'quote_missing_or_stale' = ANY(baseline.risk_flags)
        OR 'price_history_proxy_incomplete' = ANY(baseline.risk_flags)
      )
        AND baseline.quality_dislocation_score > 0
    ) AS incomplete_quote_quality_signals,
    count(DISTINCT baseline.symbol) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.data_quality_issues AS issue
        WHERE issue.symbol = baseline.symbol
          AND issue.status = 'open'
          AND issue.severity = 'critical'
          AND issue.check_code IN (
            'balance_sheet_reconciliation',
            'market_cap_reconciliation',
            'reporting_period_integrity',
            'source_timestamp_regression'
          )
      )
    ) AS candidates_with_blocking_quality_issues
  FROM baseline
)
INSERT INTO hidden_gems_quality_results (check_name, result)
SELECT
  'behavior',
  pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'baseline_candidates', facts.baseline_candidates,
  'industry_filter_correct', facts.industry_filter_correct,
  'case_insensitive_exchange_filter_correct',
    facts.case_insensitive_exchange_filter_correct,
  'impossible_filters_return_empty', facts.impossible_filters_return_empty,
  'missing_quote_candidates', facts.missing_quote_candidates,
  'missing_analyst_candidates', facts.missing_analyst_candidates,
  'incomplete_quote_quality_signals',
    facts.incomplete_quote_quality_signals,
  'candidates_with_blocking_quality_issues',
    facts.candidates_with_blocking_quality_issues,
  'healthy',
    facts.baseline_candidates > 0
    AND facts.industry_filter_correct
    AND facts.case_insensitive_exchange_filter_correct
    AND facts.impossible_filters_return_empty
    AND facts.incomplete_quote_quality_signals = 0
    AND facts.candidates_with_blocking_quality_issues = 0
)
FROM facts;

SELECT pg_catalog.jsonb_object_agg(check_name, result ORDER BY check_name)
  AS hidden_gems_quality_verification
FROM hidden_gems_quality_results;

ROLLBACK;
