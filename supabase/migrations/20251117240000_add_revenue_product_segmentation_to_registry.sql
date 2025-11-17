-- Phase 5: Migration (Card-by-Card Approach)
-- Add revenue-product-segmentation data type to data_type_registry_v2
-- CRITICAL: Revenue segmentation is updated yearly, so use 365-day TTL (525600 minutes)

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
  'revenue-product-segmentation',
  'revenue_product_segmentation',
  'fetched_at',
  'is_data_stale_v2',
  525600, -- 365 days (revenue segmentation updates yearly)
  'queue-processor-v2',
  'on-demand',
  'symbol',
  150000 -- 150 KB estimate (JSONB data with multiple segments)
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
  WHERE data_type = 'revenue-product-segmentation';

  IF reg_count = 0 THEN
    RAISE EXCEPTION 'Failed to add revenue-product-segmentation to data_type_registry_v2';
  ELSE
    RAISE NOTICE 'Successfully added/updated revenue-product-segmentation in data_type_registry_v2';
  END IF;
END $$;

