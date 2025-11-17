-- Phase 5: Migration (One Type)
-- Populate data_type_registry_v2 with 'quote' data type
-- This is the second data type to be migrated to the new system
-- CRITICAL: 1-minute TTL for real-time price data

INSERT INTO public.data_type_registry_v2 (
  data_type,
  table_name,
  timestamp_column,
  staleness_function,
  default_ttl_minutes,
  edge_function_name,
  refresh_strategy,
  refresh_schedule,
  priority,
  estimated_data_size_bytes,
  symbol_column,
  source_timestamp_column
) VALUES (
  'quote',
  'live_quote_indicators',
  'fetched_at', -- live_quote_indicators table uses fetched_at
  'is_quote_stale_v2', -- Uses the quote-specific staleness function
  1, -- 1 minute TTL (quotes are real-time data)
  'queue-processor-v2', -- Monofunction processor handles all types
  'on-demand', -- Quotes are refreshed on-demand when users view them
  NULL, -- No scheduled refresh (on-demand only)
  0, -- Default priority (will be overridden by viewer count)
  2000, -- Estimated 2KB per quote response (will auto-correct over time)
  'symbol', -- Standard symbol column
  'api_timestamp' -- FMP API provides timestamp in response
) ON CONFLICT (data_type) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  timestamp_column = EXCLUDED.timestamp_column,
  staleness_function = EXCLUDED.staleness_function,
  default_ttl_minutes = EXCLUDED.default_ttl_minutes,
  edge_function_name = EXCLUDED.edge_function_name,
  refresh_strategy = EXCLUDED.refresh_strategy,
  refresh_schedule = EXCLUDED.refresh_schedule,
  priority = EXCLUDED.priority,
  estimated_data_size_bytes = EXCLUDED.estimated_data_size_bytes,
  symbol_column = EXCLUDED.symbol_column,
  source_timestamp_column = EXCLUDED.source_timestamp_column,
  updated_at = NOW();

COMMENT ON TABLE public.data_type_registry_v2 IS 'Quote data type added for Phase 5 migration. 1-minute TTL for real-time testing.';

