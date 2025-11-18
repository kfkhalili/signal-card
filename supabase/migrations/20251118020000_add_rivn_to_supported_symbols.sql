-- Add RIVN (Rivian) to supported_symbols for testing empty card states
-- This symbol is valid but likely doesn't have data in backend tables yet
-- This allows testing how cards handle empty states while subscriptions/job queue fetch data

INSERT INTO supported_symbols (symbol, is_active, added_at)
VALUES ('RIVN', true, NOW())
ON CONFLICT (symbol) DO UPDATE SET
  is_active = true,
  added_at = COALESCE(EXCLUDED.added_at, NOW())
RETURNING symbol, is_active, added_at;

COMMENT ON TABLE public.supported_symbols IS 'RIVN added for testing empty card states. Cards should render empty states while subscriptions/job queue fetch data.';

