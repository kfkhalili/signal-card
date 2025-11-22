-- Add explicit RLS policies to partition tables
-- Supabase Advisor doesn't detect inherited policies from parent table
-- These policies match the parent table policies to maintain same security model

-- Policies for api_call_queue_v2_pending
CREATE POLICY "Users can read queue for monitoring"
  ON public.api_call_queue_v2_pending
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only service role can modify queue"
  ON public.api_call_queue_v2_pending
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for api_call_queue_v2_processing
CREATE POLICY "Users can read queue for monitoring"
  ON public.api_call_queue_v2_processing
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only service role can modify queue"
  ON public.api_call_queue_v2_processing
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for api_call_queue_v2_completed
CREATE POLICY "Users can read queue for monitoring"
  ON public.api_call_queue_v2_completed
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only service role can modify queue"
  ON public.api_call_queue_v2_completed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for api_call_queue_v2_failed
CREATE POLICY "Users can read queue for monitoring"
  ON public.api_call_queue_v2_failed
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only service role can modify queue"
  ON public.api_call_queue_v2_failed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Users can read queue for monitoring" ON public.api_call_queue_v2_pending IS 'Allows authenticated and anon users to read queue for monitoring. Matches parent table policy.';
COMMENT ON POLICY "Only service role can modify queue" ON public.api_call_queue_v2_pending IS 'Only service role can modify queue. Matches parent table policy.';
COMMENT ON POLICY "Users can read queue for monitoring" ON public.api_call_queue_v2_processing IS 'Allows authenticated and anon users to read queue for monitoring. Matches parent table policy.';
COMMENT ON POLICY "Only service role can modify queue" ON public.api_call_queue_v2_processing IS 'Only service role can modify queue. Matches parent table policy.';
COMMENT ON POLICY "Users can read queue for monitoring" ON public.api_call_queue_v2_completed IS 'Allows authenticated and anon users to read queue for monitoring. Matches parent table policy.';
COMMENT ON POLICY "Only service role can modify queue" ON public.api_call_queue_v2_completed IS 'Only service role can modify queue. Matches parent table policy.';
COMMENT ON POLICY "Users can read queue for monitoring" ON public.api_call_queue_v2_failed IS 'Allows authenticated and anon users to read queue for monitoring. Matches parent table policy.';
COMMENT ON POLICY "Only service role can modify queue" ON public.api_call_queue_v2_failed IS 'Only service role can modify queue. Matches parent table policy.';

