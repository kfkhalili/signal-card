-- FMP exchange-variant searches return overlapping security families. The
-- same variant can therefore belong to the result sets of multiple requested
-- base symbols. Model that many-to-many relationship instead of assigning a
-- variant globally to whichever base symbol was refreshed first.

DO $$
DECLARE
  v_constraint_name text;
  v_primary_key_columns text[];
BEGIN
  SELECT
    constraint_row.conname,
    pg_catalog.array_agg(attribute_row.attname ORDER BY key_row.ordinality)
  INTO v_constraint_name, v_primary_key_columns
  FROM pg_catalog.pg_constraint AS constraint_row
  CROSS JOIN LATERAL pg_catalog.unnest(constraint_row.conkey)
    WITH ORDINALITY AS key_row(attnum, ordinality)
  JOIN pg_catalog.pg_attribute AS attribute_row
    ON attribute_row.attrelid = constraint_row.conrelid
   AND attribute_row.attnum = key_row.attnum
  WHERE constraint_row.conrelid = 'public.exchange_variants'::regclass
    AND constraint_row.contype = 'p'
  GROUP BY constraint_row.conname;

  IF v_primary_key_columns IS DISTINCT FROM ARRAY[
    'symbol',
    'symbol_variant',
    'exchange_short_name'
  ]::text[] THEN
    IF v_constraint_name IS NOT NULL THEN
      EXECUTE pg_catalog.format(
        'ALTER TABLE public.exchange_variants DROP CONSTRAINT %I',
        v_constraint_name
      );
    END IF;

    ALTER TABLE public.exchange_variants
      ADD CONSTRAINT exchange_variants_pkey
      PRIMARY KEY (symbol, symbol_variant, exchange_short_name);
  END IF;
END;
$$;

COMMENT ON TABLE public.exchange_variants IS
  'Stores each base symbol exchange-variant result set from FMP; related base symbols may contain overlapping variants.';

COMMENT ON COLUMN public.exchange_variants.symbol IS
  'Requested base symbol whose FMP result set contains this variant; part of the composite primary key.';

COMMENT ON COLUMN public.exchange_variants.symbol_variant IS
  'Exchange-specific variant returned for the requested base symbol; part of the composite primary key.';
