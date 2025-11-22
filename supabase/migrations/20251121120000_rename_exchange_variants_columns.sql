-- Rename exchange_variants columns to be consistent with other tables
-- base_symbol → symbol (main column, consistent with other tables)
-- variant_symbol → symbol_variant (variant column)

-- Step 1: Drop existing constraints
ALTER TABLE public.exchange_variants
  DROP CONSTRAINT IF EXISTS exchange_variants_pkey,
  DROP CONSTRAINT IF EXISTS fk_exchange_variants_base_symbol;

-- Drop indexes separately (cannot use IF EXISTS in ALTER TABLE)
DROP INDEX IF EXISTS idx_exchange_variants_base_symbol;
DROP INDEX IF EXISTS idx_exchange_variants_variant_symbol;

-- Step 2: Rename columns
ALTER TABLE public.exchange_variants
  RENAME COLUMN base_symbol TO symbol;

ALTER TABLE public.exchange_variants
  RENAME COLUMN variant_symbol TO symbol_variant;

-- Step 3: Recreate primary key with new column names
ALTER TABLE public.exchange_variants
  ADD CONSTRAINT exchange_variants_pkey PRIMARY KEY (symbol_variant, exchange_short_name);

-- Step 4: Recreate foreign key constraint with new column name
ALTER TABLE public.exchange_variants
  ADD CONSTRAINT fk_exchange_variants_symbol
  FOREIGN KEY (symbol) REFERENCES public.profiles(symbol) ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_exchange_variants_symbol ON public.exchange_variants IS 'References profiles.symbol. Renamed from base_symbol to symbol for consistency.';

-- Step 5: Recreate indexes with new column names
CREATE INDEX IF NOT EXISTS idx_exchange_variants_symbol ON public.exchange_variants USING BTREE (symbol);
CREATE INDEX IF NOT EXISTS idx_exchange_variants_symbol_variant ON public.exchange_variants USING BTREE (symbol_variant);

-- Step 6: Update column comments
COMMENT ON COLUMN public.exchange_variants.symbol IS 'The base stock symbol, references profiles.symbol. Renamed from base_symbol for consistency with other tables.';
COMMENT ON COLUMN public.exchange_variants.symbol_variant IS 'The exchange-specific symbol variant (e.g., "AAPL.DE"). Renamed from variant_symbol. Part of composite PK.';

