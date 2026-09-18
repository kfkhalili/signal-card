-- P0.2a: complete point-in-time evidence capture for the current Hidden Gems
-- shadow output. SQL Editor compatible; read-only; no temporary or persistent
-- writes, queue activity, HTTP requests, or FMP calls.
--
-- Save the single JSON result unchanged. Rerun promptly against unchanged data
-- and compare snapshot_md5 to validate deterministic capture.

WITH candidates AS MATERIALIZED (
  SELECT candidate.*
  FROM public.get_compass_hidden_gems_shadow_v1(
    200,
    NULL,
    NULL
  ) AS candidate
),
requested_symbols AS MATERIALIZED (
  SELECT candidate.symbol
  FROM candidates AS candidate
),
insider_source AS MATERIALIZED (
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
  INNER JOIN requested_symbols AS requested
    ON requested.symbol = transaction.symbol
  WHERE transaction.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
    AND transaction.price > 0
  GROUP BY transaction.symbol
),
statement_source AS MATERIALIZED (
  SELECT
    statement.symbol,
    pg_catalog.count(*) FILTER (
      WHERE statement.period = 'FY'
    )::integer AS annual_rows,
    pg_catalog.count(*) FILTER (
      WHERE statement.period IS DISTINCT FROM 'FY'
    )::integer AS non_annual_rows,
    pg_catalog.max(statement.date) FILTER (
      WHERE statement.period = 'FY'
    ) AS newest_annual_date,
    pg_catalog.max(statement.date) FILTER (
      WHERE statement.period IS DISTINCT FROM 'FY'
    ) AS newest_non_annual_date,
    pg_catalog.max(statement.accepted_date) AS newest_accepted_at,
    pg_catalog.max(statement.fetched_at) AS newest_fetched_at,
    pg_catalog.array_agg(
      DISTINCT statement.reported_currency
      ORDER BY statement.reported_currency
    ) FILTER (
      WHERE statement.reported_currency IS NOT NULL
    ) AS reported_currencies
  FROM public.financial_statements AS statement
  INNER JOIN requested_symbols AS requested
    ON requested.symbol = statement.symbol
  GROUP BY statement.symbol
),
snapshot_rows AS MATERIALIZED (
  SELECT
    candidate.rank,
    pg_catalog.jsonb_build_object(
      'candidate', pg_catalog.to_jsonb(candidate),
      'source', pg_catalog.jsonb_build_object(
        'listed_symbol', pg_catalog.jsonb_build_object(
          'is_active', listed.is_active,
          'fmp_is_actively_trading', listed.fmp_is_actively_trading
        ),
        'profile', pg_catalog.jsonb_build_object(
          'modified_at', profile.modified_at,
          'price', profile.price,
          'market_cap', profile.market_cap,
          'average_volume', profile.average_volume,
          'currency', profile.currency,
          'is_adr', profile.is_adr,
          'is_etf', profile.is_etf,
          'is_fund', profile.is_fund
        ),
        'pillar_scores', pg_catalog.jsonb_build_object(
          'updated_at', score.updated_at,
          'norm_health', score.norm_health,
          'norm_growth_v2', score.norm_growth_v2,
          'growth_v2_updated_at', score.growth_v2_updated_at,
          'growth_v2_metrics', score.growth_v2_metrics
        ),
        'ratios', pg_catalog.jsonb_build_object(
          'fetched_at', ratios.fetched_at,
          'updated_at', ratios.updated_at,
          'enterprise_value_multiple_ttm',
            ratios.enterprise_value_multiple_ttm,
          'price_to_free_cash_flow_ratio_ttm',
            ratios.price_to_free_cash_flow_ratio_ttm,
          'debt_to_equity_ratio_ttm', ratios.debt_to_equity_ratio_ttm,
          'interest_coverage_ratio_ttm',
            ratios.interest_coverage_ratio_ttm
        ),
        'quote', pg_catalog.jsonb_build_object(
          'fetched_at', quote.fetched_at,
          'current_price', quote.current_price,
          'sma_200d', quote.sma_200d,
          'year_high', quote.year_high,
          'year_low', quote.year_low
        ),
        'analyst', pg_catalog.jsonb_build_object(
          'snapshot_date', analyst.date,
          'fetched_at', analyst.fetched_at,
          'coverage_count', analyst.coverage_count
        ),
        'insider', pg_catalog.jsonb_build_object(
          'newest_fetched_at', insider.newest_fetched_at,
          'net_value', coalesce(insider.net_insider_value, 0),
          'buyers', coalesce(insider.insider_buyers, 0)
        ),
        'financial_statements', pg_catalog.jsonb_build_object(
          'annual_rows', coalesce(statements.annual_rows, 0),
          'non_annual_rows', coalesce(statements.non_annual_rows, 0),
          'newest_annual_date', statements.newest_annual_date,
          'newest_non_annual_date', statements.newest_non_annual_date,
          'newest_accepted_at', statements.newest_accepted_at,
          'newest_fetched_at', statements.newest_fetched_at,
          'reported_currencies', coalesce(
            pg_catalog.to_jsonb(statements.reported_currencies),
            '[]'::jsonb
          )
        ),
        'fetch_freshness', coalesce(freshness.value, '{}'::jsonb),
        'open_quality_issues', coalesce(quality.value, '[]'::jsonb)
      )
    ) AS value
  FROM candidates AS candidate
  LEFT JOIN public.listed_symbols AS listed
    ON listed.symbol = candidate.symbol
  LEFT JOIN public.profiles AS profile
    ON profile.symbol = candidate.symbol
  LEFT JOIN public.compass_pillar_scores AS score
    ON score.symbol = candidate.symbol
  LEFT JOIN public.ratios_ttm AS ratios
    ON ratios.symbol = candidate.symbol
  LEFT JOIN public.live_quote_indicators AS quote
    ON quote.symbol = candidate.symbol
  LEFT JOIN insider_source AS insider
    ON insider.symbol = candidate.symbol
  LEFT JOIN statement_source AS statements
    ON statements.symbol = candidate.symbol
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
    WHERE history.symbol = candidate.symbol
      AND history.fetched_at >= pg_catalog.now() - INTERVAL '45 days'
    ORDER BY history.date DESC
    LIMIT 1
  ) AS analyst ON true
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
    WHERE freshness_row.symbol = candidate.symbol
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
    SELECT pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'check_code', issue.check_code,
        'severity', issue.severity,
        'message', issue.message,
        'last_seen_at', issue.last_seen_at
      )
      ORDER BY issue.severity DESC, issue.check_code
    ) AS value
    FROM public.data_quality_issues AS issue
    WHERE issue.symbol = candidate.symbol
      AND issue.status = 'open'
  ) AS quality ON true
),
snapshot AS (
  SELECT pg_catalog.jsonb_agg(
    snapshot_row.value
    ORDER BY snapshot_row.rank
  ) AS candidates
  FROM snapshot_rows AS snapshot_row
),
summary AS (
  SELECT pg_catalog.jsonb_build_object(
    'candidate_count', pg_catalog.count(*),
    'result_reached_function_cap', pg_catalog.count(*) = 200,
    'quality_dislocations', pg_catalog.count(*) FILTER (
      WHERE candidate.opportunity_type = 'quality_dislocation'
    ),
    'neglected_compounders', pg_catalog.count(*) FILTER (
      WHERE candidate.opportunity_type = 'neglected_compounder'
    ),
    'candidates_with_risk_flags', pg_catalog.count(*) FILTER (
      WHERE pg_catalog.cardinality(candidate.risk_flags) > 0
    ),
    'oldest_growth_v2_updated_at',
      pg_catalog.min(candidate.growth_v2_updated_at),
    'newest_growth_v2_updated_at',
      pg_catalog.max(candidate.growth_v2_updated_at)
  ) AS value
  FROM candidates AS candidate
)
SELECT pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'snapshot_version', 'p0.2a-v1',
  'model_function',
    'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])',
  'model_definition_md5', pg_catalog.md5(
    pg_catalog.pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'
        ::pg_catalog.regprocedure
    )
  ),
  'filters', pg_catalog.jsonb_build_object(
    'limit', 200,
    'industries', NULL,
    'exchanges', NULL
  ),
  'current_model_limitations', pg_catalog.jsonb_build_array(
    'function output is capped at 200 candidates',
    'function returns eligible candidates and does not expose exclusion reasons',
    'asymmetry rejection reasons remain in a separate read-only audit'
  ),
  'summary', summary.value,
  'snapshot_md5', pg_catalog.md5(snapshot.candidates::text),
  'candidates', snapshot.candidates
) AS compass_opportunity_snapshot
FROM snapshot
CROSS JOIN summary;
