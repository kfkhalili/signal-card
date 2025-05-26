CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Corrected to use 'id' column as defined in user_profiles table
  INSERT INTO public.user_profiles (id, username)
  VALUES (NEW.id, NEW.email); -- Using email as initial username, can be updated by user
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a profile in public.user_profiles when a new user is added to auth.users.';

CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL PRIMARY KEY, -- Define id as PRIMARY KEY inline
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "username_length" CHECK ((("char_length"("username") >= 3) AND ("char_length"("username") <= 50)))
);

ALTER TABLE "public"."user_profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."user_profiles" IS 'Extends auth.users with custom profile data.';
COMMENT ON COLUMN "public"."user_profiles"."id" IS 'Links to auth.users.id and is the Primary Key.';

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

-- Consider adding the trigger on auth.users table here if needed:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();