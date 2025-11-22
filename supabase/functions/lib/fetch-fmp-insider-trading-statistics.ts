// supabase/functions/lib/fetch-fmp-insider-trading-statistics.ts
// Library function for processing insider-trading-statistics jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_INSIDER_TRADING_STATISTICS_BASE_URL = 'https://financialmodelingprep.com/stable/insider-trading/statistics';

// Zod schema for FMP Insider Trading Statistics API response
const FmpInsiderTradingStatisticsSchema = z.object({
  symbol: z.string().min(1),
  cik: z.string().nullable().optional(),
  year: z.number().int().positive(),
  quarter: z.number().int().min(1).max(4),
  acquiredTransactions: z.number().int().nonnegative().nullable().optional(),
  disposedTransactions: z.number().int().nonnegative().nullable().optional(),
  acquiredDisposedRatio: z.number().nullable().optional(),
  totalAcquired: z.number().int().nonnegative().nullable().optional(),
  totalDisposed: z.number().int().nonnegative().nullable().optional(),
  averageAcquired: z.number().nonnegative().nullable().optional(),
  averageDisposed: z.number().nonnegative().nullable().optional(),
  totalPurchases: z.number().int().nonnegative().nullable().optional(),
  totalSales: z.number().int().nonnegative().nullable().optional(),
});

export async function fetchInsiderTradingStatisticsLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'insider-trading-statistics') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchInsiderTradingStatisticsLogic was called for job type ${job.data_type}. Expected 'insider-trading-statistics'.`,
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
      const insiderTradingUrl = `${FMP_INSIDER_TRADING_STATISTICS_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(insiderTradingUrl, { signal: controller.signal });
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
      console.warn(`[fetchInsiderTradingStatisticsLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 15000; // 15 KB conservative estimate
    }

    const fmpResult: unknown = await response.json();

    // Handle empty array or non-array responses
    if (!Array.isArray(fmpResult)) {
      if (
        typeof fmpResult === 'object' &&
        fmpResult !== null &&
        Object.keys(fmpResult).length === 0
      ) {
        // No insider trading data found - this is a valid response
        // CRITICAL: Update fetched_at for existing records to prevent infinite job creation
        const { error: updateError } = await supabase
          .from('insider_trading_statistics')
          .update({ fetched_at: new Date().toISOString() })
          .eq('symbol', job.symbol);

        if (updateError) {
          console.warn(
            `[fetchInsiderTradingStatisticsLogic] Failed to update fetched_at for ${job.symbol}:`,
            updateError.message
          );
        }

        console.log(`[fetchInsiderTradingStatisticsLogic] No insider trading data found for ${job.symbol} (empty object returned by FMP). Updated fetched_at to prevent infinite job creation.`);
        return {
          success: true,
          dataSizeBytes: actualSizeBytes,
        };
      }
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpResult}`);
    }

    if (fmpResult.length === 0) {
      // Empty array - no insider trading data found
      // CRITICAL: Update fetched_at for existing records to prevent infinite job creation
      const { error: updateError } = await supabase
        .from('insider_trading_statistics')
        .update({ fetched_at: new Date().toISOString() })
        .eq('symbol', job.symbol);

      if (updateError) {
        console.warn(
          `[fetchInsiderTradingStatisticsLogic] Failed to update fetched_at for ${job.symbol}:`,
          updateError.message
        );
      }

      console.log(`[fetchInsiderTradingStatisticsLogic] No insider trading data found for ${job.symbol} (empty array returned by FMP). Updated fetched_at to prevent infinite job creation.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
      };
    }

    // Parse and validate all records
    const validatedRecords = fmpResult.map((record, index) => {
      try {
        return FmpInsiderTradingStatisticsSchema.parse(record);
      } catch (error) {
        throw new Error(
          `Invalid insider trading statistics record at index ${index} for ${job.symbol}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Transform to database format
    // CRITICAL: Keep numbers as numbers (not BigInt) - PostgreSQL NUMERIC/BIGINT handles large numbers
    // Converting to JavaScript BigInt causes serialization errors when upserting to Supabase
    const dbRecords = validatedRecords.map((record) => ({
      symbol: record.symbol,
      cik: record.cik || null,
      year: record.year,
      quarter: record.quarter,
      acquired_transactions: record.acquiredTransactions ?? null,
      disposed_transactions: record.disposedTransactions ?? null,
      acquired_disposed_ratio: record.acquiredDisposedRatio ?? null,
      total_acquired: record.totalAcquired ?? null, // Keep as number, PostgreSQL will handle it
      total_disposed: record.totalDisposed ?? null, // Keep as number, PostgreSQL will handle it
      average_acquired: record.averageAcquired ?? null,
      average_disposed: record.averageDisposed ?? null,
      total_purchases: record.totalPurchases ?? null,
      total_sales: record.totalSales ?? null,
      fetched_at: new Date().toISOString(),
    }));

    // Upsert all records (multiple quarters per symbol)
    const { error: upsertError } = await supabase
      .from('insider_trading_statistics')
      .upsert(dbRecords, {
        onConflict: 'symbol,year,quarter',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      throw new Error(`Failed to upsert insider trading statistics for ${job.symbol}: ${upsertError.message}`);
    }

    console.log(
      `[fetchInsiderTradingStatisticsLogic] Successfully upserted ${dbRecords.length} quarterly insider trading statistics records for ${job.symbol}`
    );

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[fetchInsiderTradingStatisticsLogic] Error processing job ${job.id} for ${job.symbol}:`, errorMessage);
    return {
      success: false,
      dataSizeBytes: 0,
      error: errorMessage,
    };
  }
}

