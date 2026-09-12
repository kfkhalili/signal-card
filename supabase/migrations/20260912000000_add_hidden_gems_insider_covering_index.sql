-- Avoid random heap reads when Hidden Gems aggregates six months of insider
-- purchases and sales. This is a score-neutral access-path change.
--
-- CONCURRENTLY keeps the frequently refreshed transaction table writable.
-- This migration must not be wrapped in an explicit transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_insider_transactions_hidden_gems_covering
  ON public.insider_transactions (transaction_date DESC)
  INCLUDE (
    symbol,
    reporting_cik,
    acquisition_or_disposition,
    transaction_type,
    securities_transacted,
    price
  )
  WHERE price > 0;

COMMENT ON INDEX public.idx_insider_transactions_hidden_gems_covering IS
  'Covering access path for the six-month insider aggregation used by the Hidden Gems shadow screen.';
