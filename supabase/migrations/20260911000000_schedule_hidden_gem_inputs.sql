-- Keep the market and analyst inputs used by the Hidden Gems shadow screen
-- fresh through the existing quota-guarded scheduler.

BEGIN;

DO $$
BEGIN
  UPDATE public.data_type_registry_v2
  SET refresh_strategy = 'scheduled',
      default_ttl_minutes = 1440,
      updated_at = pg_catalog.now()
  WHERE data_type = 'quote';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quote registry row is required before scheduling';
  END IF;

  UPDATE public.data_type_registry_v2
  SET refresh_strategy = 'scheduled',
      default_ttl_minutes = 43200,
      updated_at = pg_catalog.now()
  WHERE data_type = 'grades-historical';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'grades-historical registry row is required before scheduling';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_compass_hidden_gems_shadow_v1(
  integer,
  text[],
  text[]
) IS
  'Service-only Hidden Gems shadow screen. Quote inputs refresh daily and analyst-grade inputs refresh every 30 days through the existing scheduled queue.';

COMMIT;
