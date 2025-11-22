-- Populate existing sentinel records (exchange_short_name = 'N/A') with data from profiles table
-- This ensures sentinel records have real data and can render correctly on the card

UPDATE exchange_variants ev
SET
  price = p.price,
  beta = p.beta,
  vol_avg = p.average_volume,
  mkt_cap = p.market_cap,
  last_div = p.last_dividend,
  range = p.range,
  changes = p.change,
  currency = p.currency,
  cik = p.cik,
  isin = p.isin,
  cusip = p.cusip,
  exchange = p.exchange,
  image = p.image,
  ipo_date = p.ipo_date,
  default_image = p.default_image,
  is_actively_trading = COALESCE(p.is_actively_trading, true),
  exchange_short_name = COALESCE(p.exchange, 'N/A') -- Update to actual exchange if available
FROM profiles p
WHERE ev.symbol = p.symbol
  AND ev.symbol_variant = ev.symbol -- Only update sentinel records (where symbol_variant = symbol)
  AND ev.exchange_short_name = 'N/A' -- Only update old format sentinel records
  AND p.symbol IS NOT NULL;

COMMENT ON TABLE exchange_variants IS 'Stores exchange-specific variant data. Sentinel records (symbol_variant = symbol, exchange_short_name = exchange) are populated from profiles table when no variants exist.';

