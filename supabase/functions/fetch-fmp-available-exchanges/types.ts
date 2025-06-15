// supabase/functions/fetch-fmp-available-exchanges/types.ts

export interface FmpAvailableExchangeData {
  exchange: string;
  name: string | null;
  countryName: string | null;
  countryCode: string | null;
  symbolSuffix: string | null;
  delay: string | null;
}

export interface SupabaseAvailableExchangeRecord {
  exchange: string;
  name: string | null;
  country_name: string | null;
  country_code: string | null;
  symbol_suffix: string | null;
  delay: string | null;
}

export interface FunctionResponse {
  message: string;
  upsertedCount?: number;
}
