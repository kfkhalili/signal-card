// supabase/functions/fetch-fmp-shares-float/types.ts

// Interface for the exact FMP API response structure
export interface FmpSharesFloatData {
  symbol: string;
  date: string; // API returns "YYYY-MM-DD HH:MM:SS" or similar timestamp string
  freeFloat: number | null; // API might send null or 0
  floatShares: number | null; // API might send null or 0
  outstandingShares: number | null; // API might send null or 0
}

// Interface for the record to be upserted into your Supabase table
// Column names match the (camelCased) database schema
export interface SupabaseSharesFloatRecord {
  symbol: string;
  date: string; // "YYYY-MM-DD" format after parsing
  free_float: number | null;
  float_shares: number | null;
  outstanding_shares: number | null;
  // fetched_at and updated_at are handled by DB defaults/triggers
}

export interface ProcessingResult {
  page: number;
  fetchedCount: number;
  upsertedCount: number;
  skippedCount: number;
  success: boolean;
  message: string;
}

export interface FunctionResponse {
  message: string;
  details: ProcessingResult[];
  totalPagesProcessed: number;
  totalRecordsFetched: number;
  totalRecordsUpserted: number;
  totalRecordsSkipped: number;
}
