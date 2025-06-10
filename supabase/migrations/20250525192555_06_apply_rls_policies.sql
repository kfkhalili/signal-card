-- exchange_market_status policies
DROP POLICY IF EXISTS "Allow public read-only access to exchange market status" ON "public"."exchange_market_status";
CREATE POLICY "Allow public read-only access to exchange market status" ON "public"."exchange_market_status" FOR SELECT USING (true);

-- live_quote_indicators policies
DROP POLICY IF EXISTS "Allow public read-only access to live quotes" ON "public"."live_quote_indicators";
CREATE POLICY "Allow public read-only access to live quotes" ON "public"."live_quote_indicators" FOR SELECT USING (true);

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."user_profiles";
CREATE POLICY "Users can view their own profile" ON "public"."user_profiles"
FOR SELECT USING ((select auth.uid()) = "id");

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to insert their own profile" ON "public"."user_profiles"
FOR INSERT
WITH CHECK (("id" = (select auth.uid())));

DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."user_profiles";
CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles"
FOR UPDATE
USING ("id" = (select auth.uid()));

-- profiles policies
DROP POLICY IF EXISTS "Allow public read-only access to profiles" ON "public"."profiles";
CREATE POLICY "Allow public read-only access to profiles" ON "public"."profiles" FOR SELECT USING (true);

-- Enable RLS on tables (these are idempotent)
ALTER TABLE "public"."exchange_market_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."live_quote_indicators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;