-- Set search_path for remaining functions that don't have original CREATE migrations
-- These functions were created directly in the database or in migrations that were deleted
-- TODO: Create proper migrations for these functions if they don't exist

-- ============================================================================
-- Exchange Functions
-- ============================================================================

ALTER FUNCTION public.is_exchange_open_for_symbol_v2(p_symbol TEXT, p_data_type TEXT) SET search_path = public, extensions;

-- ============================================================================
-- Baseline Functions
-- ============================================================================

ALTER FUNCTION public.record_baseline_metric(p_metric_name text, p_metric_value jsonb, p_notes text) SET search_path = public, extensions;
ALTER FUNCTION public.capture_system_baseline() SET search_path = public, extensions;

