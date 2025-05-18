-- Create card_snapshots table
CREATE TABLE IF NOT EXISTS public.card_snapshots (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    state_hash TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    company_name TEXT,
    logo_url TEXT,
    card_type TEXT NOT NULL,
    card_data_snapshot JSONB NOT NULL,
    rarity_level TEXT,
    rarity_reason TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT fk_cs_symbol FOREIGN KEY(symbol) REFERENCES public.profiles(symbol) ON DELETE CASCADE -- Assuming snapshots always relate to a profile
    -- If a snapshot can exist for a symbol not yet in profiles, remove the FK or make profiles.symbol nullable on insert and update later.
    -- Your ERD implies card_snapshots }o--|| profiles : "relates to", suggesting an optional or direct link.
);

-- Indexes for card_snapshots
CREATE INDEX IF NOT EXISTS idx_cs_symbol_type ON public.card_snapshots(symbol, card_type);
CREATE INDEX IF NOT EXISTS idx_cs_state_hash ON public.card_snapshots(state_hash);
CREATE INDEX IF NOT EXISTS idx_cs_symbol_first_seen ON public.card_snapshots(symbol, first_seen_at DESC);


COMMENT ON TABLE public.card_snapshots IS 'Stores immutable snapshots of card states, crucial for history and sharing.';
COMMENT ON COLUMN public.card_snapshots.state_hash IS 'MD5 hash of the card state for uniqueness.';