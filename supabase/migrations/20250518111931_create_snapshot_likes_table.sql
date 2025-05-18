-- Create snapshot_likes table
CREATE TABLE IF NOT EXISTS public.snapshot_likes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES public.card_snapshots(id) ON DELETE CASCADE,
    liked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_user_snapshot_like UNIQUE(user_id, snapshot_id)
);

-- Indexes for snapshot_likes
CREATE INDEX IF NOT EXISTS idx_s_likes_snapshot_id ON public.snapshot_likes(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_s_likes_user_id ON public.snapshot_likes(user_id);

COMMENT ON TABLE public.snapshot_likes IS 'User likes for card_snapshots.';