-- Phase 5: Migration
-- Populate data_type_registry_v2 with all data types
-- CRITICAL: This is an operational migration - populates initial data into the registry
-- All data types are inserted in their final state with proper TTLs and configurations

-- Profile data type
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
  'profile',
  'profiles',
  'modified_at', -- profiles table uses modified_at (updated by moddatetime trigger)
  'is_profile_stale_v2', -- Uses the profile-specific staleness function
  1440, -- 24 hours TTL (profiles don't change frequently)
  'queue-processor-v2', -- Monofunction processor handles all types
  'on-demand', -- Profiles are refreshed on-demand when users view them
  NULL, -- No scheduled refresh (on-demand only)
  0, -- Default priority (will be overridden by viewer count)
  5000, -- Estimated 5KB per profile response (will auto-correct over time)
  'symbol', -- Standard symbol column
  NULL -- No source timestamp column in FMP profile API
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

-- Quote data type
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

-- Financial-statements data type
-- CRITICAL: Financial statements are updated monthly/quarterly, so use 30-day TTL (43200 minutes)
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
  'queue-processor-v2',
  'on-demand',
  'symbol',
  500000 -- 500 KB estimate (financial statements are large JSON payloads)
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

-- Ratios-ttm data type
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

-- Dividend-history data type
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

-- Revenue-product-segmentation data type
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

-- Grades-historical data type
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

-- Exchange-variants data type
-- CRITICAL: Exchange variants are updated daily, so use 24-hour TTL (1440 minutes)
-- NOTE: This table uses symbol (renamed from base_symbol) for consistency with other tables
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
  'symbol', -- CRITICAL: Uses symbol (renamed from base_symbol) for consistency
  80000 -- 80 KB estimate (multiple variant records per symbol)
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

