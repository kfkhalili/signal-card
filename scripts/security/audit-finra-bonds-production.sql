-- Read-only production audit for public.corporate_bonds.
--
-- This query returns aggregate metadata only. It does not return CUSIPs,
-- issuer names, prices, or any other individual bond record.
--
-- If public.corporate_bonds does not exist, the SQL editor will report that
-- directly and no changes will be made.

WITH table_stats AS (
  SELECT
    count(*) AS total_rows,
    max(fetched_at) AS latest_fetched_at,
    max(updated_at) AS latest_updated_at,
    max(last_trade_timestamp) AS latest_trade_timestamp,
    count(*) FILTER (WHERE last_trade_price IS NULL) AS rows_missing_price,
    count(*) FILTER (WHERE last_trade_yield IS NULL) AS rows_missing_yield,
    count(*) FILTER (WHERE last_trade_yield = 0) AS rows_with_zero_yield,
    count(*) FILTER (WHERE last_trade_volume IS NULL) AS rows_missing_volume,
    count(*) FILTER (WHERE last_trade_volume = 0) AS rows_with_zero_volume,
    count(*) FILTER (
      WHERE cusip IS NULL OR btrim(cusip) = ''
    ) AS rows_missing_cusip
  FROM public.corporate_bonds
),
table_access AS (
  SELECT
    has_table_privilege('anon', 'public.corporate_bonds', 'SELECT')
      AS anon_can_select,
    has_table_privilege('authenticated', 'public.corporate_bonds', 'SELECT')
      AS authenticated_can_select,
    EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'corporate_bonds'
    ) AS in_realtime_publication
)
SELECT jsonb_build_object(
  'table', jsonb_build_object(
    'total_rows', s.total_rows,
    'latest_fetched_at', s.latest_fetched_at,
    'latest_updated_at', s.latest_updated_at,
    'latest_trade_timestamp', s.latest_trade_timestamp,
    'rows_missing_cusip', s.rows_missing_cusip,
    'rows_missing_price', s.rows_missing_price,
    'rows_missing_yield', s.rows_missing_yield,
    'rows_with_zero_yield', s.rows_with_zero_yield,
    'rows_missing_volume', s.rows_missing_volume,
    'rows_with_zero_volume', s.rows_with_zero_volume
  ),
  'exposure', jsonb_build_object(
    'anon_can_select', a.anon_can_select,
    'authenticated_can_select', a.authenticated_can_select,
    'in_realtime_publication', a.in_realtime_publication
  )
) AS audit
FROM table_stats s
CROSS JOIN table_access a;
