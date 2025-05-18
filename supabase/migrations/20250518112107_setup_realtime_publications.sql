-- supabase/migrations/20250518112107_setup_realtime_publications.sql

DO $$
BEGIN
    -- Ensure the supabase_realtime publication exists (Supabase usually creates this)
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete');
    END IF;

    -- Add live_quote_indicators if not already a member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_quote_indicators'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_quote_indicators;
        RAISE NOTICE 'Table public.live_quote_indicators added to publication supabase_realtime.';
    ELSE
        RAISE NOTICE 'Table public.live_quote_indicators is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;

    -- Add profiles if not already a member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        RAISE NOTICE 'Table public.profiles added to publication supabase_realtime.';
    ELSE
        RAISE NOTICE 'Table public.profiles is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;

    -- Add exchange_market_status if not already a member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'exchange_market_status'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.exchange_market_status;
        RAISE NOTICE 'Table public.exchange_market_status added to publication supabase_realtime.';
    ELSE
        RAISE NOTICE 'Table public.exchange_market_status is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;

    -- Add other tables if needed for realtime
    -- e.g., for live comment/like counts if you implement that UI feature
    -- IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'snapshot_comments') THEN
    --     ALTER PUBLICATION supabase_realtime ADD TABLE public.snapshot_comments;
    -- END IF;
    -- IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'snapshot_likes') THEN
    --     ALTER PUBLICATION supabase_realtime ADD TABLE public.snapshot_likes;
    -- END IF;

END $$;

-- Set REPLICA IDENTITY for tables in the publication.
-- This is idempotent; running it multiple times is fine.
ALTER TABLE public.live_quote_indicators REPLICA IDENTITY DEFAULT;
ALTER TABLE public.profiles REPLICA IDENTITY DEFAULT;
ALTER TABLE public.exchange_market_status REPLICA IDENTITY DEFAULT; -- Add this
-- ALTER TABLE public.snapshot_comments REPLICA IDENTITY DEFAULT;
-- ALTER TABLE public.snapshot_likes REPLICA IDENTITY DEFAULT;

COMMENT ON PUBLICATION supabase_realtime IS 'Standard publication for Supabase Realtime. Add tables here to broadcast changes.';