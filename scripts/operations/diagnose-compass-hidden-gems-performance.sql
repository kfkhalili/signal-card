-- Targeted production diagnosis for Hidden Gems latency.
-- SQL Editor compatible. Uses temporary storage only, rolls back, makes no
-- external requests, and does not invoke the full Hidden Gems function.

BEGIN;

CREATE TEMPORARY TABLE hidden_gems_performance_diagnosis (
  check_name text PRIMARY KEY,
  result jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO hidden_gems_performance_diagnosis (check_name, result)
SELECT
  'relation_sizes',
  coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'relation', stats.relname,
        'estimated_live_rows', stats.n_live_tup,
        'total_bytes', pg_catalog.pg_total_relation_size(stats.relid),
        'table_bytes', pg_catalog.pg_relation_size(stats.relid),
        'index_bytes', pg_catalog.pg_indexes_size(stats.relid)
      )
      ORDER BY stats.relname
    ),
    '[]'::jsonb
  )
FROM pg_catalog.pg_stat_user_tables AS stats
WHERE stats.schemaname = 'public'
  AND stats.relname IN (
    'compass_pillar_scores',
    'data_quality_issues',
    'grades_historical',
    'insider_transactions',
    'listed_symbols',
    'live_quote_indicators',
    'profiles',
    'ratios_ttm'
  );

DO $$
DECLARE
  current_plan jsonb;
  relevant_only_plan jsonb;
BEGIN
  EXECUTE $explain$
    EXPLAIN (
      ANALYZE,
      BUFFERS,
      TIMING OFF,
      SUMMARY ON,
      FORMAT JSON
    )
    SELECT
      transaction.symbol,
      pg_catalog.sum(
        CASE
          WHEN transaction.acquisition_or_disposition = 'A'
            AND (
              pg_catalog.upper(transaction.transaction_type) = 'P'
              OR pg_catalog.upper(transaction.transaction_type) LIKE 'P-%'
              OR pg_catalog.upper(transaction.transaction_type)
                LIKE '%PURCHASE%'
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
            OR pg_catalog.upper(transaction.transaction_type)
              LIKE '%PURCHASE%'
          )
      )::integer AS insider_buyers
    FROM public.insider_transactions AS transaction
    WHERE transaction.transaction_date
        >= CURRENT_DATE - INTERVAL '6 months'
      AND transaction.price > 0
    GROUP BY transaction.symbol
  $explain$
  INTO current_plan;

  EXECUTE $explain$
    EXPLAIN (
      ANALYZE,
      BUFFERS,
      TIMING OFF,
      SUMMARY ON,
      FORMAT JSON
    )
    SELECT
      transaction.symbol,
      pg_catalog.sum(
        CASE
          WHEN transaction.acquisition_or_disposition = 'A'
            THEN transaction.securities_transacted::numeric
              * transaction.price::numeric
          ELSE -(transaction.securities_transacted::numeric
            * transaction.price::numeric)
        END
      ) AS net_insider_value,
      pg_catalog.count(DISTINCT transaction.reporting_cik) FILTER (
        WHERE transaction.acquisition_or_disposition = 'A'
      )::integer AS insider_buyers
    FROM public.insider_transactions AS transaction
    WHERE transaction.transaction_date
        >= CURRENT_DATE - INTERVAL '6 months'
      AND transaction.price > 0
      AND (
        (
          transaction.acquisition_or_disposition = 'A'
          AND (
            pg_catalog.upper(transaction.transaction_type) = 'P'
            OR pg_catalog.upper(transaction.transaction_type) LIKE 'P-%'
            OR pg_catalog.upper(transaction.transaction_type)
              LIKE '%PURCHASE%'
          )
        )
        OR (
          transaction.acquisition_or_disposition = 'D'
          AND (
            pg_catalog.upper(transaction.transaction_type) = 'S'
            OR pg_catalog.upper(transaction.transaction_type) LIKE 'S-%'
            OR pg_catalog.upper(transaction.transaction_type) LIKE '%SALE%'
          )
        )
      )
    GROUP BY transaction.symbol
  $explain$
  INTO relevant_only_plan;

  INSERT INTO hidden_gems_performance_diagnosis (check_name, result)
  VALUES
    ('current_insider_aggregation_plan', current_plan),
    ('relevant_only_insider_aggregation_plan', relevant_only_plan);
END;
$$;

SELECT pg_catalog.jsonb_object_agg(check_name, result ORDER BY check_name)
  AS hidden_gems_performance_diagnosis
FROM hidden_gems_performance_diagnosis;

ROLLBACK;
