DO $$
DECLARE
  v_strategy text;
  v_ttl_minutes integer;
  v_estimated_bytes bigint;
BEGIN
  SELECT
    refresh_strategy,
    default_ttl_minutes,
    estimated_data_size_bytes
  INTO v_strategy, v_ttl_minutes, v_estimated_bytes
  FROM public.data_type_registry_v2
  WHERE data_type = 'exchange-variants';

  IF v_strategy <> 'scheduled' THEN
    RAISE EXCEPTION
      'exchange variants must be scheduled, found %', v_strategy;
  END IF;
  IF v_ttl_minutes <> 1440 THEN
    RAISE EXCEPTION
      'exchange variant TTL must be 1440 minutes, found %', v_ttl_minutes;
  END IF;
  IF v_estimated_bytes <> 20000 THEN
    RAISE EXCEPTION
      'exchange variant estimate must be 20000 bytes, found %',
      v_estimated_bytes;
  END IF;
END;
$$;
