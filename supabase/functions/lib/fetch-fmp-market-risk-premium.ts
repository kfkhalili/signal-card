// supabase/functions/lib/fetch-fmp-market-risk-premium.ts
// Library function for processing market-risk-premium jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_MARKET_RISK_PREMIUM_BASE_URL = 'https://financialmodelingprep.com/stable/market-risk-premium';

// Zod schema for FMP Market Risk Premium API response
const FmpMarketRiskPremiumSchema = z.object({
  country: z.string().min(1),
  continent: z.string().nullable().optional(),
  countryRiskPremium: z.number().nullable().optional(),
  totalEquityRiskPremium: z.number().positive(), // This is (Rm - Rf) used in CAPM
});

export async function fetchMarketRiskPremiumLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'market-risk-premium') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchMarketRiskPremiumLogic was called for job type ${job.data_type}. Expected 'market-risk-premium'.`,
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
      const mrpUrl = `${FMP_MARKET_RISK_PREMIUM_BASE_URL}?apikey=${FMP_API_KEY}`;
      response = await fetch(mrpUrl, { signal: controller.signal });
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
      console.warn(`[fetchMarketRiskPremiumLogic] Content-Length header missing. Using fallback estimate.`);
      actualSizeBytes = 50000; // 50 KB conservative estimate (multiple countries)
    }

    const fmpResult: unknown = await response.json();

    // Handle empty array or non-array responses
    if (!Array.isArray(fmpResult)) {
      throw new Error(`FMP API returned non-array response: ${JSON.stringify(fmpResult)}`);
    }

    if (fmpResult.length === 0) {
      console.warn(`[fetchMarketRiskPremiumLogic] No market risk premium data returned.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        message: 'No market risk premium data available from FMP API',
      };
    }

    // Validate and transform all records
    const validatedRecords: z.infer<typeof FmpMarketRiskPremiumSchema>[] = [];
    for (const record of fmpResult) {
      try {
        const validated = FmpMarketRiskPremiumSchema.parse(record);
        validatedRecords.push(validated);
      } catch (validationError) {
        console.warn(`[fetchMarketRiskPremiumLogic] Skipping invalid record:`, validationError);
        continue;
      }
    }

    if (validatedRecords.length === 0) {
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        message: 'No valid market risk premium records after validation',
      };
    }

    // Transform to database records
    const dbRecords = validatedRecords.map((record) => ({
      country: record.country,
      continent: record.continent || null,
      country_risk_premium: record.countryRiskPremium ?? null,
      total_equity_risk_premium: record.totalEquityRiskPremium,
      fetched_at: new Date().toISOString(),
    }));

    // Upsert all records (one per country)
    const { error: upsertError } = await supabase
      .from('market_risk_premiums')
      .upsert(dbRecords, {
        onConflict: 'country',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }


    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fetchMarketRiskPremiumLogic] Error:`, errorMessage);
    return {
      success: false,
      dataSizeBytes: 0,
      error: errorMessage,
    };
  }
}

