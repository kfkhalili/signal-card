-- Shelve the unfinished corporate-bond feature without deleting its data.
--
-- The Edge Function deployment is removed separately with the Supabase CLI.
-- This migration preserves public.corporate_bonds for a future retention
-- decision while removing its unused public and Realtime exposure.

DO $$
BEGIN
  IF to_regclass('public.corporate_bonds') IS NULL THEN
    RAISE NOTICE 'public.corporate_bonds does not exist; nothing to shelve';
    RETURN;
  END IF;

  EXECUTE
    'REVOKE ALL PRIVILEGES ON TABLE public.corporate_bonds FROM anon, authenticated';

  EXECUTE
    'DROP POLICY IF EXISTS "Allow public read access to corporate_bonds" '
    'ON public.corporate_bonds';

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'corporate_bonds'
  ) THEN
    EXECUTE
      'ALTER PUBLICATION supabase_realtime '
      'DROP TABLE public.corporate_bonds';
  END IF;

  EXECUTE $comment$
    COMMENT ON TABLE public.corporate_bonds IS
      'Shelved corporate-bond prototype data. Not an active product source; '
      'public access and Realtime publication removed on 2026-07-24.'
  $comment$;
END
$$;
