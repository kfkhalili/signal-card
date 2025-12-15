// supabase/functions/fetch-exchange-rates/types.ts

export interface ExchangeRateApiResponse {
    result: string;
    base_code: string;
    rates: Record<string, number>;
    time_last_update_unix: number;
  }

  export interface SupabaseExchangeRateRecord {
    base_code: string;
    target_code: string;
    rate: number;
    last_updated_at: string;
  }

  export interface FunctionResponse {
    message: string;
    upsertedCount?: number;
  }