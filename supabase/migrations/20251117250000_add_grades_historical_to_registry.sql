-- Phase 5: Migration (Card-by-Card Approach)
-- Add grades-historical data type to data_type_registry_v2
-- CRITICAL: Analyst grades are updated monthly, so use 30-day TTL (43200 minutes)

INSERT INTO public.data_type_registry_v2 (
  data_type,
  table_name,
  timestamp_column,
  staleness_function,
  default_ttl_minutes,
  edge_function_name,
  refresh_strategy,
  symbol_column,
  estimated_data_size_bytes
) VALUES (
  'grades-historical',
  'grades_historical',
  'fetched_at',
  'is_data_stale_v2',
  43200, -- 30 days (analyst grades update monthly)
  'queue-processor-v2',
  'on-demand',
  'symbol',
  30000 -- 30 KB estimate (simple integer fields)
)
ON CONFLICT (data_type) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  timestamp_column = EXCLUDED.timestamp_column,
  staleness_function = EXCLUDED.staleness_function,
  default_ttl_minutes = EXCLUDED.default_ttl_minutes,
  edge_function_name = EXCLUDED.edge_function_name,
  refresh_strategy = EXCLUDED.refresh_strategy,
  symbol_column = EXCLUDED.symbol_column,
  estimated_data_size_bytes = EXCLUDED.estimated_data_size_bytes,
  updated_at = NOW();

-- Verify the entry was created/updated
DO $$
DECLARE
  reg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reg_count
  FROM public.data_type_registry_v2
  WHERE data_type = 'grades-historical';

  IF reg_count = 0 THEN
    RAISE EXCEPTION 'Failed to add grades-historical to data_type_registry_v2';
  ELSE
    RAISE NOTICE 'Successfully added/updated grades-historical in data_type_registry_v2';
  END IF;
END $$;

