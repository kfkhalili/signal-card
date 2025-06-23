-- Corrective script to backfill Gravatar URLs for users with empty strings.

-- This script runs after the initial backfill to catch any users who might have
-- had an empty string ('') as their avatar_url instead of NULL. The previous
-- script only checked for NULL, so this ensures all users without a valid
-- avatar are updated.

UPDATE
  public.user_profiles AS up
SET
  avatar_url = 'https://www.gravatar.com/avatar/' || md5(lower(trim(au.email))) || '?s=200&d=identicon'
FROM
  auth.users AS au
WHERE
  up.id = au.id AND (up.avatar_url IS NULL OR up.avatar_url = '');

COMMENT ON TABLE public.user_profiles IS 'Extends auth.users with custom profile data, including an avatar_url which defaults to a Gravatar image. This comment is updated for consistency.';