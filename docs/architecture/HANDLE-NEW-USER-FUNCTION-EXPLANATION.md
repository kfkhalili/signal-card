# `handle-new-user` Edge Function - How It Works

## Overview

The `handle-new-user` Edge Function is designed to automatically create user profiles when new users sign up via Supabase Auth. It's configured as a **webhook** that Supabase Auth calls when a user is created.

---

## Architecture

### Components

1. **Edge Function**: `handle-new-user` (Deno/TypeScript)
   - **Location**: `supabase/functions/handle-new-user/index.ts`
   - **Status**: ✅ ACTIVE (version 8)
   - **JWT Verification**: ✅ Enabled (`verify_jwt = true`)
   - **Purpose**: Receives webhook payload from Supabase Auth and calls database function

2. **Database Function**: `handle_user_created_webhook(user_data jsonb)`
   - **Location**: Created in migration `20250525192559_create_user_profile_webhook_function.sql`
   - **Security**: `SECURITY DEFINER` (runs with function creator's privileges)
   - **Purpose**: Creates user profile with Gravatar avatar and default settings

3. **Table**: `user_profiles`
   - **Location**: Created in migration `20250525192551_02_create_user_profiles_and_auth_triggers.sql`
   - **Purpose**: Stores extended user profile data (username, full_name, avatar_url, is_profile_complete)

---

## Flow

### Step 1: User Signs Up
- User signs up via Supabase Auth (email/password, OAuth, etc.)
- Supabase Auth creates a record in `auth.users` table

### Step 2: Webhook Triggered
- Supabase Auth automatically sends a POST request to the webhook URL
- **Webhook URL**: `https://[project-ref].supabase.co/functions/v1/handle-new-user`
- **Payload Format**:
  ```json
  {
    "type": "INSERT",
    "record": {
      "id": "uuid",
      "email": "user@example.com",
      ...
    }
  }
  ```

### Step 3: Edge Function Processing
1. **CORS Preflight**: Handles OPTIONS requests
2. **Authentication**: Uses `ensureCronAuth()` to verify `Authorization: Bearer [ANON_KEY]` header
3. **Extract Data**: Parses `{ type, record }` from request body
4. **Validate**: Only processes `type === "INSERT"` events
5. **Call Database Function**: Invokes `handle_user_created_webhook(user_data)` via RPC

### Step 4: Database Function Execution
1. **Extract User Data**: Gets `id` and `email` from JSONB payload
2. **Check Existence**: Prevents duplicate profile creation
3. **Generate Gravatar**: Creates Gravatar URL from email hash
4. **Insert Profile**: Creates record in `user_profiles` table with:
   - `id`: User UUID (links to `auth.users.id`)
   - `username`: Email address (user must change later)
   - `full_name`: Empty string
   - `avatar_url`: Generated Gravatar URL
   - `is_profile_complete`: `false` (default)
5. **Return Result**: JSONB response with success/error

### Step 5: Response
- Edge Function returns HTTP 200 with `{ success: true }` or HTTP 500 with error details

---

## Configuration

### Required Setup

**⚠️ CRITICAL**: This function must be configured as a webhook in the Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Authentication** → **Webhooks**
2. Click **Add Webhook** or **Edit** existing webhook
3. **Webhook URL**: `https://[your-project-ref].supabase.co/functions/v1/handle-new-user`
4. **HTTP Method**: POST
5. **Events**: Select **User Created** (or **auth.users INSERT**)
6. **HTTP Headers**:
   ```
   Authorization: Bearer [YOUR_ANON_KEY]
   Content-Type: application/json
   ```

### Environment Variables

The Edge Function requires these secrets (configured in Supabase Dashboard → Edge Functions → Secrets):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `SUPABASE_ANON_KEY`: Anonymous key for webhook authentication (used by `ensureCronAuth`)

---

## Current Status

### ✅ What's Working
- Edge Function is **deployed and ACTIVE** (version 8)
- Database function `handle_user_created_webhook` exists and has proper GRANTs
- `user_profiles` table exists with all required columns
- RLS policies allow service role to create profiles

### ⚠️ Potential Issues
- **No logs found**: Edge Function logs show no recent invocations of `handle-new-user`
- **Not in config.toml**: Function exists but isn't listed in `supabase/config.toml` (may be configured via Dashboard only)
- **Webhook may not be configured**: If webhook isn't set up in Dashboard, function won't be called automatically

---

## Verification

### Check if Webhook is Configured
1. Go to Supabase Dashboard → Authentication → Webhooks
2. Verify webhook URL points to `handle-new-user` function
3. Check that "User Created" event is selected

### Test the Function
You can manually test the function by calling it directly:

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/handle-new-user \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "record": {
      "id": "test-uuid-here",
      "email": "test@example.com"
    }
  }'
```

### Check Recent User Profiles
```sql
SELECT
  id,
  username,
  is_profile_complete,
  updated_at
FROM public.user_profiles
ORDER BY updated_at DESC
LIMIT 10;
```

---

## Why Not Database Triggers?

The migration comments explain:
> "The old trigger-based approach (handle_new_user) was removed due to signup failures"

**Database triggers** on `auth.users` can cause issues because:
- They run synchronously during signup, potentially blocking the auth flow
- If the trigger fails, the entire signup fails
- Harder to debug and retry

**Webhook approach** is better because:
- Runs asynchronously (doesn't block signup)
- Can be retried if it fails
- Easier to monitor via logs
- Can be disabled/enabled without database changes

---

## Security

- **JWT Verification**: Function requires valid JWT token (`verify_jwt = true`)
- **Authorization Check**: Uses `ensureCronAuth()` to verify `Authorization: Bearer [ANON_KEY]` header
- **Service Role**: Database function uses `SECURITY DEFINER` to bypass RLS for profile creation
- **RLS Policies**: Allow service role to create profiles, users can only read/update their own

---

## Troubleshooting

### Function Not Being Called
1. **Check Webhook Configuration**: Verify webhook is set up in Dashboard
2. **Check Logs**: Look for errors in Edge Function logs
3. **Check Auth Logs**: Verify user creation events are being generated
4. **Test Manually**: Use curl to test the function directly

### Profile Not Created
1. **Check Database Function**: Verify `handle_user_created_webhook` exists and has GRANTs
2. **Check RLS Policies**: Verify service role can insert into `user_profiles`
3. **Check Logs**: Look for errors in function execution
4. **Check Constraints**: Verify username uniqueness (if email already used as username)

---

## Related Files

- **Edge Function**: `supabase/functions/handle-new-user/index.ts`
- **Database Function**: `supabase/migrations/20250525192559_create_user_profile_webhook_function.sql`
- **Table Creation**: `supabase/migrations/20250525192551_02_create_user_profiles_and_auth_triggers.sql`
- **Auth Helper**: `supabase/functions/_shared/auth.ts`

