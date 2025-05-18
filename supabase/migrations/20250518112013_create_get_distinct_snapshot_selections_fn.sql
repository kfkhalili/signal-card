-- Function to get distinct symbols and their available card types from snapshots
CREATE OR REPLACE FUNCTION public.get_distinct_snapshot_selections()
RETURNS TABLE(symbol TEXT, card_types TEXT[])
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.symbol,
    array_agg(DISTINCT cs.card_type ORDER BY cs.card_type) AS card_types
  FROM
    public.card_snapshots cs
  GROUP BY
    cs.symbol
  ORDER BY
    cs.symbol;
END;
$$;

COMMENT ON FUNCTION public.get_distinct_snapshot_selections IS 'Returns distinct symbols and their associated card_types from card_snapshots for history selection.';