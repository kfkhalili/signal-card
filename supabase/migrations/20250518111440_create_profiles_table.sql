-- Create profiles table (company information)
CREATE TABLE IF NOT EXISTS public.profiles (
    symbol TEXT PRIMARY KEY,
    id UUID DEFAULT extensions.uuid_generate_v4() NOT NULL, -- Added NOT NULL & default based on ERD structure
    price DOUBLE PRECISION,
    market_cap BIGINT,
    beta DOUBLE PRECISION,
    last_dividend DOUBLE PRECISION,
    range TEXT, -- Consider if this should be two numeric fields (e.g., range_low, range_high)
    change DOUBLE PRECISION,
    change_percentage DOUBLE PRECISION,
    volume BIGINT,
    average_volume BIGINT,
    company_name TEXT,
    currency TEXT,
    cik TEXT,
    isin TEXT,
    cusip TEXT,
    exchange_full_name TEXT,
    exchange TEXT, -- Short exchange code
    industry TEXT,
    website TEXT,
    description TEXT,
    ceo TEXT,
    sector TEXT,
    country TEXT,
    full_time_employees BIGINT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    image TEXT, -- URL to company logo
    ipo_date DATE,
    default_image BOOLEAN DEFAULT FALSE,
    is_etf BOOLEAN DEFAULT FALSE,
    is_actively_trading BOOLEAN DEFAULT TRUE,
    is_adr BOOLEAN DEFAULT FALSE,
    is_fund BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    modified_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger for profiles.modified_at
CREATE TRIGGER handle_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime (modified_at);

COMMENT ON TABLE public.profiles IS 'Stores detailed static company information.';
COMMENT ON COLUMN public.profiles.symbol IS 'Stock ticker or financial instrument symbol. Primary Key.';