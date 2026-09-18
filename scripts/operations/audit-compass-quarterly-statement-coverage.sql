-- P0.2b: diagnose quarterly-statement coverage for the current Hidden Gems
-- candidate set. SQL Editor compatible; read-only; zero HTTP or FMP calls.
--
-- This measures stored evidence only. It does not claim that FMP lacks
-- quarterly data; the repository fetcher currently does not explicitly request
-- period=quarter even though its parser and table accept Q1-Q4 rows.

WITH candidates AS MATERIALIZED (
  SELECT candidate.*
  FROM public.get_compass_hidden_gems_shadow_v1(200, NULL, NULL) AS candidate
),
candidate_symbols AS MATERIALIZED (
  SELECT candidate.symbol
  FROM candidates AS candidate
),
statements AS MATERIALIZED (
  SELECT
    statement.*,
    pg_catalog.upper(pg_catalog.btrim(statement.period)) AS normalized_period,
    CASE
      WHEN pg_catalog.jsonb_typeof(
        statement.cash_flow_payload -> 'freeCashFlow'
      ) = 'number'
        THEN (statement.cash_flow_payload ->> 'freeCashFlow')::numeric
    END AS free_cash_flow
  FROM public.financial_statements AS statement
  INNER JOIN candidate_symbols AS candidate
    ON candidate.symbol = statement.symbol
),
quarter_rows AS MATERIALIZED (
  SELECT
    statement.*,
    pg_catalog.row_number() OVER (
      PARTITION BY statement.symbol
      ORDER BY statement.date DESC, statement.normalized_period DESC
    ) AS recency_rank
  FROM statements AS statement
  WHERE statement.normalized_period IN ('Q1', 'Q2', 'Q3', 'Q4')
),
quarter_support AS MATERIALIZED (
  SELECT
    quarter.symbol,
    pg_catalog.count(*) FILTER (
      WHERE quarter.recency_rank <= 4
    )::integer AS latest_four_rows,
    pg_catalog.count(*) FILTER (
      WHERE quarter.recency_rank <= 4
        AND quarter.free_cash_flow IS NOT NULL
    )::integer AS latest_four_fcf_rows,
    pg_catalog.min(quarter.date) FILTER (
      WHERE quarter.recency_rank <= 4
    ) AS earliest_of_latest_four,
    pg_catalog.max(quarter.date) FILTER (
      WHERE quarter.recency_rank <= 4
    ) AS latest_of_latest_four,
    pg_catalog.sum(quarter.free_cash_flow) FILTER (
      WHERE quarter.recency_rank <= 4
    ) AS trailing_four_quarter_fcf
  FROM quarter_rows AS quarter
  GROUP BY quarter.symbol
),
coverage AS MATERIALIZED (
  SELECT
    candidate.rank,
    candidate.symbol,
    candidate.exchange,
    candidate.sector,
    pg_catalog.count(statement.symbol)::integer AS statement_rows,
    pg_catalog.count(*) FILTER (
      WHERE statement.normalized_period = 'FY'
    )::integer AS annual_rows,
    pg_catalog.count(*) FILTER (
      WHERE statement.normalized_period IN ('Q1', 'Q2', 'Q3', 'Q4')
    )::integer AS quarterly_rows,
    pg_catalog.count(*) FILTER (
      WHERE statement.symbol IS NOT NULL
        AND statement.normalized_period NOT IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')
    )::integer AS other_period_rows,
    pg_catalog.max(statement.date) FILTER (
      WHERE statement.normalized_period = 'FY'
    ) AS newest_annual_date,
    pg_catalog.max(statement.date) FILTER (
      WHERE statement.normalized_period IN ('Q1', 'Q2', 'Q3', 'Q4')
    ) AS newest_quarterly_date,
    pg_catalog.max(statement.fetched_at) AS newest_fetched_at,
    pg_catalog.max(statement.accepted_date) AS newest_accepted_at,
    pg_catalog.count(DISTINCT statement.reported_currency) FILTER (
      WHERE statement.reported_currency IS NOT NULL
    )::integer AS reported_currency_count,
    coalesce(support.latest_four_rows, 0) AS latest_four_rows,
    coalesce(support.latest_four_fcf_rows, 0) AS latest_four_fcf_rows,
    support.earliest_of_latest_four,
    support.latest_of_latest_four,
    support.trailing_four_quarter_fcf,
    freshness.last_success_at,
    freshness.result_kind,
    registry.default_ttl_minutes,
    CASE
      WHEN freshness.last_success_at IS NULL THEN NULL
      ELSE freshness.last_success_at
        < pg_catalog.now()
          - pg_catalog.make_interval(mins => registry.default_ttl_minutes)
    END AS fetch_is_stale
  FROM candidates AS candidate
  LEFT JOIN statements AS statement
    ON statement.symbol = candidate.symbol
  LEFT JOIN quarter_support AS support
    ON support.symbol = candidate.symbol
  LEFT JOIN public.data_fetch_freshness_v2 AS freshness
    ON freshness.symbol = candidate.symbol
   AND freshness.data_type = 'financial-statements'
  LEFT JOIN public.data_type_registry_v2 AS registry
    ON registry.data_type = 'financial-statements'
  GROUP BY
    candidate.rank,
    candidate.symbol,
    candidate.exchange,
    candidate.sector,
    support.latest_four_rows,
    support.latest_four_fcf_rows,
    support.earliest_of_latest_four,
    support.latest_of_latest_four,
    support.trailing_four_quarter_fcf,
    freshness.last_success_at,
    freshness.result_kind,
    registry.default_ttl_minutes
),
semantic_duplicates AS MATERIALIZED (
  SELECT pg_catalog.count(*)::integer AS duplicate_groups
  FROM (
    SELECT
      statement.symbol,
      statement.date,
      statement.normalized_period
    FROM statements AS statement
    GROUP BY
      statement.symbol,
      statement.date,
      statement.normalized_period
    HAVING pg_catalog.count(*) > 1
  ) AS duplicate
),
period_distribution AS MATERIALIZED (
  SELECT
    pg_catalog.upper(pg_catalog.btrim(statement.period)) AS period,
    pg_catalog.count(*)::integer AS rows,
    pg_catalog.count(DISTINCT statement.symbol)::integer AS symbols
  FROM public.financial_statements AS statement
  GROUP BY pg_catalog.upper(pg_catalog.btrim(statement.period))
),
summary AS MATERIALIZED (
  SELECT
    pg_catalog.count(*)::integer AS candidates,
    pg_catalog.count(*) FILTER (
      WHERE coverage.statement_rows > 0
    )::integer AS candidates_with_statements,
    pg_catalog.count(*) FILTER (
      WHERE coverage.quarterly_rows > 0
    )::integer AS candidates_with_any_quarter,
    pg_catalog.count(*) FILTER (
      WHERE coverage.latest_four_rows = 4
        AND coverage.latest_four_fcf_rows = 4
        AND coverage.latest_of_latest_four
          - coverage.earliest_of_latest_four BETWEEN 240 AND 400
    )::integer AS candidates_with_usable_t4q_fcf,
    pg_catalog.count(*) FILTER (
      WHERE coverage.reported_currency_count > 1
    )::integer AS candidates_with_multiple_currencies,
    pg_catalog.count(*) FILTER (
      WHERE coverage.fetch_is_stale IS TRUE
    )::integer AS candidates_with_stale_fetch,
    pg_catalog.count(*) FILTER (
      WHERE coverage.last_success_at IS NULL
    )::integer AS candidates_missing_freshness,
    pg_catalog.count(*) FILTER (
      WHERE coverage.result_kind = 'empty'
    )::integer AS candidates_with_empty_fetch
  FROM coverage
)
SELECT pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.clock_timestamp(),
  'scope', pg_catalog.jsonb_build_object(
    'candidate_limit', 200,
    'candidate_function',
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])',
    'read_only', true,
    'fmp_calls', 0
  ),
  'summary', pg_catalog.to_jsonb(summary),
  'stored_period_distribution', coalesce((
    SELECT pg_catalog.jsonb_agg(
      pg_catalog.to_jsonb(distribution)
      ORDER BY distribution.period
    )
    FROM period_distribution AS distribution
  ), '[]'::jsonb),
  'semantic_duplicate_groups', duplicates.duplicate_groups,
  'failure_modes', pg_catalog.jsonb_build_object(
    'no_quarterly_rows', summary.candidates
      - summary.candidates_with_any_quarter,
    'insufficient_quarters_for_t4q', summary.candidates
      - summary.candidates_with_usable_t4q_fcf,
    'multiple_reported_currencies',
      summary.candidates_with_multiple_currencies,
    'stale_fetches', summary.candidates_with_stale_fetch,
    'missing_freshness_records', summary.candidates_missing_freshness,
    'valid_empty_fetches', summary.candidates_with_empty_fetch
  ),
  'diagnosis', pg_catalog.jsonb_build_object(
    'quarterly_value_comparison_available',
      summary.candidates_with_usable_t4q_fcf > 0,
    'fetcher_explicitly_requests_quarterly', false,
    'parser_and_table_accept_quarterly_periods', true,
    'provider_quarterly_availability_tested', false,
    'next_test',
      'Bounded provider sample only if stored coverage confirms the gap.'
  ),
  'coverage_by_exchange', coalesce((
    SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(exchange_rollup))
    FROM (
      SELECT
        coverage.exchange,
        pg_catalog.count(*)::integer AS candidates,
        pg_catalog.count(*) FILTER (
          WHERE coverage.quarterly_rows > 0
        )::integer AS with_any_quarter,
        pg_catalog.count(*) FILTER (
          WHERE coverage.latest_four_rows = 4
            AND coverage.latest_four_fcf_rows = 4
        )::integer AS with_four_fcf_quarters
      FROM coverage
      GROUP BY coverage.exchange
      ORDER BY coverage.exchange
    ) AS exchange_rollup
  ), '[]'::jsonb),
  'exceptions', coalesce((
    SELECT pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'rank', coverage.rank,
        'symbol', coverage.symbol,
        'statement_rows', coverage.statement_rows,
        'quarterly_rows', coverage.quarterly_rows,
        'other_period_rows', coverage.other_period_rows,
        'reported_currency_count', coverage.reported_currency_count,
        'last_success_at', coverage.last_success_at,
        'fetch_is_stale', coverage.fetch_is_stale
      )
      ORDER BY coverage.rank
    ) FILTER (
      WHERE coverage.quarterly_rows > 0
         OR coverage.other_period_rows > 0
         OR coverage.reported_currency_count > 1
         OR coverage.fetch_is_stale IS TRUE
         OR coverage.last_success_at IS NULL
    )
    FROM coverage
  ), '[]'::jsonb)
)
FROM summary
CROSS JOIN semantic_duplicates AS duplicates;
