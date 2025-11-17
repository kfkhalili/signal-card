-- Phase 1: Foundation
-- Create data_type_registry_v2 table (metadata-driven system)
-- This is the single source of truth for all data types

CREATE TABLE IF NOT EXISTS public.data_type_registry_v2 (
  data_type TEXT PRIMARY KEY, -- 'quote', 'profile', 'financial-statements', etc.
  table_name TEXT NOT NULL, -- 'live_quote_indicators', 'profiles', etc.
  timestamp_column TEXT NOT NULL, -- 'fetched_at', 'modified_at', 'last_fetched_at'
  staleness_function TEXT NOT NULL, -- 'is_data_stale_v2', 'is_profile_stale_v2', etc.
  default_ttl_minutes INTEGER NOT NULL CHECK (default_ttl_minutes > 0), -- 5, 1440, 43200, etc. (must be positive)
  edge_function_name TEXT NOT NULL, -- 'fetch-fmp-quote-indicators', etc.
  refresh_strategy TEXT NOT NULL CHECK (refresh_strategy IN ('on-demand', 'scheduled')), -- 'on-demand', 'scheduled'
  refresh_schedule TEXT, -- Cron expression if scheduled (NULL for on-demand)
  priority INTEGER DEFAULT 0, -- For queue processing
  estimated_data_size_bytes BIGINT DEFAULT 0,
  symbol_column TEXT DEFAULT 'symbol', -- For generic queries
  source_timestamp_column TEXT NULL, -- Optional: Column name in API response for source timestamp (e.g., 'lastUpdated', 'timestamp', 'date')
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.data_type_registry_v2 IS 'Single source of truth for all data types. Adding new types requires zero code changes.';
COMMENT ON COLUMN public.data_type_registry_v2.data_type IS 'Unique identifier for the data type (e.g., quote, profile, financial-statements)';
COMMENT ON COLUMN public.data_type_registry_v2.table_name IS 'Name of the database table storing this data type';
COMMENT ON COLUMN public.data_type_registry_v2.timestamp_column IS 'Column name in the table that stores the fetch timestamp';
COMMENT ON COLUMN public.data_type_registry_v2.staleness_function IS 'Name of the SQL function to check staleness for this data type';
COMMENT ON COLUMN public.data_type_registry_v2.default_ttl_minutes IS 'Default time-to-live in minutes. Must be positive to prevent infinite refresh loops.';
COMMENT ON COLUMN public.data_type_registry_v2.edge_function_name IS 'Name of the Edge Function that fetches this data type';
COMMENT ON COLUMN public.data_type_registry_v2.refresh_strategy IS 'Whether this data type is refreshed on-demand or on a schedule';
COMMENT ON COLUMN public.data_type_registry_v2.refresh_schedule IS 'Cron expression for scheduled refreshes (NULL for on-demand)';
COMMENT ON COLUMN public.data_type_registry_v2.priority IS 'Priority level for queue processing (higher = more urgent)';
COMMENT ON COLUMN public.data_type_registry_v2.estimated_data_size_bytes IS 'Estimated size of API response in bytes (for quota tracking)';
COMMENT ON COLUMN public.data_type_registry_v2.symbol_column IS 'Column name that stores the symbol (default: symbol)';
COMMENT ON COLUMN public.data_type_registry_v2.source_timestamp_column IS 'Optional: Column name in API response for source timestamp validation';

-- CRITICAL SECURITY: Make registry read-only for all non-super-admin roles
-- This prevents SQL injection via malicious registry entries
REVOKE ALL ON public.data_type_registry_v2 FROM PUBLIC;
GRANT SELECT ON public.data_type_registry_v2 TO authenticated, anon;
-- Only postgres super-admin can INSERT/UPDATE/DELETE
-- This is a non-negotiable security boundary

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_data_type_registry_v2_refresh_strategy 
  ON public.data_type_registry_v2(refresh_strategy) 
  WHERE refresh_strategy = 'on-demand';

CREATE INDEX IF NOT EXISTS idx_data_type_registry_v2_refresh_strategy_scheduled 
  ON public.data_type_registry_v2(refresh_strategy) 
  WHERE refresh_strategy = 'scheduled';

-- Auto-update updated_at timestamp
CREATE TRIGGER update_data_type_registry_v2_updated_at
  BEFORE UPDATE ON public.data_type_registry_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Registry is read-only for authenticated users
ALTER TABLE public.data_type_registry_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Data type registry is readable by authenticated users"
  ON public.data_type_registry_v2
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can modify registry (for safety)
CREATE POLICY "Only service role can modify data type registry"
  ON public.data_type_registry_v2
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

