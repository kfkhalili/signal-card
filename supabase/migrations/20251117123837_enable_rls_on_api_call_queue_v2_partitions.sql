-- Enable RLS on all api_call_queue_v2 partitions
-- CRITICAL: Partitions must have RLS explicitly enabled even though they inherit policies from parent
-- This ensures Supabase shows them as "restricted" instead of "unrestricted"

-- Ensure parent table has RLS enabled (should already be enabled, but being explicit)
ALTER TABLE public.api_call_queue_v2 ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all partitions
ALTER TABLE public.api_call_queue_v2_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_queue_v2_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_queue_v2_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_queue_v2_failed ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Policies on the parent table automatically apply to partitions
-- No need to create duplicate policies on partitions
-- The existing policies on api_call_queue_v2 will be inherited:
--   - "Users can read queue for monitoring" (SELECT for authenticated/anon)
--   - "Only service role can modify queue" (ALL for service_role)

COMMENT ON TABLE public.api_call_queue_v2_pending IS 'Partition of api_call_queue_v2 for pending jobs. RLS enabled - inherits policies from parent.';
COMMENT ON TABLE public.api_call_queue_v2_processing IS 'Partition of api_call_queue_v2 for processing jobs. RLS enabled - inherits policies from parent.';
COMMENT ON TABLE public.api_call_queue_v2_completed IS 'Partition of api_call_queue_v2 for completed jobs. RLS enabled - inherits policies from parent.';
COMMENT ON TABLE public.api_call_queue_v2_failed IS 'Partition of api_call_queue_v2 for failed jobs. RLS enabled - inherits policies from parent.';

