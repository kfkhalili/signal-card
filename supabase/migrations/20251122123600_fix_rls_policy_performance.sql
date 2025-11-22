-- Fix RLS Policy Performance Issue
-- Optimizes user_profiles RLS policies to prevent re-evaluation of auth.uid() for each row
-- Addresses performance issue flagged by Supabase Advisor

-- Drop and recreate policies with optimized subquery pattern
-- CRITICAL: Use (select auth.uid()) instead of auth.uid() to prevent re-evaluation per row

DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."user_profiles";
CREATE POLICY "Users can view their own profile" ON "public"."user_profiles"
FOR SELECT USING (
  (select auth.uid()) = "id" OR
  (select current_setting('role', true)) = 'service_role'
);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to insert their own profile" ON "public"."user_profiles"
FOR INSERT
WITH CHECK (
  ("id" = (select auth.uid())) OR
  ((select current_setting('role', true)) = 'service_role')
);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles"
FOR UPDATE
USING (
  ("id" = (select auth.uid())) OR
  ((select current_setting('role', true)) = 'service_role')
)
WITH CHECK (
  ("id" = (select auth.uid())) OR
  ((select current_setting('role', true)) = 'service_role')
);

COMMENT ON POLICY "Users can view their own profile" ON "public"."user_profiles" IS 'Optimized RLS policy using subquery pattern to prevent re-evaluation of auth.uid() for each row. Improves query performance at scale.';
COMMENT ON POLICY "Allow users to insert their own profile" ON "public"."user_profiles" IS 'Optimized RLS policy using subquery pattern to prevent re-evaluation of auth.uid() for each row. Improves query performance at scale.';
COMMENT ON POLICY "Allow users to update their own profile" ON "public"."user_profiles" IS 'Optimized RLS policy using subquery pattern to prevent re-evaluation of auth.uid() for each row. Improves query performance at scale.';

