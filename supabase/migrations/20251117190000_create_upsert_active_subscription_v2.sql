-- Phase 1: Foundation
-- Create upsert_active_subscription_v2 function to support heartbeat pattern
-- CRITICAL: Updates last_seen_at on conflict (heartbeat updates)
-- This allows client to send periodic heartbeats to indicate active viewing
-- Background cleanup removes subscriptions with last_seen_at > 5 minutes
-- CRITICAL: Creates high-priority jobs for both new subscriptions and heartbeats (UI-initiated)

CREATE OR REPLACE FUNCTION public.upsert_active_subscription_v2(
  p_user_id uuid,
  p_symbol text,
  p_data_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_new_subscription BOOLEAN;
  UI_PRIORITY INTEGER := 1000; -- Highest priority for UI-created jobs
BEGIN
  -- SECURITY DEFINER functions run with the privileges of the function owner (postgres)
  -- This should bypass RLS automatically

  -- CRITICAL: Log who is calling this function (for debugging)
  RAISE NOTICE '[upsert_active_subscription_v2] CALLED: user_id=%, symbol=%, data_type=%, session_user=%, current_user=%',
    p_user_id, p_symbol, p_data_type, session_user, current_user;

  -- Check if this is a new subscription (INSERT) or existing (UPDATE/heartbeat)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.active_subscriptions_v2
    WHERE user_id = p_user_id
      AND symbol = p_symbol
      AND data_type = p_data_type
  ) INTO is_new_subscription;

  -- CRITICAL: Update last_seen_at on both INSERT and UPDATE (conflict)
  -- INSERT: New subscription - set both subscribed_at and last_seen_at
  -- UPDATE: Heartbeat - update last_seen_at to indicate user is still actively viewing
  INSERT INTO public.active_subscriptions_v2 (user_id, symbol, data_type, subscribed_at, last_seen_at)
  VALUES (p_user_id, p_symbol, p_data_type, NOW(), NOW())
  ON CONFLICT (user_id, symbol, data_type)
  DO UPDATE SET
    last_seen_at = NOW(); -- Heartbeat: update last_seen_at to indicate active viewing

  -- CRITICAL: Always create high-priority jobs for UI-initiated actions (new subscriptions OR heartbeats)
  -- This ensures UI-created jobs are processed before background jobs
  -- Both new subscriptions and heartbeats indicate active user engagement, so both get highest priority
  RAISE NOTICE '[upsert_active_subscription_v2] % subscription for %/%. Creating high-priority jobs.',
    CASE WHEN is_new_subscription THEN 'New' ELSE 'Heartbeat' END, p_symbol, p_data_type;
  PERFORM check_and_queue_stale_batch_v2(
    p_symbol,
    ARRAY[p_data_type],
    UI_PRIORITY
  );

  -- If we get here, the insert/update succeeded
  -- No need to return anything (void function)
END;
$$;

COMMENT ON FUNCTION public.upsert_active_subscription_v2 IS 'Upserts active subscription. Sets last_seen_at on INSERT (new subscription) and updates it on conflict (heartbeat). Client sends periodic heartbeats to indicate active viewing. Background cleanup removes subscriptions with last_seen_at > 5 minutes. Creates high-priority jobs (1000) for both new subscriptions and heartbeats (all UI-initiated actions).';

