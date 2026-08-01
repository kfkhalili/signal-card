-- Exchange variants are durable filter/card data and have now passed the
-- quality-gated refresh calibration. Include them in the bounded scheduled
-- round robin with their existing daily TTL.

DO $$
BEGIN
  UPDATE public.data_type_registry_v2
  SET refresh_strategy = 'scheduled',
      default_ttl_minutes = 1440,
      estimated_data_size_bytes = 20000,
      updated_at = pg_catalog.now()
  WHERE data_type = 'exchange-variants';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'exchange-variants registry row is required before scheduling';
  END IF;
END;
$$;

COMMENT ON COLUMN public.data_type_registry_v2.estimated_data_size_bytes IS
  'Conservative pre-fetch estimate used for queue planning; workers record the measured response size after each call.';
