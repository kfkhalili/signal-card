// supabase/functions/lib/fetch-fmp-revenue-product-segmentation.ts
// Library function for processing revenue-product-segmentation jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpRevenueProductSegmentationData,
  SupabaseRevenueProductSegmentationRecord,
} from '../fetch-fmp-revenue-segmentation/types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_REVENUE_SEGMENTATION_BASE_URL = 'https://financialmodelingprep.com/stable/revenue-product-segmentation';

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

export async function fetchRevenueProductSegmentationLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'revenue-product-segmentation') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchRevenueProductSegmentationLogic was called for job type ${job.data_type}. Expected 'revenue-product-segmentation'.`,
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
      const segmentationUrl = `${FMP_REVENUE_SEGMENTATION_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(segmentationUrl, { signal: controller.signal });
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
      console.warn(`[fetchRevenueProductSegmentationLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 150000; // 150 KB conservative estimate
    }

    const fmpSegmentationResult: unknown = await response.json();

    // Handle empty object or non-array responses
    if (!Array.isArray(fmpSegmentationResult)) {
      if (
        typeof fmpSegmentationResult === 'object' &&
        fmpSegmentationResult !== null &&
        Object.keys(fmpSegmentationResult).length === 0
      ) {
        // No segmentation data found - this is a valid response
        console.log(`[fetchRevenueProductSegmentationLogic] No revenue segmentation data found for ${job.symbol} (empty object returned by FMP).`);
        return {
          success: true,
          dataSizeBytes: actualSizeBytes,
        };
      }
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpSegmentationResult}`);
    }

    if (fmpSegmentationResult.length === 0) {
      // Empty array - no segmentation found
      console.log(`[fetchRevenueProductSegmentationLogic] No revenue segmentation entries found for ${job.symbol}.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
      };
    }

    // CRITICAL: Map FMP data to Supabase record format
    const recordsToUpsert: SupabaseRevenueProductSegmentationRecord[] = [];
    for (const fmpEntry of fmpSegmentationResult as FmpRevenueProductSegmentationData[]) {
      if (
        !fmpEntry.symbol ||
        typeof fmpEntry.fiscalYear !== 'number' ||
        !fmpEntry.period ||
        !fmpEntry.date ||
        !isValidDateString(fmpEntry.date) ||
        typeof fmpEntry.data !== 'object' ||
        fmpEntry.data === null
      ) {
        console.warn(
          `[fetchRevenueProductSegmentationLogic] Skipping invalid FMP revenue segmentation record for ${job.symbol} due to missing or invalid key fields:`,
          fmpEntry
        );
        continue;
      }

      recordsToUpsert.push({
        symbol: fmpEntry.symbol,
        fiscal_year: fmpEntry.fiscalYear,
        period: fmpEntry.period,
        date: fmpEntry.date,
        reported_currency: fmpEntry.reportedCurrency || null,
        data: fmpEntry.data,
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabase
        .from('revenue_product_segmentation')
        .upsert(recordsToUpsert, {
          onConflict: 'symbol,fiscal_year,period,date', // Composite PK
          count: 'exact',
        });

      if (upsertError) {
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }

      console.log(`[fetchRevenueProductSegmentationLogic] Successfully upserted ${count || 0} revenue segmentation records for ${job.symbol}.`);
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

