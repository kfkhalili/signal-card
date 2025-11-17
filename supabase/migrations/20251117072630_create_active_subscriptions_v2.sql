-- Phase 1: Foundation
-- Create active_subscriptions_v2 table (analytics only - Presence is source of truth)
-- CRITICAL: This table is for analytics only. Realtime Presence is the true source of truth.
-- Analytics are batch operations (not hot-path writes) to prevent DoS vector.

CREATE TABLE IF NOT EXISTS public.active_subscriptions_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, symbol, data_type)
);

COMMENT ON TABLE public.active_subscriptions_v2 IS 'Analytics table for tracking active subscriptions. Realtime Presence is the true source of truth. This table is updated in batch operations, not on the hot-path.';
COMMENT ON COLUMN public.active_subscriptions_v2.user_id IS 'User ID from auth.users';
COMMENT ON COLUMN public.active_subscriptions_v2.symbol IS 'Stock/crypto symbol being watched';
COMMENT ON COLUMN public.active_subscriptions_v2.data_type IS 'Type of data being watched (e.g., quote, profile)';
COMMENT ON COLUMN public.active_subscriptions_v2.subscribed_at IS 'When the user first subscribed to this symbol/data_type';
COMMENT ON COLUMN public.active_subscriptions_v2.last_seen_at IS 'Last time this subscription was seen in Presence';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_active_subscriptions_v2_symbol_data_type
  ON public.active_subscriptions_v2(symbol, data_type);

CREATE INDEX IF NOT EXISTS idx_active_subscriptions_v2_user_id
  ON public.active_subscriptions_v2(user_id);

CREATE INDEX IF NOT EXISTS idx_active_subscriptions_v2_last_seen_at
  ON public.active_subscriptions_v2(last_seen_at DESC);

-- RLS: Users can read their own subscriptions
ALTER TABLE public.active_subscriptions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own subscriptions"
  ON public.active_subscriptions_v2
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update (for batch analytics updates)
CREATE POLICY "Only service role can modify subscriptions"
  ON public.active_subscriptions_v2
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

