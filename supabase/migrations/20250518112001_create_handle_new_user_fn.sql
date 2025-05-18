-- Function to create a user_profile row when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Essential for writing to public.user_profiles from auth context
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username) -- Assuming user_id is the FK to auth.users.id
  VALUES (NEW.id, NEW.email); -- Using email as initial username, can be updated by user
  RETURN NEW;
END;
$$;

-- Trigger to call handle_new_user on new auth.users entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; -- Drop if it exists from a previous setup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile in public.user_profiles when a new user is added to auth.users.';