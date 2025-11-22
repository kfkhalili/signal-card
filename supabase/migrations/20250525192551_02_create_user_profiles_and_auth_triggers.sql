-- NOTE: User profile creation is handled via webhook function (handle_user_created_webhook)
-- The old trigger-based approach (handle_new_user) was removed due to signup failures

CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL PRIMARY KEY, -- Define id as PRIMARY KEY inline
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_profile_complete" boolean NOT NULL DEFAULT false,
    CONSTRAINT "username_length" CHECK ((("char_length"("username") >= 3) AND ("char_length"("username") <= 50)))
);

ALTER TABLE "public"."user_profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."user_profiles" IS 'Extends auth.users with custom profile data.';
COMMENT ON COLUMN "public"."user_profiles"."id" IS 'Links to auth.users.id and is the Primary Key.';
COMMENT ON COLUMN "public"."user_profiles"."is_profile_complete" IS 'Tracks if the user has completed the initial profile setup (e.g., setting a username). New users default to FALSE.';

-- Unique constraint for username
ALTER TABLE "public"."user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_username_key";
ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");

-- Trigger for user_profiles updated_at
CREATE OR REPLACE TRIGGER "handle_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Foreign Key to auth.users
ALTER TABLE "public"."user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_id_fkey";
ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- CRITICAL: Allow service role to bypass RLS for automatic user profile creation
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."user_profiles";
CREATE POLICY "Users can view their own profile" ON "public"."user_profiles"
FOR SELECT USING (
  (select auth.uid()) = "id" OR
  (current_setting('role') = 'service_role')
);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to insert their own profile" ON "public"."user_profiles"
FOR INSERT
WITH CHECK (
  ("id" = (select auth.uid())) OR
  (current_setting('role') = 'service_role')
);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles"
FOR UPDATE
-- The USING clause specifies which rows the user is allowed to update
USING (
  ("id" = (select auth.uid())) OR
  (current_setting('role') = 'service_role')
)
-- The WITH CHECK clause validates the data being submitted in the UPDATE statement
-- This ensures a user cannot change the 'id' of their profile to someone else's
WITH CHECK (
  ("id" = (select auth.uid())) OR
  (current_setting('role') = 'service_role')
);

-- Grants
-- CRITICAL: Service role needs access to create user profiles automatically
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";

-- User profile creation is handled via webhook function (handle_user_created_webhook)
-- See: 20250525192559_create_user_profile_webhook_function.sql