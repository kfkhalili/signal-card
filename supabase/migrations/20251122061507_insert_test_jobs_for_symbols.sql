-- Insert test jobs into api_call_queue_v2 for 20 US/Canadian symbols
-- Purpose: Create pending jobs for all 8 data types for testing the queue system
-- Symbols: Mix of popular US and Canadian stocks

-- Get estimated_data_size_bytes from registry for each data type
-- Insert jobs for all 8 data types for each symbol

WITH symbol_list AS (
  SELECT unnest(ARRAY[
    'AAPL',   -- Apple (US)
    'MSFT',   -- Microsoft (US)
    'GOOGL',  -- Alphabet (US)
    'AMZN',   -- Amazon (US)
    'TSLA',   -- Tesla (US)
    'META',   -- Meta (US)
    'NVDA',   -- NVIDIA (US)
    'JPM',    -- JPMorgan Chase (US)
    'V',      -- Visa (US)
    'JNJ',    -- Johnson & Johnson (US)
    'WMT',    -- Walmart (US)
    'PG',     -- Procter & Gamble (US)
    'MA',     -- Mastercard (US)
    'DIS',    -- Disney (US)
    'BAC',    -- Bank of America (US)
    'RY',     -- Royal Bank of Canada (CA)
    'TD',     -- TD Bank (CA)
    'SHOP',   -- Shopify (CA)
    'CNQ',    -- Canadian Natural Resources (CA)
    'CP'      -- Canadian Pacific Railway (CA)
  ]) AS symbol
),
data_types AS (
  SELECT 
    data_type,
    estimated_data_size_bytes
  FROM public.data_type_registry_v2
  WHERE refresh_strategy = 'on-demand'
)
INSERT INTO public.api_call_queue_v2 (
  symbol,
  data_type,
  status,
  priority,
  estimated_data_size_bytes,
  created_at
)
SELECT 
  s.symbol,
  d.data_type,
  'pending' AS status,
  100 AS priority, -- Test priority (higher than background jobs)
  d.estimated_data_size_bytes,
  NOW() AS created_at
FROM symbol_list s
CROSS JOIN data_types d
WHERE NOT EXISTS (
  -- Don't create duplicate jobs if they already exist
  SELECT 1 
  FROM public.api_call_queue_v2 q
  WHERE q.symbol = s.symbol
    AND q.data_type = d.data_type
    AND q.status IN ('pending', 'processing')
)
ORDER BY s.symbol, d.data_type;

-- Summary: This migration inserts 20 symbols × 8 data types = 160 test jobs into the queue
-- All jobs are set to 'pending' status with priority 100 (higher than background jobs)
-- Jobs will be processed by the queue-processor-v2 Edge Function

