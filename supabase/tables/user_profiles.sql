-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Primary key, references auth.users.id
    username TEXT UNIQUE, -- Optional: a unique, user-chosen display name
    full_name TEXT NULL,   -- Optional: user's full name
    avatar_url TEXT NULL,  -- Optional: URL to user's avatar image
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),

    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_username_key unique (username),
    CONSTRAINT user_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50) -- Example constraint
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles:
-- Users can view all profiles (e.g., to display author names/avatars on comments).
CREATE POLICY "Allow public read access to user profiles"
ON public.user_profiles
FOR SELECT
USING (true);

-- Users can update their own profile.
CREATE POLICY "Allow users to update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (typically done once).
-- This often happens via a trigger after a new user signs up in auth.users.
CREATE POLICY "Allow users to insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);


-- Optional: Trigger function to automatically create a user_profile entry when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username)
  VALUES (new.id, new.email); -- Or extract username from email, or leave it null initially
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT SELECT ON TABLE public.user_profiles TO authenticated, anon; -- Allow anon to read if profiles are public
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO authenticated; -- Only authenticated users for CUD on their own profiles via RLS

-- Note: If you already have users, the trigger won't run for them.
-- You might need to backfill `user_profiles` for existing users:
-- INSERT INTO public.user_profiles (id, username)
-- SELECT id, email FROM auth.users
-- ON CONFLICT (id) DO NOTHING;