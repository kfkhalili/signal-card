-- Add logging to upsert_active_subscription_v2 to track who is calling it
-- This will help debug why last_seen_at is being updated after browser is killed

CREATE OR REPLACE FUNCTION public.upsert_active_subscription_v2(
  p_user_id uuid,
  p_symbol text,
  p_data_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- SECURITY DEFINER functions run with the privileges of the function owner (postgres)
  -- This should bypass RLS automatically

  -- CRITICAL: Log who is calling this function
  -- This will help us debug what's updating last_seen_at
  -- Check if this is being called from a client (authenticated user) or service role
  RAISE NOTICE '[upsert_active_subscription_v2] CALLED: user_id=%, symbol=%, data_type=%, session_user=%, current_user=%',
    p_user_id, p_symbol, p_data_type, session_user, current_user;

  -- CRITICAL: Update last_seen_at on both INSERT and UPDATE (conflict)
  -- INSERT: New subscription - set both subscribed_at and last_seen_at
  -- UPDATE: Heartbeat - update last_seen_at to indicate user is still actively viewing
  INSERT INTO public.active_subscriptions_v2 (user_id, symbol, data_type, subscribed_at, last_seen_at)
  VALUES (p_user_id, p_symbol, p_data_type, NOW(), NOW())
  ON CONFLICT (user_id, symbol, data_type)
  DO UPDATE SET
    last_seen_at = NOW(); -- Heartbeat: update last_seen_at to indicate active viewing

  -- If we get here, the insert/update succeeded
  -- No need to return anything (void function)
END;
$$;

COMMENT ON FUNCTION public.upsert_active_subscription_v2 IS 'Upserts active subscription. Sets last_seen_at on INSERT (new subscription) and updates it on conflict (heartbeat). Client sends periodic heartbeats to indicate active viewing. Background cleanup removes subscriptions with last_seen_at > 5 minutes. NOW INCLUDES LOGGING to track who is calling this function.';

