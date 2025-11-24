// supabase/functions/lib/fetch-fmp-price-target-consensus.ts
// Library function for processing analyst price target consensus jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_PRICE_TARGET_BASE_URL = 'https://financialmodelingprep.com/stable/price-target-consensus';

// Zod schema for FMP Price Target Consensus API response
const FmpPriceTargetSchema = z.object({
  symbol: z.string().min(1),
  targetHigh: z.number().positive(),
  targetLow: z.number().positive(),
  targetConsensus: z.number().positive(),
  targetMedian: z.number().positive(),
});

export async function fetchPriceTargetConsensusLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'analyst-price-targets') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchPriceTargetConsensusLogic was called for job type ${job.data_type}. Expected 'analyst-price-targets'.`,
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
      const priceTargetUrl = `${FMP_PRICE_TARGET_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(priceTargetUrl, { signal: controller.signal });
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
      console.warn(`[fetchPriceTargetConsensusLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 500; // 500 bytes conservative estimate
    }

    const fmpResult: unknown = await response.json();

    // Handle empty array or non-array responses
    if (!Array.isArray(fmpResult)) {
      throw new Error(`FMP API returned non-array response for ${job.symbol}: ${JSON.stringify(fmpResult)}`);
    }

    if (fmpResult.length === 0) {
      console.warn(`[fetchPriceTargetConsensusLogic] No price target data returned for ${job.symbol}. This may indicate the symbol is not supported or has no analyst coverage.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        error: null,
      };
    }

    // Validate and transform the data (FMP returns array with single object)
    const validatedRecord = FmpPriceTargetSchema.parse(fmpResult[0]);

    // Transform to database format (one record per symbol, upsert on conflict)
    const dbRecord = {
      symbol: validatedRecord.symbol,
      target_high: validatedRecord.targetHigh,
      target_low: validatedRecord.targetLow,
      target_consensus: validatedRecord.targetConsensus,
      target_median: validatedRecord.targetMedian,
      fetched_at: new Date().toISOString(),
    };

    // Upsert into analyst_price_targets table (one record per symbol)
    const { error: upsertError } = await supabase
      .from('analyst_price_targets')
      .upsert(dbRecord, {
        onConflict: 'symbol',
      });

    if (upsertError) {
      throw new Error(`Database upsert error for ${job.symbol}: ${upsertError.message}`);
    }


    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[fetchPriceTargetConsensusLogic] Error processing ${job.symbol}:`, errorMessage);
    return {
      success: false,
      dataSizeBytes: 0,
      error: errorMessage,
    };
  }
}

