-- Function to get social counts for a given snapshot_id
CREATE OR REPLACE FUNCTION public.get_snapshot_social_counts(p_snapshot_id UUID)
RETURNS TABLE (
  like_count BIGINT,
  comment_count BIGINT,
  collection_count BIGINT
)
STABLE
LANGUAGE SQL
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.snapshot_likes WHERE snapshot_id = p_snapshot_id) AS like_count,
    (SELECT COUNT(*) FROM public.snapshot_comments WHERE snapshot_id = p_snapshot_id) AS comment_count,
    (SELECT COUNT(*) FROM public.user_collections WHERE snapshot_id = p_snapshot_id) AS collection_count;
$$;

COMMENT ON FUNCTION public.get_snapshot_social_counts(UUID) IS 'Retrieves like, comment, and collection counts for a specific card snapshot.';