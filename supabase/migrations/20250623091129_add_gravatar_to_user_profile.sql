-- Add pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update the function to include Gravatar URL generation
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
  result jsonb;
BEGIN
  -- Extract user data from the webhook payload
  user_id := (user_data->>'id')::uuid;
  user_email := user_data->>'email';

  -- Check if user profile already exists
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User profile already exists',
      'user_id', user_id
    );
  END IF;

  -- Generate Gravatar URL
  gravatar_url := 'https://www.gravatar.com/avatar/' || md5(lower(trim(user_email))) || '?s=200&d=identicon';

  -- Insert new user profile with Gravatar URL
  INSERT INTO public.user_profiles (id, username, avatar_url)
  VALUES (user_id, user_email, gravatar_url);

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile created successfully',
    'user_id', user_id,
    'username', user_email,
    'avatar_url', gravatar_url
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id
    );
END;
$$;

-- Grant permissions to the function (re-applying grants is good practice)
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "service_role";

-- Update comment for documentation
COMMENT ON FUNCTION public.handle_user_created_webhook(jsonb) IS 'Webhook function to handle user profile creation, including generating a default Gravatar avatar.';