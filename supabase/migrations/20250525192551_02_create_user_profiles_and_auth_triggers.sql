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

-- User profile creation is handled via webhook function (handle_user_created_webhook)
-- See: 20250525192559_create_user_profile_webhook_function.sql