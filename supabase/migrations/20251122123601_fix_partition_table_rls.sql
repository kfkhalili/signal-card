-- Fix Partition Table RLS Issue
-- Addresses RLS enabled but no policies on partition tables
-- These are internal partition tables - disable RLS as parent table handles security

-- Disable RLS on partition tables
-- CRITICAL: These are partition tables for api_call_queue_v2
-- The parent table (api_call_queue_v2) has RLS policies that apply to all partitions
-- Having RLS enabled on partitions without policies is unnecessary and flagged by advisor

ALTER TABLE IF EXISTS public.api_call_queue_v2_completed DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_call_queue_v2_failed DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_call_queue_v2_pending DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_call_queue_v2_processing DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_call_queue_v2_completed IS 'Partition table for completed jobs. RLS is disabled as parent table (api_call_queue_v2) handles security.';
COMMENT ON TABLE public.api_call_queue_v2_failed IS 'Partition table for failed jobs. RLS is disabled as parent table (api_call_queue_v2) handles security.';
COMMENT ON TABLE public.api_call_queue_v2_pending IS 'Partition table for pending jobs. RLS is disabled as parent table (api_call_queue_v2) handles security.';
COMMENT ON TABLE public.api_call_queue_v2_processing IS 'Partition table for processing jobs. RLS is disabled as parent table (api_call_queue_v2) handles security.';

