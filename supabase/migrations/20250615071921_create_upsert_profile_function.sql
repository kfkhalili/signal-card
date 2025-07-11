-- supabase/migrations/20250615102000_create_upsert_profile_function.sql

CREATE OR REPLACE FUNCTION public.upsert_profile(profile_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to run with the permissions of the definer
AS $$
BEGIN
  INSERT INTO public.profiles (
    symbol,
    price,
    beta,
    average_volume,
    market_cap,
    last_dividend,
    range,
    change,
    change_percentage,
    company_name,
    display_company_name, -- Set on initial insert
    currency,
    cik,
    isin,
    cusip,
    exchange,
    exchange_full_name,
    industry,
    website,
    description,
    ceo,
    sector,
    country,
    full_time_employees,
    phone,
    address,
    city,
    state,
    zip,
    image,
    ipo_date,
    default_image,
    is_etf,
    is_actively_trading,
    is_adr,
    is_fund,
    volume
  )
  VALUES (
    profile_data->>'symbol',
    (profile_data->>'price')::double precision,
    (profile_data->>'beta')::double precision,
    (profile_data->>'average_volume')::bigint,
    (profile_data->>'market_cap')::bigint,
    (profile_data->>'last_dividend')::double precision,
    profile_data->>'range',
    (profile_data->>'change')::double precision,
    (profile_data->>'change_percentage')::double precision,
    profile_data->>'company_name',
    profile_data->>'company_name', -- Default display_company_name to company_name
    profile_data->>'currency',
    profile_data->>'cik',
    profile_data->>'isin',
    profile_data->>'cusip',
    profile_data->>'exchange',
    profile_data->>'exchange_full_name',
    profile_data->>'industry',
    profile_data->>'website',
    profile_data->>'description',
    profile_data->>'ceo',
    profile_data->>'sector',
    profile_data->>'country',
    (profile_data->>'full_time_employees')::bigint,
    profile_data->>'phone',
    profile_data->>'address',
    profile_data->>'city',
    profile_data->>'state',
    profile_data->>'zip',
    profile_data->>'image',
    (profile_data->>'ipo_date')::date,
    (profile_data->>'default_image')::boolean,
    (profile_data->>'is_etf')::boolean,
    (profile_data->>'is_actively_trading')::boolean,
    (profile_data->>'is_adr')::boolean,
    (profile_data->>'is_fund')::boolean,
    (profile_data->>'volume')::bigint
  )
  ON CONFLICT (symbol) DO UPDATE
  SET
    price = EXCLUDED.price,
    beta = EXCLUDED.beta,
    average_volume = EXCLUDED.average_volume,
    market_cap = EXCLUDED.market_cap,
    last_dividend = EXCLUDED.last_dividend,
    range = EXCLUDED.range,
    change = EXCLUDED.change,
    change_percentage = EXCLUDED.change_percentage,
    company_name = EXCLUDED.company_name,
    -- NOTE: display_company_name is intentionally omitted from the UPDATE
    currency = EXCLUDED.currency,
    cik = EXCLUDED.cik,
    isin = EXCLUDED.isin,
    cusip = EXCLUDED.cusip,
    exchange = EXCLUDED.exchange,
    exchange_full_name = EXCLUDED.exchange_full_name,
    industry = EXCLUDED.industry,
    website = EXCLUDED.website,
    description = EXCLUDED.description,
    ceo = EXCLUDED.ceo,
    sector = EXCLUDED.sector,
    country = EXCLUDED.country,
    full_time_employees = EXCLUDED.full_time_employees,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip = EXCLUDED.zip,
    image = EXCLUDED.image,
    ipo_date = EXCLUDED.ipo_date,
    default_image = EXCLUDED.default_image,
    is_etf = EXCLUDED.is_etf,
    is_actively_trading = EXCLUDED.is_actively_trading,
    is_adr = EXCLUDED.is_adr,
    is_fund = EXCLUDED.is_fund,
    volume = EXCLUDED.volume,
    modified_at = NOW();
END;
$$;