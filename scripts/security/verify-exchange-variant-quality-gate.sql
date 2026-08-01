BEGIN;

INSERT INTO public.profiles (symbol, exchange, is_actively_trading)
VALUES
  ('QAVX', 'NASDAQ', true),
  ('QAVY', 'NASDAQ', true)
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO public.exchange_variants (
  symbol,
  symbol_variant,
  exchange_short_name,
  is_actively_trading
)
VALUES
  ('QAVX', 'QAVX', 'NASDAQ', true),
  ('QAVX', 'QAVX.DE', 'XETRA', true)
ON CONFLICT (symbol, symbol_variant, exchange_short_name) DO UPDATE
SET symbol = EXCLUDED.symbol;

DO $$
DECLARE
  replaced integer;
BEGIN
  SELECT public.replace_exchange_variants_v2(
    'QAVX',
    '[{
      "symbol": "QAVX",
      "symbol_variant": "QAVX",
      "exchange_short_name": "NASDAQ",
      "price": 10,
      "is_actively_trading": true
    }]'::jsonb
  ) INTO replaced;

  IF replaced <> 1 THEN
    RAISE EXCEPTION 'expected one replacement row, got %', replaced;
  END IF;
  IF (SELECT count(*) FROM public.exchange_variants WHERE symbol = 'QAVX') <> 1
     OR EXISTS (
       SELECT 1
       FROM public.exchange_variants
       WHERE symbol = 'QAVX'
         AND symbol_variant = 'QAVX.DE'
     )
  THEN
    RAISE EXCEPTION 'validated replacement did not remove the obsolete row';
  END IF;
END;
$$;

DO $$
BEGIN
  PERFORM public.replace_exchange_variants_v2(
    'QAVY',
    '[{
      "symbol": "QAVY",
      "symbol_variant": "QAVX",
      "exchange_short_name": "NASDAQ",
      "price": 10,
      "is_actively_trading": true
    }]'::jsonb
  );

  IF (
    SELECT count(*)
    FROM public.exchange_variants
    WHERE symbol_variant = 'QAVX'
      AND exchange_short_name = 'NASDAQ'
  ) <> 2 THEN
    RAISE EXCEPTION
      'overlapping variant was not retained for both base symbols';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.replace_exchange_variants_v2('QAVX', '[]'::jsonb);
    RAISE EXCEPTION 'empty replacement unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'empty replacement unexpectedly succeeded' THEN
        RAISE;
      END IF;
  END;

  IF (SELECT count(*) FROM public.exchange_variants WHERE symbol = 'QAVX') <> 1
  THEN
    RAISE EXCEPTION 'empty replacement changed the last-known-good set';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.replace_exchange_variants_v2(
      'QAVX',
      '[
        {
          "symbol": "QAVX",
          "symbol_variant": "QAVX",
          "exchange_short_name": "NASDAQ"
        },
        {
          "symbol": "QAVX",
          "symbol_variant": "QAVX",
          "exchange_short_name": "NASDAQ"
        }
      ]'::jsonb
    );
    RAISE EXCEPTION 'duplicate replacement unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'duplicate replacement unexpectedly succeeded' THEN
        RAISE;
      END IF;
  END;

  IF (SELECT count(*) FROM public.exchange_variants WHERE symbol = 'QAVX') <> 1
  THEN
    RAISE EXCEPTION 'duplicate replacement changed the last-known-good set';
  END IF;
END;
$$;

DO $$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.replace_exchange_variants_v2(text,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must not execute replace_exchange_variants_v2';
  END IF;
  IF NOT has_function_privilege(
    'service_role',
    'public.replace_exchange_variants_v2(text,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role must execute replace_exchange_variants_v2';
  END IF;
END;
$$;

ROLLBACK;
