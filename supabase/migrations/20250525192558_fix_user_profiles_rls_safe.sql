-- Safely fix RLS policies for user_profiles
-- This migration safely updates the RLS policies to allow the service role to bypass them
-- which is needed for automatic user profile creation

DO $$
BEGIN
    -- Only proceed if the user_profiles table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN

        -- Drop existing policies safely
        DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."user_profiles";
        DROP POLICY IF EXISTS "Allow users to insert their own profile" ON "public"."user_profiles";
        DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";
        DROP POLICY IF EXISTS "Allow trigger to insert user profiles" ON "public"."user_profiles";

        -- Create new policies that allow service role to bypass RLS
        CREATE POLICY "Users can view their own profile" ON "public"."user_profiles"
        FOR SELECT USING (
          (select auth.uid()) = "id" OR
          (current_setting('role') = 'service_role')
        );

        CREATE POLICY "Allow users to insert their own profile" ON "public"."user_profiles"
        FOR INSERT
        WITH CHECK (
          ("id" = (select auth.uid())) OR
          (current_setting('role') = 'service_role')
        );

        CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles"
        FOR UPDATE
        USING (
          ("id" = (select auth.uid())) OR
          (current_setting('role') = 'service_role')
        );

        -- Grant necessary permissions to service_role
        GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";

        RAISE NOTICE 'Successfully updated RLS policies for user_profiles table.';
    ELSE
        RAISE NOTICE 'user_profiles table does not exist. Skipping RLS policy updates.';
    END IF;
END $$;