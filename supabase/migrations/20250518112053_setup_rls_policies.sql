-- Enable RLS for tables and define policies

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- No default insert policy for user_profiles as it's handled by the handle_new_user trigger.
-- No default delete policy for user_profiles unless specifically required.

-- card_snapshots (Assuming public read, but no direct user modification via API)
ALTER TABLE public.card_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to card snapshots" ON public.card_snapshots;
CREATE POLICY "Allow public read-only access to card snapshots" ON public.card_snapshots
  FOR SELECT USING (true);
-- Inserts into card_snapshots are likely handled by trusted server-side logic (e.g., Edge Function)

-- snapshot_comments
ALTER TABLE public.snapshot_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read access to comments" ON public.snapshot_comments;
CREATE POLICY "Allow authenticated read access to comments" ON public.snapshot_comments
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.snapshot_comments;
CREATE POLICY "Users can insert their own comments" ON public.snapshot_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own comments" ON public.snapshot_comments;
CREATE POLICY "Users can update their own comments" ON public.snapshot_comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.snapshot_comments;
CREATE POLICY "Users can delete their own comments" ON public.snapshot_comments
  FOR DELETE USING (auth.uid() = user_id);

-- snapshot_likes
ALTER TABLE public.snapshot_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read access to likes" ON public.snapshot_likes;
CREATE POLICY "Allow authenticated read access to likes" ON public.snapshot_likes
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.snapshot_likes;
CREATE POLICY "Users can insert their own likes" ON public.snapshot_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.snapshot_likes;
CREATE POLICY "Users can delete their own likes" ON public.snapshot_likes
  FOR DELETE USING (auth.uid() = user_id);

-- user_collections
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own collections" ON public.user_collections;
CREATE POLICY "Users can manage their own collections" ON public.user_collections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profiles, live_quote_indicators, exchange_market_status (Assuming public read, updates via trusted server)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to profiles" ON public.profiles;
CREATE POLICY "Allow public read-only access to profiles" ON public.profiles
  FOR SELECT USING (true);

ALTER TABLE public.live_quote_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to live quotes" ON public.live_quote_indicators;
CREATE POLICY "Allow public read-only access to live quotes" ON public.live_quote_indicators
  FOR SELECT USING (true);

ALTER TABLE public.exchange_market_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access to market status" ON public.exchange_market_status;
CREATE POLICY "Allow public read-only access to market status" ON public.exchange_market_status
  FOR SELECT USING (true);