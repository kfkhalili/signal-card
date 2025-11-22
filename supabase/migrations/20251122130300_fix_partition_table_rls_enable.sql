-- Fix Partition Table RLS Issue
-- Re-enable RLS on partition tables (they inherit policies from parent)
-- Supabase Advisor requires RLS to be enabled on all public tables
-- Partitions inherit policies from parent table (api_call_queue_v2)

-- Re-enable RLS on partition tables
-- CRITICAL: These are partition tables for api_call_queue_v2
-- The parent table (api_call_queue_v2) has RLS policies that apply to all partitions
-- Partitions must have RLS enabled to satisfy Supabase Advisor requirements
-- Policies are inherited from the parent table automatically

ALTER TABLE IF EXISTS public.api_call_queue_v2_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_call_queue_v2_failed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_call_queue_v2_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_call_queue_v2_processing ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_call_queue_v2_completed IS 'Partition table for completed jobs. RLS enabled - inherits policies from parent table (api_call_queue_v2).';
COMMENT ON TABLE public.api_call_queue_v2_failed IS 'Partition table for failed jobs. RLS enabled - inherits policies from parent table (api_call_queue_v2).';
COMMENT ON TABLE public.api_call_queue_v2_pending IS 'Partition table for pending jobs. RLS enabled - inherits policies from parent table (api_call_queue_v2).';
COMMENT ON TABLE public.api_call_queue_v2_processing IS 'Partition table for processing jobs. RLS enabled - inherits policies from parent table (api_call_queue_v2).';

