-- Phase 5: Migration (Card-by-Card Approach)
-- Add exchange-variants data type to data_type_registry_v2
-- CRITICAL: Exchange variants are updated daily, so use 24-hour TTL (1440 minutes)
-- NOTE: This table uses base_symbol instead of symbol, so symbol_column is set to base_symbol

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
  'exchange-variants',
  'exchange_variants',
  'fetched_at',
  'is_data_stale_v2',
  1440, -- 24 hours (exchange variants update daily)
  'queue-processor-v2',
  'on-demand',
  'base_symbol', -- CRITICAL: This table uses base_symbol, not symbol
  80000 -- 80 KB estimate (multiple variant records per symbol)
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
  WHERE data_type = 'exchange-variants';

  IF reg_count = 0 THEN
    RAISE EXCEPTION 'Failed to add exchange-variants to data_type_registry_v2';
  ELSE
    RAISE NOTICE 'Successfully added/updated exchange-variants in data_type_registry_v2';
  END IF;
END $$;

