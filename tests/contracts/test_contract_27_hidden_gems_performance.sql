-- Contract #27: Hidden Gems has a score-neutral covering access path for its
-- six-month insider aggregation.

BEGIN;
SELECT plan(3);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS index_relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = index_relation.relnamespace
    JOIN pg_catalog.pg_index AS index_metadata
      ON index_metadata.indexrelid = index_relation.oid
    WHERE namespace.nspname = 'public'
      AND index_relation.relname =
        'idx_insider_transactions_hidden_gems_covering'
      AND index_metadata.indisvalid
      AND index_metadata.indisready
  ),
  'Contract #27: the Hidden Gems insider covering index is valid and ready'
);

SELECT ok(
  (
    SELECT pg_catalog.pg_get_indexdef(index_relation.oid)
    FROM pg_catalog.pg_class AS index_relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = index_relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND index_relation.relname =
        'idx_insider_transactions_hidden_gems_covering'
  ) ~* 'transaction_date DESC.*INCLUDE.*symbol.*reporting_cik.*acquisition_or_disposition.*transaction_type.*securities_transacted.*price',
  'Contract #27: the index covers every column read by the aggregation'
);

SELECT ok(
  (
    SELECT pg_catalog.pg_get_expr(
      index_metadata.indpred,
      index_metadata.indrelid
    )
    FROM pg_catalog.pg_class AS index_relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = index_relation.relnamespace
    JOIN pg_catalog.pg_index AS index_metadata
      ON index_metadata.indexrelid = index_relation.oid
    WHERE namespace.nspname = 'public'
      AND index_relation.relname =
        'idx_insider_transactions_hidden_gems_covering'
  ) ~* 'price\s*>\s*.*0',
  'Contract #27: the index excludes rows that the aggregation cannot use'
);

SELECT * FROM finish();
ROLLBACK;
