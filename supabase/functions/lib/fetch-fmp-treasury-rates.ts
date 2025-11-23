// supabase/functions/lib/fetch-fmp-treasury-rates.ts
// Library function for processing treasury-rates jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_TREASURY_RATES_BASE_URL = 'https://financialmodelingprep.com/stable/treasury-rates';

// Zod schema for FMP Treasury Rates API response
const FmpTreasuryRateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  month1: z.number().nullable().optional(),
  month2: z.number().nullable().optional(),
  month3: z.number().nullable().optional(),
  month6: z.number().nullable().optional(),
  year1: z.number().nullable().optional(),
  year2: z.number().nullable().optional(),
  year3: z.number().nullable().optional(),
  year5: z.number().nullable().optional(),
  year7: z.number().nullable().optional(),
  year10: z.number().positive(), // Required - this is the risk-free rate (Rf)
  year20: z.number().nullable().optional(),
  year30: z.number().nullable().optional(),
});

export async function fetchTreasuryRatesLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'treasury-rates') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchTreasuryRatesLogic was called for job type ${job.data_type}. Expected 'treasury-rates'.`,
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
      const treasuryUrl = `${FMP_TREASURY_RATES_BASE_URL}?apikey=${FMP_API_KEY}`;
      response = await fetch(treasuryUrl, { signal: controller.signal });
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
      console.warn(`[fetchTreasuryRatesLogic] Content-Length header missing. Using fallback estimate.`);
      actualSizeBytes = 10000; // 10 KB conservative estimate (multiple dates)
    }

    const fmpResult: unknown = await response.json();

    // Handle empty array or non-array responses
    if (!Array.isArray(fmpResult)) {
      throw new Error(`FMP API returned non-array response: ${JSON.stringify(fmpResult)}`);
    }

    if (fmpResult.length === 0) {
      console.warn(`[fetchTreasuryRatesLogic] No treasury rates data returned.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        message: 'No treasury rates data available from FMP API',
      };
    }

    // Validate and transform all records
    const validatedRecords: z.infer<typeof FmpTreasuryRateSchema>[] = [];
    for (const record of fmpResult) {
      try {
        const validated = FmpTreasuryRateSchema.parse(record);
        validatedRecords.push(validated);
      } catch (validationError) {
        console.warn(`[fetchTreasuryRatesLogic] Skipping invalid record:`, validationError);
        continue;
      }
    }

    if (validatedRecords.length === 0) {
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        message: 'No valid treasury rates records after validation',
      };
    }

    // Transform to database records
    const dbRecords = validatedRecords.map((record) => ({
      date: record.date,
      month1: record.month1 ?? null,
      month2: record.month2 ?? null,
      month3: record.month3 ?? null,
      month6: record.month6 ?? null,
      year1: record.year1 ?? null,
      year2: record.year2 ?? null,
      year3: record.year3 ?? null,
      year5: record.year5 ?? null,
      year7: record.year7 ?? null,
      year10: record.year10, // Required - this is the risk-free rate
      year20: record.year20 ?? null,
      year30: record.year30 ?? null,
      fetched_at: new Date().toISOString(),
    }));

    // Upsert all records (one per date)
    const { error: upsertError, count } = await supabase
      .from('treasury_rates')
      .upsert(dbRecords, {
        onConflict: 'date',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }

    console.log(`[fetchTreasuryRatesLogic] Successfully upserted ${count || dbRecords.length} treasury rate records`);

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fetchTreasuryRatesLogic] Error:`, errorMessage);
    return {
      success: false,
      dataSizeBytes: 0,
      error: errorMessage,
    };
  }
}

