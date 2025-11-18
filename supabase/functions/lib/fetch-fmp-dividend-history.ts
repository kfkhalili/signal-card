// supabase/functions/lib/fetch-fmp-dividend-history.ts
// Library function for processing dividend-history jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpDividendData,
  SupabaseDividendRecord,
} from '../fetch-fmp-dividend-history/types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_DIVIDENDS_BASE_URL = 'https://financialmodelingprep.com/stable/dividends';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'An unknown error occurred.';
  }
}

function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export async function fetchDividendHistoryLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'dividend-history') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchDividendHistoryLogic was called for job type ${job.data_type}. Expected 'dividend-history'.`,
    };
  }

  try {
    if (!FMP_API_KEY) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }

    // CRITICAL: Aggressive internal timeout (prevents "Slow API" throughput collapse)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    let response: Response;
    try {
      const dividendsUrl = `${FMP_DIVIDENDS_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(dividendsUrl, { signal: controller.signal });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FMP API request timed out after 10 seconds. This indicates API brownout or network issue.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${errorText}`);
    }

    // CRITICAL: Get the ACTUAL data transfer size (what FMP bills for)
    const contentLength = response.headers.get('Content-Length');
    let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
    if (actualSizeBytes === 0) {
      console.warn(`[fetchDividendHistoryLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 100000; // 100 KB conservative estimate
    }

    const fmpDividendResult: unknown = await response.json();

    // Handle empty object or non-array responses
    if (!Array.isArray(fmpDividendResult)) {
      if (
        typeof fmpDividendResult === 'object' &&
        fmpDividendResult !== null &&
        Object.keys(fmpDividendResult).length === 0
      ) {
        // No dividend data found - this is a valid response
        console.log(`[fetchDividendHistoryLogic] No dividend data found for ${job.symbol} (empty object returned by FMP).`);
        return {
          success: true,
          dataSizeBytes: actualSizeBytes,
        };
      }
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpDividendResult}`);
    }

    if (fmpDividendResult.length === 0) {
      // Empty array - no dividends found
      console.log(`[fetchDividendHistoryLogic] No dividend entries found for ${job.symbol}.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
      };
    }

    // CRITICAL: Map FMP data to Supabase record format
    const recordsToUpsert: SupabaseDividendRecord[] = [];
    for (const fmpEntry of fmpDividendResult as FmpDividendData[]) {
      if (
        !fmpEntry.symbol ||
        !fmpEntry.date ||
        !isValidDateString(fmpEntry.date)
      ) {
        console.warn(
          `[fetchDividendHistoryLogic] Skipping invalid FMP dividend record for ${job.symbol} due to missing symbol or invalid date format:`,
          fmpEntry
        );
        continue;
      }

      recordsToUpsert.push({
        symbol: fmpEntry.symbol,
        date: fmpEntry.date,
        record_date: isValidDateString(fmpEntry.recordDate) ? fmpEntry.recordDate : null,
        payment_date: isValidDateString(fmpEntry.paymentDate) ? fmpEntry.paymentDate : null,
        declaration_date: isValidDateString(fmpEntry.declarationDate) ? fmpEntry.declarationDate : null,
        adj_dividend: typeof fmpEntry.adjDividend === 'number' ? fmpEntry.adjDividend : null,
        dividend: typeof fmpEntry.dividend === 'number' ? fmpEntry.dividend : null,
        yield: typeof fmpEntry.yield === 'number' ? fmpEntry.yield : null,
        frequency: fmpEntry.frequency || null,
        fetched_at: new Date().toISOString(), // CRITICAL: Update fetched_at on upsert to prevent infinite job creation
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabase
        .from('dividend_history')
        .upsert(recordsToUpsert, {
          onConflict: 'symbol,date',
          count: 'exact',
        });

      if (upsertError) {
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }

      console.log(`[fetchDividendHistoryLogic] Successfully upserted ${count || 0} dividend records for ${job.symbol}.`);
    }

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    return {
      success: false,
      dataSizeBytes: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

