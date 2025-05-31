// supabase/functions/fetch-fmp-dividend-history/types.ts

export interface FmpDividendData {
  symbol: string;
  date: string; // "YYYY-MM-DD" - Effective date
  recordDate: string | null; // "YYYY-MM-DD"
  paymentDate: string | null; // "YYYY-MM-DD"
  declarationDate: string | null; // "YYYY-MM-DD"
  adjDividend: number | null;
  dividend: number | null;
  yield?: number | null; // Optional as per FMP docs, though your example shows it
  frequency?: string | null; // Optional
}

export interface SupabaseDividendRecord {
  symbol: string;
  date: string; // PK part 1, from FmpDividendData.date
  record_date: string | null;
  payment_date: string | null;
  declaration_date: string | null;
  adj_dividend: number | null;
  dividend: number | null;
  yield: number | null;
  frequency: string | null;
  // fetched_at and updated_at are handled by DB
}

export interface SupportedSymbol {
  symbol: string;
  // last_processed_dividends_at?: string | null; // Optional for more granular processing
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
  totalDividendsFetched: number;
  totalDividendsUpserted: number;
}
