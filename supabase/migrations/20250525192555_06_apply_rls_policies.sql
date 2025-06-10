-- exchange_market_status policies
DROP POLICY IF EXISTS "Allow public read-only access to exchange market status" ON "public"."exchange_market_status";
CREATE POLICY "Allow public read-only access to exchange market status" ON "public"."exchange_market_status" FOR SELECT USING (true);

-- live_quote_indicators policies
DROP POLICY IF EXISTS "Allow public read-only access to live quotes" ON "public"."live_quote_indicators";
CREATE POLICY "Allow public read-only access to live quotes" ON "public"."live_quote_indicators" FOR SELECT USING (true);

-- user_profiles policies
DROP POLICY IF EXISTS "Allow public read access to user profiles" ON "public"."user_profiles";
CREATE POLICY "Allow public read access to user profiles" ON "public"."user_profiles" FOR SELECT USING (true);
-- WARNING: This makes all user profiles public.

DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."user_profiles";
CREATE POLICY "Users can view their own profile" ON "public"."user_profiles"
FOR SELECT USING (auth.uid() = id);
-- REVIEW: If "Allow public read access to user profiles" is active, this policy might be overshadowed for SELECT.
-- Decide which SELECT behavior you want for user_profiles. Typically, it's one or the other, or more specific role-based access.

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."user_profiles";
CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));
-- REVIEW: You have two very similar UPDATE policies for user_profiles. Consolidate to one.

-- profiles policies
DROP POLICY IF EXISTS "Allow public read-only access to profiles" ON "public"."profiles";
CREATE POLICY "Allow public read-only access to profiles" ON "public"."profiles" FOR SELECT USING (true);

-- Enable RLS on tables (these are idempotent)
ALTER TABLE "public"."exchange_market_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."live_quote_indicators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;