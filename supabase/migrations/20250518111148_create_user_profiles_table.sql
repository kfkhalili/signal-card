-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL -- Ensure not null if moddatetime relies on it
);

-- Trigger for user_profiles.updated_at
CREATE TRIGGER handle_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime (updated_at);

-- It's good practice to comment on tables and columns for clarity
COMMENT ON TABLE public.user_profiles IS 'Extends auth.users with custom profile data.';
COMMENT ON COLUMN public.user_profiles.id IS 'Links to auth.users.id.';