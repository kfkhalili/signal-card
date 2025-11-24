-- Register analyst-price-targets data type in data_type_registry_v2
-- Price target consensus data from FMP API
-- Used for Symbol Analysis Page (Contrarian Indicators Card)

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
  'analyst-price-targets',
  'analyst_price_targets',
  'fetched_at',
  'is_data_stale_v2',
  1440, -- 24 hours TTL (price targets update as analysts revise)
  'queue-processor-v2',
  'on-demand',
  'symbol',
  1000 -- 1 KB estimate (small JSON response)
) ON CONFLICT (data_type) DO UPDATE SET
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

