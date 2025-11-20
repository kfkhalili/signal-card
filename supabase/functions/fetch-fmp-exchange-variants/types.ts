// supabase/functions/fetch-fmp-exchange-variants/types.ts

export interface FmpExchangeVariantData {
  symbol: string;
  price: number | null;
  beta: number | null;
  volAvg: number | null;
  mktCap: number | null;
  lastDiv: number | null;
  range: string | null;
  changes: number | null;
  currency: string | null;
  cik: string | null;
  isin: string | null;
  cusip: string | null;
  exchange: string | null;
  exchangeShortName: string;
  dcfDiff: number | null;
  dcf: number | null;
  image: string | null;
  ipoDate: string | null;
  defaultImage: boolean | null;
  isActivelyTrading: boolean | null;
  // Common fields are intentionally omitted
}

export interface SupabaseExchangeVariantRecord {
  base_symbol: string;
  variant_symbol: string;
  exchange_short_name: string;
  price: number | null;
  beta: number | null;
  vol_avg: number | null;
  mkt_cap: number | null;
  last_div: number | null;
  range: string | null;
  changes: number | null;
  currency: string | null;
  cik: string | null;
  isin: string | null;
  cusip: string | null;
  exchange: string | null;
  dcf_diff: number | null;
  dcf: number | null;
  image: string | null;
  ipo_date: string | null;
  default_image: boolean | null;
  is_actively_trading: boolean | null;
  fetched_at?: string; // Optional for sentinel records
}

export interface SupportedSymbol {
  symbol: string;
}

export interface SymbolProcessingResult {
  symbol: string;
  success: boolean;
  message: string;
  fetchedCount: number;
  upsertedCount: number;
}

export interface FunctionResponse {
  message: string;
  details: SymbolProcessingResult[];
  totalSymbolsProcessed: number;
  totalVariantsFetched: number;
  totalVariantsUpserted: number;
}
