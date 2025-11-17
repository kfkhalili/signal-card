-- Allow authenticated users to delete their own subscriptions
-- CRITICAL: Users need to be able to delete their own subscriptions when cards are removed
-- The upsert_active_subscription_v2 function is SECURITY DEFINER (bypasses RLS for INSERT/UPDATE)
-- But DELETE is called directly from the client, so it needs an RLS policy

CREATE POLICY "Users can delete their own subscriptions"
  ON public.active_subscriptions_v2
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete their own subscriptions" ON public.active_subscriptions_v2 IS 'Allows authenticated users to delete their own subscriptions when cards are removed. This is needed because DELETE is called directly from the client (not through a SECURITY DEFINER function).';

