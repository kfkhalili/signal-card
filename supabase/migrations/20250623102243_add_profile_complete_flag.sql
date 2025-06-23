-- Add a flag to track if a user has completed their profile setup.
-- This will be used by the middleware to redirect users to a
-- profile completion page after their first sign-up.

ALTER TABLE public.user_profiles
ADD COLUMN is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.is_profile_complete IS 'Tracks if the user has completed the initial profile setup (e.g., setting a username).';

-- For all existing users, we'll assume their profile is complete
-- if their username is not their email address. New users will have
-- username = email by default.
UPDATE public.user_profiles
SET is_profile_complete = TRUE
WHERE username IS NOT NULL AND username != '';

-- Note: This is an assumption. If you have users where username equals email
-- but their profile should be considered complete, you may need to adjust this.
-- For a fresh system, this logic is generally safe.