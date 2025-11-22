-- Fix Function Search Path Security Issue (ALTER approach)
-- Uses ALTER FUNCTION to set search_path instead of dropping/recreating
-- This is safer and avoids trigger dependency issues

-- ============================================================================
-- Staleness Functions
-- ============================================================================

ALTER FUNCTION public.is_data_stale_v2(TIMESTAMPTZ, INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.is_profile_stale_v2(TIMESTAMPTZ, INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.is_quote_stale_v2(TIMESTAMPTZ, INTEGER) SET search_path = public, extensions;

-- ============================================================================
-- Queue Management Functions
-- ============================================================================

ALTER FUNCTION public.get_queue_batch_v2(INTEGER, INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.complete_queue_job_v2(UUID, BIGINT, INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.fail_queue_job_v2(UUID, TEXT) SET search_path = public, extensions;
ALTER FUNCTION public.recover_stuck_jobs_v2() SET search_path = public, extensions;

-- ============================================================================
-- Processor Functions
-- ============================================================================

ALTER FUNCTION public.invoke_processor_if_healthy_v2() SET search_path = public, extensions;
ALTER FUNCTION public.invoke_processor_loop_v2(p_max_iterations INTEGER, p_iteration_delay_seconds INTEGER) SET search_path = public, extensions;

-- ============================================================================
-- Quota Functions
-- ============================================================================

ALTER FUNCTION public.is_quota_exceeded_v2(NUMERIC) SET search_path = public, extensions;
ALTER FUNCTION public.increment_api_calls(INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.reserve_api_calls(p_api_calls_to_reserve INTEGER, p_max_api_calls_per_minute INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.release_api_calls_reservation(INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.should_stop_processing_api_calls(p_api_calls_to_reserve INTEGER, p_max_api_calls_per_minute INTEGER, p_safety_buffer INTEGER) SET search_path = public, extensions;

-- ============================================================================
-- Staleness Checker Functions
-- ============================================================================

ALTER FUNCTION public.check_and_queue_stale_batch_v2(TEXT, TEXT[], INTEGER) SET search_path = public, extensions;
ALTER FUNCTION public.check_and_queue_stale_data_from_presence_v2() SET search_path = public, extensions;
ALTER FUNCTION public.queue_refresh_if_not_exists_v2(TEXT, TEXT, INTEGER, BIGINT) SET search_path = public, extensions;
ALTER FUNCTION public.queue_scheduled_refreshes_v2() SET search_path = public, extensions;

-- ============================================================================
-- Realtime Functions
-- ============================================================================

ALTER FUNCTION public.on_realtime_subscription_insert() SET search_path = public, extensions;
ALTER FUNCTION public.get_active_subscriptions_from_realtime() SET search_path = public, extensions;

-- ============================================================================
-- Utility Functions
-- ============================================================================

ALTER FUNCTION public.is_valid_identifier(TEXT) SET search_path = public, extensions;
ALTER FUNCTION public.is_exchange_open_for_symbol_v2(p_symbol TEXT, p_data_type TEXT) SET search_path = public, extensions;
ALTER FUNCTION public.maintain_queue_partitions_v2() SET search_path = public, extensions;

-- ============================================================================
-- Profile Functions
-- ============================================================================

ALTER FUNCTION public.upsert_profile(jsonb) SET search_path = public, extensions;

-- ============================================================================
-- Feature Flag Functions
-- ============================================================================

ALTER FUNCTION public.is_feature_enabled(TEXT) SET search_path = public, extensions;

-- ============================================================================
-- Trigger Functions
-- ============================================================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions;
ALTER FUNCTION public.set_ui_job_max_retries() SET search_path = public, extensions;

-- ============================================================================
-- Monitoring Functions
-- ============================================================================

ALTER FUNCTION public.check_queue_success_rate_alert() SET search_path = public, extensions;
ALTER FUNCTION public.check_quota_usage_alert() SET search_path = public, extensions;
ALTER FUNCTION public.check_stuck_jobs_alert() SET search_path = public, extensions;
ALTER FUNCTION public.check_cron_job_health(TEXT[]) SET search_path = public, extensions;

-- ============================================================================
-- Baseline Functions
-- ============================================================================

ALTER FUNCTION public.record_baseline_metric(p_metric_name text, p_metric_value jsonb, p_notes text) SET search_path = public, extensions;
ALTER FUNCTION public.capture_system_baseline() SET search_path = public, extensions;

-- ============================================================================
-- Edge Function Invoker
-- ============================================================================

ALTER FUNCTION invoke_edge_function_v2(p_function_name TEXT, p_payload JSONB, p_timeout_milliseconds INTEGER) SET search_path = public, extensions;

-- ============================================================================
-- Leaderboard Function
-- ============================================================================

ALTER FUNCTION public.get_weighted_leaderboard(weights jsonb) SET search_path = public, extensions;

