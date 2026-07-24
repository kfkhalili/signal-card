-- Restore profile provisioning without the orphaned handle-new-user Edge Function.
--
-- Production verification on 2026-07-24 found:
--   * no application trigger on auth.users;
--   * no Database Webhook caller for handle-new-user; and
--   * 10 of 20 auth users without a public.user_profiles row.
--
-- Keep the profile insert deliberately small and deterministic. The UUID-based
-- placeholder username is unique, contains no email address, and satisfies the
-- existing 3-50 character constraint. Users replace it during profile
-- completion.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    username,
    full_name,
    avatar_url,
    is_profile_complete
  )
  VALUES (
    NEW.id,
    'user_' || NEW.id::text,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      ''
    ),
    CASE
      WHEN NULLIF(pg_catalog.btrim(NEW.email), '') IS NULL THEN NULL
      ELSE
        'https://www.gravatar.com/avatar/'
        || pg_catalog.md5(pg_catalog.lower(pg_catalog.btrim(NEW.email)))
        || '?s=200&d=identicon'
    END,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_auth_user_created() OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.handle_auth_user_created()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.handle_auth_user_created()
TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_created();

-- Repair existing users without changing any profile that already exists.
INSERT INTO public.user_profiles (
  id,
  username,
  full_name,
  avatar_url,
  is_profile_complete
)
SELECT
  users.id,
  'user_' || users.id::text,
  COALESCE(
    NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(users.raw_user_meta_data ->> 'name', ''),
    ''
  ),
  CASE
    WHEN NULLIF(pg_catalog.btrim(users.email), '') IS NULL THEN NULL
    ELSE
      'https://www.gravatar.com/avatar/'
      || pg_catalog.md5(pg_catalog.lower(pg_catalog.btrim(users.email)))
      || '?s=200&d=identicon'
  END,
  false
FROM auth.users AS users
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_profiles AS profiles
  WHERE profiles.id = users.id
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON FUNCTION public.handle_auth_user_created() IS
  'Creates an incomplete public.user_profiles row after an auth.users insert. '
  'Execution is restricted to the Supabase Auth database role.';

COMMIT;
