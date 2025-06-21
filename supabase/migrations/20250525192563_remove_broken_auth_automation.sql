-- Fix signup by removing the broken auth trigger and its dependent function.
-- This was causing a 500 error on new user registration.

-- Step 1: Drop the trigger from the auth.users table.
-- This must be done first, as the function depends on it.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the now-unused function.
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add a comment for documentation.
COMMENT ON SCHEMA public IS 'Removed broken on_auth_user_created trigger and handle_new_user function to fix signup failures.';