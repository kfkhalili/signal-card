-- Phase 1: Foundation
-- Create staleness check functions
-- CRITICAL: No DEFAULT values for TTL parameters (prevents split-brain TTL bugs)
-- TTL must be explicitly provided from data_type_registry_v2

-- Generic staleness check function (no default TTL)
CREATE OR REPLACE FUNCTION public.is_data_stale_v2(
  p_fetched_at TIMESTAMPTZ,
  p_ttl_minutes INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Got: %', p_ttl_minutes;
  END IF;
  
  -- Check if data is stale
  RETURN p_fetched_at IS NULL OR p_fetched_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_data_stale_v2 IS 'Generic staleness check. Returns true if data is stale. TTL must be explicitly provided (no default).';

-- Profile-specific staleness check (uses modified_at, no default TTL)
CREATE OR REPLACE FUNCTION public.is_profile_stale_v2(
  p_modified_at TIMESTAMPTZ,
  p_ttl_minutes INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Got: %', p_ttl_minutes;
  END IF;
  
  -- Check if profile is stale
  RETURN p_modified_at IS NULL OR p_modified_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_profile_stale_v2 IS 'Profile-specific staleness check. Returns true if profile is stale. TTL must be explicitly provided (no default).';

