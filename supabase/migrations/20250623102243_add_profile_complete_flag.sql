-- Add a flag to track if a user has completed their profile setup.
-- This will be used by the middleware to redirect users to a
-- profile completion page after their first sign-up.

ALTER TABLE public.user_profiles
ADD COLUMN is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.is_profile_complete IS 'Tracks if the user has completed the initial profile setup (e.g., setting a username). New users default to FALSE.';

-- NOTE: For existing databases, you may want to backfill is_profile_complete
-- For fresh databases, all users start with is_profile_complete = FALSE
-- Data backfill (UPDATE) is intentionally omitted as it's not infrastructure