// supabase/functions/fetch-fmp-grades-historical/types.ts

export interface FmpGradesHistoricalData {
  symbol: string;
  date: string; // "YYYY-MM-DD"
  analystRatingsStrongBuy: number | null;
  analystRatingsBuy: number | null;
  analystRatingsHold: number | null;
  analystRatingsSell: number | null;
  analystRatingsStrongSell: number | null;
}

export interface SupabaseGradesHistoricalRecord {
  symbol: string;
  date: string;
  analyst_ratings_strong_buy: number | null;
  analyst_ratings_buy: number | null;
  analyst_ratings_hold: number | null;
  analyst_ratings_sell: number | null;
  analyst_ratings_strong_sell: number | null;
  // fetched_at and updated_at are handled by DB
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
  totalGradesFetched: number;
  totalGradesUpserted: number;
}
