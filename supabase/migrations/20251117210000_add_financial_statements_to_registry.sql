-- Phase 5: Migration (One Type at a Time)
-- Add financial-statements data type to data_type_registry_v2
-- CRITICAL: Financial statements are updated monthly/quarterly, so use 30-day TTL (43200 minutes)

-- Note: We use the generic is_data_stale_v2 function since financial_statements uses fetched_at
-- (same pattern as quote, but quote has its own function for historical reasons)

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
  'financial-statements',
  'financial_statements',
  'fetched_at',
  'is_data_stale_v2',
  43200, -- 30 days (financial statements are updated monthly/quarterly)
  'fetch-fmp-financial-statements',
  'on-demand',
  'symbol',
  500000 -- 500 KB estimate (financial statements are large JSON payloads)
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

COMMENT ON TABLE public.data_type_registry_v2 IS 'Single source of truth for all data types. Adding new types requires zero code changes.';

-- Verify the entry was created/updated
DO $$
DECLARE
  reg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reg_count
  FROM public.data_type_registry_v2
  WHERE data_type = 'financial-statements';

  IF reg_count = 0 THEN
    RAISE EXCEPTION 'Failed to add financial-statements to data_type_registry_v2';
  ELSE
    RAISE NOTICE 'Successfully added/updated financial-statements in data_type_registry_v2';
  END IF;
END $$;

