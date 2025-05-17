CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Drop table if it exists (optional, for testing)
-- DROP TABLE IF EXISTS public.profiles;

-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    -- Primary Key: Use UUID, common practice in Supabase/Postgres
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core identifier: Still essential, make it unique and indexed
    symbol              TEXT NOT NULL UNIQUE,

    -- Profile Data Fields (Adjust types based on precision needs if necessary)
    price               DOUBLE PRECISION, -- Suitable for floating-point financial values
    market_cap          BIGINT,
    beta                DOUBLE PRECISION,
    last_dividend       DOUBLE PRECISION, -- Or NUMERIC if exact decimal math is critical
    range               TEXT,
    change              DOUBLE PRECISION,
    change_percentage   DOUBLE PRECISION,
    volume              BIGINT,
    average_volume      BIGINT,
    company_name        TEXT,
    currency            VARCHAR(3), -- Constrain currency code length
    cik                 TEXT,
    isin                TEXT,
    cusip               TEXT,
    exchange_full_name  TEXT,
    exchange            TEXT,
    industry            TEXT,
    website             TEXT,
    description         TEXT,
    ceo                 TEXT,
    sector              TEXT,
    country             VARCHAR(2), -- Constrain country code length
    full_time_employees BIGINT, -- Store the parsed number
    phone               TEXT,
    address             TEXT,
    city                TEXT,
    state               TEXT, -- Use TEXT unless you have strict state code validation
    zip                 TEXT, -- Use TEXT for flexibility with international codes
    image               TEXT, -- URL stored as text
    ipo_date            DATE, -- Date without time is appropriate

    -- Boolean Flags (with defaults for clarity)
    default_image       BOOLEAN DEFAULT false,
    is_etf              BOOLEAN DEFAULT false,
    is_actively_trading BOOLEAN DEFAULT true,
    is_adr              BOOLEAN DEFAULT false,
    is_fund             BOOLEAN DEFAULT false,

    -- Timestamps (Use TIMESTAMPTZ for time zone support)
    -- created_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- Optional: If you want creation time tracking
    modified_at         TIMESTAMPTZ NOT NULL DEFAULT now() -- Tracks last DB modification
);

-- Add comments to clarify column purposes
COMMENT ON TABLE public.profiles IS 'Stores company profile information fetched from FMP API.';
COMMENT ON COLUMN public.profiles.id IS 'Unique identifier for the profile record (UUID).';
COMMENT ON COLUMN public.profiles.symbol IS 'Company stock ticker symbol (must be unique).';
COMMENT ON COLUMN public.profiles.modified_at IS 'Timestamp of the last modification in this database.';
COMMENT ON COLUMN public.profiles.full_time_employees IS 'Number of full-time employees (parsed from source).';

-- Ensure index exists on modified_at for efficient cache checking queries
CREATE INDEX IF NOT EXISTS idx_profiles_modified_at ON public.profiles(modified_at DESC);

-- Trigger to automatically update modified_at timestamp on row update
-- This ensures your cache logic works correctly based on DB changes.
CREATE OR REPLACE TRIGGER handle_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION moddatetime('modified_at'); -- Uses the moddatetime extension

-- Optional: Grant permissions if not handled by default Supabase roles/policies
-- Example: Allow authenticated users to read profiles (adjust based on your RLS)
-- GRANT SELECT ON TABLE public.profiles TO authenticated;
-- Example: Allow service_role (used by your admin client) to do everything
-- GRANT ALL ON TABLE public.profiles TO service_role;