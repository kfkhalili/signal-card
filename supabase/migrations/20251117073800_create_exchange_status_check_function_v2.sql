-- Phase 3: Staleness System
-- Create exchange status check function
-- CRITICAL: Used by staleness checkers to prevent unnecessary API calls when markets are closed
-- Only checks exchange status for quote data type (other types don't depend on market hours)

CREATE OR REPLACE FUNCTION public.is_exchange_open_for_symbol_v2(
  p_symbol TEXT,
  p_data_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_exchange_code TEXT;
  v_is_market_open BOOLEAN;
BEGIN
  -- Only check exchange status for quote data type
  -- Other data types (profile, financial-statements, etc.) don't depend on market hours
  IF p_data_type != 'quote' THEN
    RETURN true; -- Not a quote, assume "open" (no restriction)
  END IF;

  -- Get exchange code from live_quote_indicators (preferred) or profiles (fallback)
  SELECT exchange INTO v_exchange_code
  FROM public.live_quote_indicators
  WHERE symbol = p_symbol
  LIMIT 1;

  -- If not found in live_quote_indicators, try profiles table
  IF v_exchange_code IS NULL THEN
    SELECT exchange INTO v_exchange_code
    FROM public.profiles
    WHERE symbol = p_symbol
    LIMIT 1;
  END IF;

  -- If exchange code is still unknown, we can't check status
  -- Return true to allow the fetch (fail-safe: better to try than skip)
  IF v_exchange_code IS NULL THEN
    RAISE NOTICE 'Exchange code unknown for symbol %. Allowing fetch (fail-safe).', p_symbol;
    RETURN true;
  END IF;

  -- Check if exchange is open
  SELECT is_market_open INTO v_is_market_open
  FROM public.exchange_market_status
  WHERE exchange_code = v_exchange_code;

  -- If exchange status is unknown, return true (fail-safe)
  IF v_is_market_open IS NULL THEN
    RAISE NOTICE 'Exchange status unknown for exchange % (symbol %). Allowing fetch (fail-safe).', v_exchange_code, p_symbol;
    RETURN true;
  END IF;

  -- Return the market status
  RETURN v_is_market_open;
END;
$$;

COMMENT ON FUNCTION public.is_exchange_open_for_symbol_v2 IS 'Checks if exchange is open for a symbol. Only applies to quote data type. Returns true for non-quote types or if exchange status is unknown (fail-safe). Used by staleness checkers to prevent unnecessary API calls when markets are closed.';

