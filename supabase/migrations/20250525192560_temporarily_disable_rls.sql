-- Temporarily disable RLS on user_profiles to test if that's causing signup issues
-- This is for debugging purposes only

-- Disable RLS on user_profiles
ALTER TABLE "public"."user_profiles" DISABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE "public"."user_profiles" IS 'RLS temporarily disabled for debugging signup issues.';