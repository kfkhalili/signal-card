-- Phase 1: Foundation
-- Create identifier validation helper function
-- This provides defense-in-depth against SQL injection in dynamic SQL

-- Validate identifiers before use in dynamic SQL (additional safety layer)
CREATE OR REPLACE FUNCTION public.is_valid_identifier(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
BEGIN
  -- Simple check: ensure it contains only safe characters
  -- A more robust check would query information_schema.columns
  -- This prevents basic SQL injection attempts via registry values
  IF p_identifier IS NULL OR p_identifier = '' THEN
    RETURN false;
  END IF;

  -- Allow only alphanumeric and underscore characters
  -- This matches PostgreSQL identifier rules
  RETURN p_identifier ~ '^[a-zA-Z0-9_]+$';
END;
$$;

COMMENT ON FUNCTION public.is_valid_identifier IS 'Validates that an identifier is safe for use in dynamic SQL. Returns false for NULL, empty strings, or identifiers containing unsafe characters.';

