// supabase/functions/lib/fetch-fmp-quote.ts
// Library function for processing quote jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_QUOTE_BASE_URL = 'https://financialmodelingprep.com/stable/quote';

// Zod schema for FMP Quote API response
// CRITICAL: Strict schema validation - all required fields must be present and correct type
const FmpQuoteSchema = z.object({
  symbol: z.string().min(1),
  // FIXED: Allow price = 0 (delisted/suspended stocks) and increase max to 1M (for BRK-A and other high-value stocks)
  // Matches profile schema pattern: z.number().gte(0).lt(1000000)
  price: z.number().gte(0).lt(1000000),
  // FIXED: Allow timestamp = 0 (FMP sometimes returns 0 for invalid/missing timestamps)
  // Changed from .positive() to .gte(0) to handle bad data gracefully
  timestamp: z.number().gte(0),
  changesPercentage: z.number().optional().nullable(),
  changePercentage: z.number().optional().nullable(), // FMP sometimes uses this variant
  change: z.number().optional().nullable(),
  volume: z.number().nonnegative().optional().nullable(),
  dayLow: z.number().nonnegative().optional().nullable(),
  dayHigh: z.number().nonnegative().optional().nullable(),
  yearHigh: z.number().nonnegative().optional().nullable(),
  yearLow: z.number().nonnegative().optional().nullable(),
  marketCap: z.number().nonnegative().optional().nullable(),
  // FIXED: Allow negative values (FMP sometimes returns negative moving averages for bad data)
  // Changed from .nonnegative() to allow any number (including negative)
  priceAvg50: z.number().optional().nullable(),
  priceAvg200: z.number().optional().nullable(),
  exchange: z.string().optional().nullable(),
  open: z.number().nonnegative().optional().nullable(),
  previousClose: z.number().nonnegative().optional().nullable(),
  name: z.string().optional().nullable(),
  eps: z.number().optional().nullable(),
  pe: z.number().optional().nullable(),
  earningsAnnouncement: z.string().optional().nullable(),
  sharesOutstanding: z.number().nonnegative().optional().nullable(),
});

export async function fetchQuoteLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'quote') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchQuoteLogic was called for job type ${job.data_type}. Expected 'quote'.`,
    };
  }

  try {
    // CRITICAL: Aggressive internal timeout (prevents "Slow API" throughput collapse)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    let response: Response;
    try {
      const quoteUrl = `${FMP_QUOTE_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(quoteUrl, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FMP API request timed out after 10 seconds. This indicates API brownout or network issue.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }

    // CRITICAL: Get the ACTUAL data transfer size (what FMP bills for)
    // Do NOT use JSON.stringify().length - that measures the parsed object, not the HTTP payload
    const contentLength = response.headers.get('Content-Length');
    let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
    if (actualSizeBytes === 0) {
      console.warn(`[fetchQuoteLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 2000; // 2 KB conservative estimate for quote data
    }

    const data = await response.json();

    // CRITICAL VALIDATION #2: Strict Schema Validation (Prevents "Schema Drift" Data Corruption)
    // Manual "spot-checks" are insufficient - APIs can change field names without versioning
    // This causes undefined values to be written as NULL, corrupting the database
    // MUST use strict, holistic schema parsing (Zod) to validate the ENTIRE response
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`FMP API returned empty array or invalid response for ${job.symbol}`);
    }

    // Parse the data - this IS the validation
    // If parsing fails (missing field, wrong type, invalid value), it throws
    const quote = FmpQuoteSchema.parse(data[0]);

    // CRITICAL VALIDATION #3: Source Timestamp Check (Prevents "Liar API Stale Data" Catastrophe)
    // The API may return 200 OK with valid shape and sanity, but the data itself may be stale
    // (e.g., API caching bug returns 3-day-old data). We must compare source timestamps.
    // This prevents "data laundering" where stale data is marked as fresh.
    const { data: registryData, error: registryError } = await supabase
      .from('data_type_registry_v2')
      .select('source_timestamp_column')
      .eq('data_type', 'quote')
      .single();

    if (registryError) {
      console.warn(`[fetchQuoteLogic] Failed to fetch registry for source timestamp check: ${registryError.message}`);
    } else if (registryData?.source_timestamp_column) {
      // Get the existing source timestamp from the database
      const { data: existingData, error: existingError } = await supabase
        .from('live_quote_indicators')
        .select('api_timestamp')
        .eq('symbol', job.symbol)
        .single();

      if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned (expected for new symbols)
        console.warn(`[fetchQuoteLogic] Failed to fetch existing data for source timestamp check: ${existingError.message}`);
      } else if (existingData?.api_timestamp) {
        const oldSourceTimestamp = existingData.api_timestamp;
        const newSourceTimestamp = quote.timestamp;

        // CRITICAL: If new source timestamp is < old source timestamp, this is stale data
        // The API is returning old data (caching bug, stale cache, etc.)
        // We must reject this to prevent "data laundering"
        // CRITICAL: For UI jobs (priority 1000), be more lenient - accept equal timestamps
        // This prevents UI jobs from failing when the API returns the same timestamp
        // (which can happen legitimately if the price hasn't changed)
        const isUIJob = job.priority >= 1000;
        if (newSourceTimestamp < oldSourceTimestamp) {
          // Stale data detected - this is expected behavior, not a failure
          // Return success with message indicating data was correctly rejected
          return {
            success: true,
            dataSizeBytes: 0,
            message: `Data was stale (source timestamp: ${newSourceTimestamp} vs existing: ${oldSourceTimestamp}). Correctly rejected to prevent data laundering.`,
          };
        } else if (!isUIJob && newSourceTimestamp === oldSourceTimestamp) {
          // For non-UI jobs, reject equal timestamps (data laundering prevention)
          return {
            success: true,
            dataSizeBytes: 0,
            message: `Data was stale (equal timestamps: ${newSourceTimestamp}). Correctly rejected to prevent data laundering.`,
          };
        }
        // For UI jobs, accept equal timestamps (user is actively waiting, better to show data than fail)
      }
    }

    // Prepare record for upsert
    // CRITICAL: Truncate bigint values (volume, market_cap) to integers
    // FMP API sometimes returns decimals like "3955124346827.0005" which breaks bigint columns
    const recordToUpsert = {
      symbol: quote.symbol,
      current_price: quote.price,
      change_percentage: quote.changesPercentage ?? quote.changePercentage ?? null,
      day_change: quote.change ?? null,
      volume: quote.volume ? Math.trunc(quote.volume) : null,
      day_low: quote.dayLow ?? null,
      day_high: quote.dayHigh ?? null,
      market_cap: quote.marketCap ? Math.trunc(quote.marketCap) : null,
      day_open: quote.open ?? null,
      previous_close: quote.previousClose ?? null,
      api_timestamp: quote.timestamp,
      sma_50d: quote.priceAvg50 ?? null,
      sma_200d: quote.priceAvg200 ?? null,
      fetched_at: new Date().toISOString(),
      year_high: quote.yearHigh ?? null,
      year_low: quote.yearLow ?? null,
      exchange: quote.exchange ?? null,
    };

    // Upsert to database
    const { error: upsertError } = await supabase
      .from('live_quote_indicators')
      .upsert(recordToUpsert, { onConflict: 'symbol' });

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
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

