-- Phase 5: Configuration
-- Configure processor invoker settings
-- CRITICAL: This migration is now a no-op - invoke_edge_function_v2 uses vault.decrypted_secrets
-- The function automatically reads from vault.decrypted_secrets:
--   - 'project_url' for the Supabase URL
--   - 'supabase_service_role_key' for authentication
--
-- These secrets should already be configured in your Supabase project.
-- To verify or add them:
--   1. Go to Supabase Dashboard → Edge Functions → Secrets
--   2. Ensure 'project_url' and 'supabase_service_role_key' are set
--
-- This matches the pattern used in existing cron jobs (see 20251116161200_schedule_cron_jobs.sql)

-- No-op migration - vault secrets are managed via Supabase Dashboard

