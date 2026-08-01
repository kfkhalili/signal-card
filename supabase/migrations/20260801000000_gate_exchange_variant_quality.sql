-- Replace one symbol's validated exchange variants as a single transaction.
-- The Edge Function performs provider-quality checks before calling this RPC;
-- these defensive checks ensure malformed payloads cannot partially replace
-- the last-known-good set.

CREATE OR REPLACE FUNCTION public.replace_exchange_variants_v2(
  p_symbol text,
  p_records jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_symbol text := pg_catalog.upper(pg_catalog.btrim(p_symbol));
  v_inserted integer := 0;
BEGIN
  IF v_symbol IS NULL OR v_symbol = '' THEN
    RAISE EXCEPTION 'p_symbol must not be empty';
  END IF;
  IF p_records IS NULL
     OR pg_catalog.jsonb_typeof(p_records) <> 'array'
     OR pg_catalog.jsonb_array_length(p_records) = 0
  THEN
    RAISE EXCEPTION 'p_records must be a non-empty JSON array';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_records) AS item
    WHERE pg_catalog.jsonb_typeof(item) <> 'object'
  ) THEN
    RAISE EXCEPTION 'every exchange-variant record must be a JSON object';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_populate_recordset(
      NULL::public.exchange_variants,
      p_records
    ) AS record
    WHERE record.symbol IS NULL
       OR pg_catalog.upper(pg_catalog.btrim(record.symbol)) <> v_symbol
       OR NULLIF(pg_catalog.btrim(record.symbol_variant), '') IS NULL
       OR NULLIF(pg_catalog.btrim(record.exchange_short_name), '') IS NULL
  ) THEN
    RAISE EXCEPTION
      'records must match p_symbol and contain symbol_variant and exchange_short_name';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_populate_recordset(
      NULL::public.exchange_variants,
      p_records
    ) AS record
    GROUP BY
      pg_catalog.upper(pg_catalog.btrim(record.symbol_variant)),
      pg_catalog.upper(pg_catalog.btrim(record.exchange_short_name))
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'p_records contains duplicate exchange variants';
  END IF;

  DELETE FROM public.exchange_variants
  WHERE symbol = v_symbol;

  INSERT INTO public.exchange_variants (
    symbol,
    symbol_variant,
    exchange_short_name,
    price,
    beta,
    vol_avg,
    mkt_cap,
    last_div,
    range,
    changes,
    currency,
    cik,
    isin,
    cusip,
    exchange,
    dcf_diff,
    dcf,
    image,
    ipo_date,
    default_image,
    is_actively_trading,
    fetched_at
  )
  SELECT
    v_symbol,
    pg_catalog.upper(pg_catalog.btrim(record.symbol_variant)),
    pg_catalog.upper(pg_catalog.btrim(record.exchange_short_name)),
    record.price,
    record.beta,
    record.vol_avg,
    record.mkt_cap,
    record.last_div,
    record.range,
    record.changes,
    record.currency,
    record.cik,
    record.isin,
    record.cusip,
    record.exchange,
    record.dcf_diff,
    record.dcf,
    record.image,
    record.ipo_date,
    record.default_image,
    record.is_actively_trading,
    COALESCE(record.fetched_at, pg_catalog.now())
  FROM pg_catalog.jsonb_populate_recordset(
    NULL::public.exchange_variants,
    p_records
  ) AS record;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

ALTER FUNCTION public.replace_exchange_variants_v2(text, jsonb)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.replace_exchange_variants_v2(text, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.replace_exchange_variants_v2(text, jsonb)
TO service_role;

COMMENT ON FUNCTION public.replace_exchange_variants_v2(text, jsonb) IS
  'Atomically replaces a symbol exchange-variant set after Edge Function quality validation; rejects empty, mismatched, and duplicate payloads.';
