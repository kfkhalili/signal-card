-- Phase 5: Migration (One Type)
-- Populate data_type_registry_v2 with 'profile' data type
-- This is the first data type to be migrated to the new system

-- CRITICAL: This migration adds the 'profile' data type to the registry
-- After this migration, we can enable the feature flag and test the end-to-end flow

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

COMMENT ON TABLE public.data_type_registry_v2 IS 'Profile data type added for Phase 5 migration. Ready for testing.';

