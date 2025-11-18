-- Add LCID (Lucid Motors) to supported_symbols for testing empty card states
-- This symbol is valid but has no data in backend tables
-- Tests automatic job creation when data doesn't exist

INSERT INTO supported_symbols (symbol, is_active, added_at)
VALUES ('LCID', true, NOW())
ON CONFLICT (symbol) DO UPDATE SET
  is_active = true,
  added_at = COALESCE(EXCLUDED.added_at, NOW())
RETURNING symbol, is_active, added_at;

COMMENT ON TABLE public.supported_symbols IS 'LCID added for testing automatic job creation when data doesn''t exist.';

