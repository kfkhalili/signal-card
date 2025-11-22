-- Phase 0: Safety Infrastructure
-- Create feature flags table for gradual rollout and rollback capability

CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.feature_flags IS 'Feature flags for controlling gradual rollout of new backend-controlled refresh system. Allows instant rollback if issues arise.';
COMMENT ON COLUMN public.feature_flags.flag_name IS 'Unique identifier for the feature flag (e.g., use_queue_system, use_presence_tracking)';
COMMENT ON COLUMN public.feature_flags.enabled IS 'Whether the feature is currently enabled';
COMMENT ON COLUMN public.feature_flags.metadata IS 'Additional metadata for the flag (e.g., rollout percentage, target users)';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled) WHERE enabled = true;

-- Helper function to check if a feature is enabled
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_flag_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT enabled FROM public.feature_flags WHERE flag_name = p_flag_name;
$$;

COMMENT ON FUNCTION public.is_feature_enabled IS 'Helper function to check if a feature flag is enabled. Returns false if flag does not exist.';

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial feature flags (all disabled by default)
INSERT INTO public.feature_flags (flag_name, enabled, metadata) VALUES
  ('use_queue_system', false, '{"description": "Enable the new queue-based API calling system", "phase": 2}'),
  ('use_presence_tracking', false, '{"description": "Enable Realtime Presence tracking for subscriptions", "phase": 4}'),
  ('use_new_staleness_check', false, '{"description": "Enable event-driven staleness checking", "phase": 3}'),
  ('migrate_quote_type', false, '{"description": "Migrate quote data type to new system", "phase": 5, "data_type": "quote"}'),
  ('migrate_profile_type', false, '{"description": "Migrate profile data type to new system", "phase": 5, "data_type": "profile"}'),
  ('migrate_financial_statements_type', false, '{"description": "Migrate financial-statements data type to new system", "phase": 5, "data_type": "financial-statements"}'),
  ('migrate_ratios_ttm_type', false, '{"description": "Migrate ratios-ttm data type to new system", "phase": 5, "data_type": "ratios-ttm"}'),
  ('migrate_dividend_history_type', false, '{"description": "Migrate dividend-history data type to new system", "phase": 5, "data_type": "dividend-history"}'),
  ('migrate_shares_float_type', false, '{"description": "Migrate shares-float data type to new system", "phase": 5, "data_type": "shares-float"}'),
  ('migrate_revenue_segmentation_type', false, '{"description": "Migrate revenue-segmentation data type to new system", "phase": 5, "data_type": "revenue-segmentation"}'),
  ('migrate_grades_historical_type', false, '{"description": "Migrate grades-historical data type to new system", "phase": 5, "data_type": "grades-historical"}'),
  ('migrate_exchange_variants_type', false, '{"description": "Migrate exchange-variants data type to new system", "phase": 5, "data_type": "exchange-variants"}'),
  ('migrate_available_exchanges_type', false, '{"description": "Migrate available-exchanges data type to new system", "phase": 5, "data_type": "available-exchanges"}'),
  ('migrate_exchange_market_status_type', false, '{"description": "Migrate exchange-market-status data type to new system", "phase": 5, "data_type": "exchange-market-status"}')
ON CONFLICT (flag_name) DO NOTHING;

-- RLS: Feature flags are read-only for authenticated users, only service role can modify
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read feature flags
CREATE POLICY "Feature flags are readable by authenticated users"
  ON public.feature_flags
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can modify feature flags (for safety)
CREATE POLICY "Only service role can modify feature flags"
  ON public.feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

