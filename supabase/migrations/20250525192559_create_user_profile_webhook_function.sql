-- Create a function that can be called by a webhook to handle user profile creation
-- This function will be called when a new user is created via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_user_created_webhook(user_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  user_id uuid;
  user_email text;
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

  -- Insert new user profile
  INSERT INTO public.user_profiles (id, username)
  VALUES (user_id, user_email);

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile created successfully',
    'user_id', user_id,
    'username', user_email
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

-- Grant permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.handle_user_created_webhook(jsonb) TO "service_role";

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_user_created_webhook(jsonb) IS 'Webhook function to handle user profile creation when a new user signs up.';