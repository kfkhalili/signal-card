// supabase/functions/lib/fetch-fmp-dcf.ts
// Library function for processing valuations (DCF) jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_DCF_BASE_URL = 'https://financialmodelingprep.com/stable/discounted-cash-flow';

// Zod schema for FMP DCF API response
const FmpDcfSchema = z.object({
  symbol: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  dcf: z.number().positive(),
  'Stock Price': z.number().positive(), // FMP API uses "Stock Price" as key
});

export async function fetchDcfLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'valuations') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchDcfLogic was called for job type ${job.data_type}. Expected 'valuations'.`,
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
      const dcfUrl = `${FMP_DCF_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(dcfUrl, { signal: controller.signal });
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
      console.warn(`[fetchDcfLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 500; // 500 bytes conservative estimate
    }

    const fmpResult: unknown = await response.json();

    // Handle empty array or non-array responses
    if (!Array.isArray(fmpResult)) {
      throw new Error(`FMP API returned non-array response for ${job.symbol}: ${JSON.stringify(fmpResult)}`);
    }

    if (fmpResult.length === 0) {
      console.warn(`[fetchDcfLogic] No DCF data returned for ${job.symbol}. This may indicate the symbol is not supported or has no DCF calculation.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        error: null,
      };
    }

    // Validate and transform the data
    const validatedRecords = fmpResult
      .map((record, index) => {
        try {
          return FmpDcfSchema.parse(record);
        } catch (error) {
          console.error(`[fetchDcfLogic] Validation error for ${job.symbol} record ${index}:`, error);
          return null;
        }
      })
      .filter((record): record is z.infer<typeof FmpDcfSchema> => record !== null);

    if (validatedRecords.length === 0) {
      throw new Error(`No valid DCF records found for ${job.symbol} after validation`);
    }

    // Transform to database format
    // Note: FMP typically returns a single record, but we handle arrays for robustness
    const dbRecords = validatedRecords.map((record) => ({
      symbol: record.symbol,
      date: record.date,
      valuation_type: 'dcf' as const,
      value: record.dcf,
      stock_price_at_calculation: record['Stock Price'],
      fetched_at: new Date().toISOString(),
    }));

    // Upsert into valuations table
    const { error: upsertError } = await supabase
      .from('valuations')
      .upsert(dbRecords, {
        onConflict: 'symbol,date,valuation_type',
      });

    if (upsertError) {
      throw new Error(`Database upsert error for ${job.symbol}: ${upsertError.message}`);
    }

    console.log(`[fetchDcfLogic] Successfully upserted ${dbRecords.length} DCF record(s) for ${job.symbol}`);

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[fetchDcfLogic] Error processing ${job.symbol}:`, errorMessage);
    return {
      success: false,
      dataSizeBytes: 0,
      error: errorMessage,
    };
  }
}

