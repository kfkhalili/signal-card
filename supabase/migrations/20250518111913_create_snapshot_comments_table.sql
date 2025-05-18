-- Create snapshot_comments table
CREATE TABLE IF NOT EXISTS public.snapshot_comments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES public.card_snapshots(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.snapshot_comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL CHECK (char_length(comment_text) > 0 AND char_length(comment_text) <= 1000),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger for snapshot_comments.updated_at
CREATE TRIGGER handle_snapshot_comments_updated_at
BEFORE UPDATE ON public.snapshot_comments
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime (updated_at);

-- Indexes for snapshot_comments
CREATE INDEX IF NOT EXISTS idx_s_comments_snapshot_id ON public.snapshot_comments(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_s_comments_user_id ON public.snapshot_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_s_comments_parent_id ON public.snapshot_comments(parent_comment_id);

COMMENT ON TABLE public.snapshot_comments IS 'Threaded comments on card_snapshots.';