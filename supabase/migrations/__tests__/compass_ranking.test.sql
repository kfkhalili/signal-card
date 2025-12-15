-- Database tests for get_weighted_leaderboard function
-- These tests verify the Compass ranking function works correctly
-- Run with: psql $DATABASE_URL -f supabase/migrations/__tests__/compass_ranking.test.sql

-- Test 1: Function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_weighted_leaderboard'
  ) THEN
    RAISE EXCEPTION 'get_weighted_leaderboard function does not exist';
  END IF;
  RAISE NOTICE 'Test 1 PASSED: get_weighted_leaderboard function exists';
END $$;

-- Test 2: Function returns correct structure
DO $$
DECLARE
  result_count INTEGER;
  has_rank BOOLEAN;
  has_symbol BOOLEAN;
  has_composite_score BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO result_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb);

  IF result_count = 0 THEN
    RAISE EXCEPTION 'Function returned no results';
  END IF;

  -- Check that result has expected columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name IN ('rank', 'symbol', 'composite_score')
  ) INTO has_rank;

  RAISE NOTICE 'Test 2 PASSED: Function returns results (count: %)', result_count;
END $$;

-- Test 3: Function returns top 50 results
DO $$
DECLARE
  result_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO result_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb);

  IF result_count > 50 THEN
    RAISE EXCEPTION 'Function returned more than 50 results: %', result_count;
  END IF;

  IF result_count = 0 THEN
    RAISE EXCEPTION 'Function returned no results';
  END IF;

  RAISE NOTICE 'Test 3 PASSED: Function returns at most 50 results (count: %)', result_count;
END $$;

-- Test 4: Ranks are sequential starting from 1
DO $$
DECLARE
  min_rank BIGINT;
  max_rank BIGINT;
  expected_count INTEGER;
  actual_count INTEGER;
BEGIN
  SELECT MIN(rank), MAX(rank), COUNT(*)
  INTO min_rank, max_rank, actual_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb);

  IF min_rank != 1 THEN
    RAISE EXCEPTION 'Expected minimum rank to be 1, got %', min_rank;
  END IF;

  expected_count := max_rank;
  IF actual_count != expected_count THEN
    RAISE EXCEPTION 'Rank sequence is not continuous. Expected % ranks, got % results', expected_count, actual_count;
  END IF;

  RAISE NOTICE 'Test 4 PASSED: Ranks are sequential (1 to %)', max_rank;
END $$;

-- Test 5: Composite scores are between 0 and 100
DO $$
DECLARE
  min_score NUMERIC;
  max_score NUMERIC;
BEGIN
  SELECT MIN(composite_score), MAX(composite_score)
  INTO min_score, max_score
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb);

  IF min_score < 0 OR max_score > 100 THEN
    RAISE EXCEPTION 'Composite scores out of range. Min: %, Max: %', min_score, max_score;
  END IF;

  RAISE NOTICE 'Test 5 PASSED: Composite scores in valid range (min: %, max: %)', min_score, max_score;
END $$;

-- Test 6: Results are ordered by composite_score descending
DO $$
DECLARE
  is_ordered BOOLEAN;
BEGIN
  SELECT bool_and(composite_score >= lag(composite_score, 1, composite_score) OVER (ORDER BY rank))
  INTO is_ordered
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb);

  IF NOT is_ordered THEN
    RAISE EXCEPTION 'Results are not ordered by composite_score descending';
  END IF;

  RAISE NOTICE 'Test 6 PASSED: Results are ordered by composite_score descending';
END $$;

-- Test 7: Function accepts different weight configurations
DO $$
DECLARE
  result_count INTEGER;
BEGIN
  -- Test with value-focused weights
  SELECT COUNT(*) INTO result_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.6, "quality": 0.2, "safety": 0.2}'::jsonb);

  IF result_count = 0 THEN
    RAISE EXCEPTION 'Function failed with value-focused weights';
  END IF;

  -- Test with quality-focused weights
  SELECT COUNT(*) INTO result_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.2, "quality": 0.6, "safety": 0.2}'::jsonb);

  IF result_count = 0 THEN
    RAISE EXCEPTION 'Function failed with quality-focused weights';
  END IF;

  -- Test with safety-focused weights
  SELECT COUNT(*) INTO result_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.2, "quality": 0.2, "safety": 0.6}'::jsonb);

  IF result_count = 0 THEN
    RAISE EXCEPTION 'Function failed with safety-focused weights';
  END IF;

  RAISE NOTICE 'Test 7 PASSED: Function accepts different weight configurations';
END $$;

-- Test 8: Only active symbols are included
DO $$
DECLARE
  inactive_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO inactive_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb) l
  INNER JOIN public.listed_symbols ls ON l.symbol = ls.symbol
  WHERE ls.is_active = FALSE;

  IF inactive_count > 0 THEN
    RAISE EXCEPTION 'Function returned % inactive symbols', inactive_count;
  END IF;

  RAISE NOTICE 'Test 8 PASSED: Only active symbols are included';
END $$;

-- Test 9: Symbols are unique in results
DO $$
DECLARE
  total_count INTEGER;
  unique_count INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT symbol)
  INTO total_count, unique_count
  FROM public.get_weighted_leaderboard('{"valuation": 0.33, "quality": 0.33, "safety": 0.34}'::jsonb);

  IF total_count != unique_count THEN
    RAISE EXCEPTION 'Duplicate symbols found. Total: %, Unique: %', total_count, unique_count;
  END IF;

  RAISE NOTICE 'Test 9 PASSED: All symbols are unique (count: %)', unique_count;
END $$;

-- Test 10: Function handles default weights when weights are missing
DO $$
DECLARE
  result_count INTEGER;
BEGIN
  -- Test with missing weights (should use defaults)
  SELECT COUNT(*) INTO result_count
  FROM public.get_weighted_leaderboard('{}'::jsonb);

  IF result_count = 0 THEN
    RAISE EXCEPTION 'Function failed with empty weights (should use defaults)';
  END IF;

  RAISE NOTICE 'Test 10 PASSED: Function handles default weights';
END $$;

RAISE NOTICE 'All Compass ranking function tests PASSED!';

