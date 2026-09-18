-- Add a bounded quarterly window to the existing weekly financial-statement
-- job. The worker now makes the established three annual calls plus three
-- quarterly calls capped at five rows each.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.data_type_registry_v2
    WHERE data_type = 'financial-statements'
  ) THEN
    RAISE EXCEPTION
      'financial-statements registry entry must exist before quarterly rollout';
  END IF;
END;
$$;

UPDATE public.data_type_registry_v2
SET
  api_calls_per_job = 6,
  estimated_data_size_bytes = GREATEST(
    estimated_data_size_bytes,
    1200000
  ),
  updated_at = pg_catalog.now()
WHERE data_type = 'financial-statements';

COMMIT;
