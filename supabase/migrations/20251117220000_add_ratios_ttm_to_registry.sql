-- Phase 5: Migration (One Type at a Time)
-- Add ratios-ttm data type to data_type_registry_v2
-- CRITICAL: Ratios TTM are updated daily, so use 24-hour TTL (1440 minutes)

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
  'ratios-ttm',
  'ratios_ttm',
  'fetched_at',
  'is_data_stale_v2',
  1440, -- 24 hours (ratios TTM are updated daily)
  'queue-processor-v2',
  'on-demand',
  'symbol',
  50000 -- 50 KB estimate (ratios data is moderate size)
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
  WHERE data_type = 'ratios-ttm';

  IF reg_count = 0 THEN
    RAISE EXCEPTION 'Failed to add ratios-ttm to data_type_registry_v2';
  ELSE
    RAISE NOTICE 'Successfully added/updated ratios-ttm in data_type_registry_v2';
  END IF;
END $$;

