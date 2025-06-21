-- Re-enable Row Level Security (RLS) on the user_profiles table.
-- This was temporarily disabled for debugging and is now being re-enabled for security.

ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation.
COMMENT ON TABLE "public"."user_profiles" IS 'RLS re-enabled after fixing signup issues.';