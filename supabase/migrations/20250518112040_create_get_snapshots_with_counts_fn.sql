-- Function to get snapshots for a symbol and card type, including their social counts
CREATE OR REPLACE FUNCTION public.get_snapshots_with_counts(target_symbol TEXT, target_card_type TEXT)
RETURNS TABLE(
    id UUID,
    card_type TEXT,
    symbol TEXT,
    company_name TEXT,
    logo_url TEXT,
    card_data_snapshot JSONB,
    rarity_level TEXT,
    rarity_reason TEXT,
    first_seen_at TIMESTAMPTZ,
    like_count BIGINT,
    comment_count BIGINT,
    collection_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.card_type,
        cs.symbol,
        cs.company_name,
        cs.logo_url,
        cs.card_data_snapshot,
        cs.rarity_level,
        cs.rarity_reason,
        cs.first_seen_at,
        (SELECT COUNT(*) FROM public.snapshot_likes sl WHERE sl.snapshot_id = cs.id) AS like_count,
        (SELECT COUNT(*) FROM public.snapshot_comments sc WHERE sc.snapshot_id = cs.id) AS comment_count,
        (SELECT COUNT(*) FROM public.user_collections uc WHERE uc.snapshot_id = cs.id) AS collection_count
    FROM
        public.card_snapshots cs
    WHERE
        cs.symbol = target_symbol AND cs.card_type = target_card_type
    ORDER BY
        cs.first_seen_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_snapshots_with_counts(TEXT, TEXT) IS 'Retrieves card snapshots for a given symbol and card type, along with their social interaction counts.';