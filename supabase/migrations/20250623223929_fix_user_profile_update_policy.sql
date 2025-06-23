-- This migration fixes the RLS policy for updating user profiles.
-- The previous policy was missing a `WITH CHECK` clause, which is crucial
-- for security and ensuring users can only update their own records with
-- valid data.

-- Drop the old policy
DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";

-- Create the new, more secure policy
CREATE POLICY "Allow users to update their own profile"
ON "public"."user_profiles"
FOR UPDATE
-- The USING clause specifies which rows the user is allowed to update.
-- In this case, it's the row where the 'id' matches their own authenticated user ID.
USING ((select auth.uid()) = id)
-- The WITH CHECK clause validates the data being submitted in the UPDATE statement.
-- This ensures a user cannot change the 'id' of their profile to someone else's.
WITH CHECK ((select auth.uid()) = id);

COMMENT ON POLICY "Allow users to update their own profile" ON public.user_profiles
IS 'Ensures users can only update their own profile and cannot change their profile ID.';