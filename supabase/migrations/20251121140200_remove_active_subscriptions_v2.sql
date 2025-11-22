-- Migration: Remove active_subscriptions_v2 table and related functions
-- MIGRATED: Subscriptions are now tracked via realtime.subscription (Supabase built-in)
-- No manual registration, heartbeat, or cleanup needed

-- Step 1: Drop the RPC function
DROP FUNCTION IF EXISTS public.upsert_active_subscription_v2(UUID, TEXT, TEXT);

-- Step 2: Check for any triggers that reference active_subscriptions_v2
-- (None should exist, but check to be safe)
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'active_subscriptions_v2'
  LOOP
    RAISE NOTICE 'Found trigger: % on table %', trigger_record.trigger_name, trigger_record.event_object_table;
  END LOOP;
END $$;

-- Step 3: Drop the table (CASCADE will drop dependent objects like indexes, constraints)
DROP TABLE IF EXISTS public.active_subscriptions_v2 CASCADE;

-- Step 4: Verify removal
DO $$
BEGIN
  -- Check if table still exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'active_subscriptions_v2'
  ) THEN
    RAISE EXCEPTION 'active_subscriptions_v2 table still exists after DROP';
  END IF;

  -- Check if function still exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'upsert_active_subscription_v2'
  ) THEN
    RAISE EXCEPTION 'upsert_active_subscription_v2 function still exists after DROP';
  END IF;

  RAISE NOTICE 'Successfully removed active_subscriptions_v2 table and upsert_active_subscription_v2 function';
END $$;

COMMENT ON SCHEMA public IS 'MIGRATED: active_subscriptions_v2 removed. Subscriptions now tracked via realtime.subscription (Supabase built-in).';

