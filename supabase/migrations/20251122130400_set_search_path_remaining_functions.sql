-- Set search_path for remaining functions (temporary until consolidated into original migrations)
-- TODO: Consolidate these into their original CREATE FUNCTION migrations
-- This migration is a stopgap to ensure all functions have SET search_path
-- Functions already updated in original migrations:
--   - is_data_stale_v2, is_profile_stale_v2 (20251117072633)
--   - get_queue_batch_v2, complete_queue_job_v2, set_ui_job_max_retries, fail_queue_job_v2, reset_job_immediate_v2 (20251117073701)
--   - on_realtime_subscription_insert (20251122092100)

-- ============================================================================
-- Staleness Functions
-- ============================================================================

ALTER FUNCTION public.is_quote_stale_v2(TEXT) SET search_path = public, extensions;

-- ============================================================================
-- Queue Management Functions (remaining)
-- ============================================================================

-- (get_queue_batch_v2, complete_queue_job_v2, set_ui_job_max_retries, fail_queue_job_v2, reset_job_immediate_v2 already done)

-- ============================================================================
-- Recovery Functions
-- ============================================================================

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

