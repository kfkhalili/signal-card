-- Add composite indexes for instant MAX() retrieval
-- This prevents the 2-minute statement timeout in the background scheduler
-- by allowing PostgreSQL to do an Index-Only scan to find the newest row instantly.

-- 1. Insider Transactions
CREATE INDEX IF NOT EXISTS idx_insider_transactions_symbol_fetched_at 
ON public.insider_transactions (symbol, fetched_at DESC);

-- 2. Insider Trading Statistics
CREATE INDEX IF NOT EXISTS idx_insider_trading_stats_symbol_fetched_at 
ON public.insider_trading_statistics (symbol, fetched_at DESC);

-- 3. Exchange Variants
CREATE INDEX IF NOT EXISTS idx_exchange_variants_symbol_fetched_at 
ON public.exchange_variants (symbol, fetched_at DESC);

-- 4. Valuations
CREATE INDEX IF NOT EXISTS idx_valuations_symbol_fetched_at 
ON public.valuations (symbol, fetched_at DESC);
