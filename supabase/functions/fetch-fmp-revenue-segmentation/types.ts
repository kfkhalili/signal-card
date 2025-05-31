// supabase/functions/fetch-fmp-revenue-segmentation/types.ts

export interface FmpRevenueProductSegmentationData {
  symbol: string;
  fiscalYear: number;
  period: string;
  reportedCurrency: string | null;
  date: string; // "YYYY-MM-DD"
  data: Record<string, number>; // e.g. { "Product A": 1000, "Product B": 2000 }
}

export interface SupabaseRevenueProductSegmentationRecord {
  symbol: string;
  fiscal_year: number;
  period: string;
  date: string;
  reported_currency: string | null;
  data: Record<string, number> | null;
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
  totalSegmentationRecordsFetched: number;
  totalSegmentationRecordsUpserted: number;
}
