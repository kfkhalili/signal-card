-- Create a function that can be called by a webhook to handle user profile creation
-- This function will be called when a new user is created via Supabase Auth
-- CRITICAL: Includes Gravatar URL generation and is_profile_complete flag handling

CREATE OR REPLACE FUNCTION public.handle_user_created_webhook(user_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  user_id uuid;
  user_email text;
  gravatar_url text;
BEGIN
  -- Extract user data from the webhook payload
  user_id := (user_data->>'id')::uuid;
  user_email := user_data->>'email';

  -- Check if user profile already exists to prevent errors
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'User profile already exists');
  END IF;

  -- Generate Gravatar URL
  gravatar_url := 'https://www.gravatar.com/avatar/' || md5(lower(trim(user_email))) || '?s=200&d=identicon';

  -- Insert new user profile
  -- The username defaults to the email. The user will be forced to change it.
  -- The is_profile_complete flag defaults to false via the table schema.
  INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
  VALUES (user_id, user_email, '', gravatar_url);

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile created successfully',
    'user_id', user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "service_role";

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_user_created_webhook(jsonb) IS 'Webhook function to handle user profile creation, including generating a default Gravatar avatar. The is_profile_complete flag is explicitly set to false.';