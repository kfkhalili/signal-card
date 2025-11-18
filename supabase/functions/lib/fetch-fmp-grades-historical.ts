// supabase/functions/lib/fetch-fmp-grades-historical.ts
// Library function for processing grades-historical jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpGradesHistoricalData,
  SupabaseGradesHistoricalRecord,
} from '../fetch-fmp-grades-historical/types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_GRADES_HISTORICAL_BASE_URL = 'https://financialmodelingprep.com/stable/grades-historical';

function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export async function fetchGradesHistoricalLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'grades-historical') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchGradesHistoricalLogic was called for job type ${job.data_type}. Expected 'grades-historical'.`,
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
      const gradesUrl = `${FMP_GRADES_HISTORICAL_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(gradesUrl, { signal: controller.signal });
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
      console.warn(`[fetchGradesHistoricalLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 30000; // 30 KB conservative estimate
    }

    const fmpGradesResult: unknown = await response.json();

    // Handle empty object or non-array responses
    if (!Array.isArray(fmpGradesResult)) {
      if (
        typeof fmpGradesResult === 'object' &&
        fmpGradesResult !== null &&
        Object.keys(fmpGradesResult).length === 0
      ) {
        // No grades data found - this is a valid response
        console.log(`[fetchGradesHistoricalLogic] No historical grades data found for ${job.symbol} (empty object returned by FMP).`);
        return {
          success: true,
          dataSizeBytes: actualSizeBytes,
        };
      }
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpGradesResult}`);
    }

    if (fmpGradesResult.length === 0) {
      // Empty array - no grades found
      console.log(`[fetchGradesHistoricalLogic] No historical grades entries found for ${job.symbol}.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
      };
    }

    // CRITICAL: Map FMP data to Supabase record format
    const recordsToUpsert: SupabaseGradesHistoricalRecord[] = [];
    for (const fmpEntry of fmpGradesResult as FmpGradesHistoricalData[]) {
      if (
        !fmpEntry.symbol ||
        !fmpEntry.date ||
        !isValidDateString(fmpEntry.date)
      ) {
        console.warn(
          `[fetchGradesHistoricalLogic] Skipping invalid FMP historical grade record for ${job.symbol} due to missing symbol or invalid date:`,
          fmpEntry
        );
        continue;
      }

      recordsToUpsert.push({
        symbol: fmpEntry.symbol,
        date: fmpEntry.date,
        analyst_ratings_strong_buy: typeof fmpEntry.analystRatingsStrongBuy === 'number' ? fmpEntry.analystRatingsStrongBuy : null,
        analyst_ratings_buy: typeof fmpEntry.analystRatingsBuy === 'number' ? fmpEntry.analystRatingsBuy : null,
        analyst_ratings_hold: typeof fmpEntry.analystRatingsHold === 'number' ? fmpEntry.analystRatingsHold : null,
        analyst_ratings_sell: typeof fmpEntry.analystRatingsSell === 'number' ? fmpEntry.analystRatingsSell : null,
        analyst_ratings_strong_sell: typeof fmpEntry.analystRatingsStrongSell === 'number' ? fmpEntry.analystRatingsStrongSell : null,
        fetched_at: new Date().toISOString(), // CRITICAL: Update fetched_at on upsert to prevent infinite job creation
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabase
        .from('grades_historical')
        .upsert(recordsToUpsert, {
          onConflict: 'symbol,date',
          count: 'exact',
        });

      if (upsertError) {
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }

      console.log(`[fetchGradesHistoricalLogic] Successfully upserted ${count || 0} historical grade records for ${job.symbol}.`);
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

