-- Create user_collections table
CREATE TABLE IF NOT EXISTS public.user_collections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES public.card_snapshots(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_notes TEXT,
    CONSTRAINT uq_user_snapshot_collection UNIQUE(user_id, snapshot_id)
);

-- Indexes for user_collections
CREATE INDEX IF NOT EXISTS idx_u_collections_snapshot_id ON public.user_collections(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_u_collections_user_id ON public.user_collections(user_id);

COMMENT ON TABLE public.user_collections IS 'Allows users to curate collections of card_snapshots.';