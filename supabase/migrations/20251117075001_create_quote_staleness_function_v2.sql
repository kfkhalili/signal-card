-- Phase 5: Migration (One Type)
-- Create quote-specific staleness check function
-- Quotes use fetched_at column and have a 1-minute TTL

CREATE OR REPLACE FUNCTION public.is_quote_stale_v2(
  p_fetched_at TIMESTAMPTZ,
  p_ttl_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Got: %', p_ttl_minutes;
  END IF;

  -- Check if quote is stale
  RETURN p_fetched_at IS NULL OR p_fetched_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION public.is_quote_stale_v2 IS 'Quote-specific staleness check. Returns true if quote is stale. Uses fetched_at column. TTL must be explicitly provided (no default).';

