-- Phase 5: Migration (Card-by-Card Approach)
-- Add dividend-history data type to data_type_registry_v2
-- CRITICAL: Dividend history is updated quarterly, so use 90-day TTL (129600 minutes)

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
  'dividend-history',
  'dividend_history',
  'fetched_at',
  'is_data_stale_v2',
  129600, -- 90 days (dividend history updates quarterly)
  'queue-processor-v2',
  'on-demand',
  'symbol',
  100000 -- 100 KB estimate (multiple dividend records per symbol)
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
  WHERE data_type = 'dividend-history';

  IF reg_count = 0 THEN
    RAISE EXCEPTION 'Failed to add dividend-history to data_type_registry_v2';
  ELSE
    RAISE NOTICE 'Successfully added/updated dividend-history in data_type_registry_v2';
  END IF;
END $$;

