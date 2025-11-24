// supabase/functions/lib/fetch-fmp-insider-transactions.ts
// Library function for processing insider-transactions jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)
// CRITICAL: Fetches page=0, limit=500 to get recent transactions (not all historical data)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_INSIDER_TRANSACTIONS_BASE_URL = 'https://financialmodelingprep.com/stable/insider-trading/search';
const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 500; // Fetch recent 500 transactions (not all historical data)

// Zod schema for FMP Insider Transactions API response
const FmpInsiderTransactionSchema = z.object({
  symbol: z.string().min(1),
  filingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reportingCik: z.string().min(1),
  companyCik: z.string().nullable().optional(),
  transactionType: z.string().nullable().optional(), // e.g., "G-Gift", "S-Sale", "P-Purchase"
  securitiesOwned: z.number().nonnegative().nullable().optional(), // Accept float, convert to int when storing
  reportingName: z.string().nullable().optional(),
  typeOfOwner: z.string().nullable().optional(), // e.g., "officer: SVP, GC and Secretary"
  acquisitionOrDisposition: z
    .union([z.enum(['A', 'D', 'I']), z.literal(''), z.null()])
    .transform((val) => (val === '' || val === 'I' ? null : val)) // I = Initial/Inherited, treat as null
    .nullable()
    .optional(), // A = Acquisition, D = Disposition, I = Initial/Inherited (treated as null), empty string = null
  directOrIndirect: z.enum(['D', 'I']).nullable().optional(), // D = Direct, I = Indirect
  formType: z.string().nullable().optional(), // e.g., "4"
  securitiesTransacted: z.number().nonnegative().nullable().optional(), // Accept float, convert to int when storing. Can be null for some transaction types
  price: z.number().nonnegative().nullable().optional(), // Can be 0 for gifts
  securityName: z.string().nullable().optional(), // e.g., "Common Stock"
  url: z.string().url().nullable().optional(),
});

export async function fetchInsiderTransactionsLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'insider-transactions') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchInsiderTransactionsLogic was called for job type ${job.data_type}. Expected 'insider-transactions'.`,
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
      // Fetch page=0, limit=500 to get recent transactions (not all historical data)
      const insiderTransactionsUrl = `${FMP_INSIDER_TRANSACTIONS_BASE_URL}?symbol=${job.symbol}&page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}&apikey=${FMP_API_KEY}`;
      response = await fetch(insiderTransactionsUrl, { signal: controller.signal });
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
      console.warn(`[fetchInsiderTransactionsLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 200000; // 200 KB conservative estimate
    }

    const fmpResult: unknown = await response.json();

    // Handle empty array or non-array responses
    if (!Array.isArray(fmpResult)) {
      if (
        typeof fmpResult === 'object' &&
        fmpResult !== null &&
        Object.keys(fmpResult).length === 0
      ) {
        // No insider transaction data found - this is a valid response
        // CRITICAL: Update fetched_at for existing records to prevent infinite job creation
        const { error: updateError } = await supabase
          .from('insider_transactions')
          .update({ fetched_at: new Date().toISOString() })
          .eq('symbol', job.symbol);

        if (updateError) {
          console.warn(
            `[fetchInsiderTransactionsLogic] Failed to update fetched_at for ${job.symbol}:`,
            updateError.message
          );
        }

        console.log(`[fetchInsiderTransactionsLogic] No insider transaction data found for ${job.symbol} (empty object returned by FMP). Updated fetched_at to prevent infinite job creation.`);
        return {
          success: true,
          dataSizeBytes: actualSizeBytes,
        };
      }
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpResult}`);
    }

    if (fmpResult.length === 0) {
      // Empty array - no insider transaction data found
      // CRITICAL: Update fetched_at for existing records to prevent infinite job creation
      const { error: updateError } = await supabase
        .from('insider_transactions')
        .update({ fetched_at: new Date().toISOString() })
        .eq('symbol', job.symbol);

      if (updateError) {
        console.warn(
          `[fetchInsiderTransactionsLogic] Failed to update fetched_at for ${job.symbol}:`,
          updateError.message
        );
      }

      console.log(`[fetchInsiderTransactionsLogic] No insider transaction data found for ${job.symbol} (empty array returned by FMP). Updated fetched_at to prevent infinite job creation.`);
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
      };
    }

    // Parse and validate all records
    const validatedRecords = fmpResult.map((record, index) => {
      try {
        return FmpInsiderTransactionSchema.parse(record);
      } catch (error) {
        throw new Error(
          `Invalid insider transaction record at index ${index} for ${job.symbol}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Transform to database format
    // CRITICAL: Keep numbers as numbers (not BigInt) - PostgreSQL NUMERIC/BIGINT handles large numbers
    // Converting to JavaScript BigInt causes serialization errors when upserting to Supabase
    // CRITICAL: Filter out records where securities_transacted is null (it's part of primary key and NOT NULL)
    const dbRecords = validatedRecords
      .filter((record) => {
        // Skip records with null securities_transacted (required field, part of primary key)
        if (record.securitiesTransacted === null || record.securitiesTransacted === undefined) {
          console.warn(
            `[fetchInsiderTransactionsLogic] Skipping transaction for ${job.symbol} with null securities_transacted. Filing date: ${record.filingDate}, Reporting CIK: ${record.reportingCik}`
          );
          return false;
        }
        return true;
      })
      .map((record) => ({
        symbol: record.symbol,
        filing_date: record.filingDate,
        transaction_date: record.transactionDate || null,
        reporting_cik: record.reportingCik,
        company_cik: record.companyCik || null,
        transaction_type: record.transactionType || null,
        securities_owned: record.securitiesOwned !== null && record.securitiesOwned !== undefined
          ? Math.floor(record.securitiesOwned) // Convert float to int
          : null,
        reporting_name: record.reportingName || null,
        type_of_owner: record.typeOfOwner || null,
        acquisition_or_disposition: record.acquisitionOrDisposition || null,
        direct_or_indirect: record.directOrIndirect || null,
        form_type: record.formType || null,
        securities_transacted: Math.floor(record.securitiesTransacted!), // Convert float to int (non-null after filter)
        price: record.price ?? null,
        security_name: record.securityName || null,
        url: record.url || null,
        fetched_at: new Date().toISOString(),
      }));

    // CRITICAL: Deduplicate records by primary key before upserting
    // PostgreSQL error "ON CONFLICT DO UPDATE command cannot affect row a second time" occurs
    // when the same batch contains duplicate primary keys (symbol, filing_date, reporting_cik, securities_transacted)
    // We keep the first occurrence of each unique primary key combination
    const seenKeys = new Set<string>();
    const deduplicatedRecords = dbRecords.filter((record) => {
      const key = `${record.symbol}|${record.filing_date}|${record.reporting_cik}|${record.securities_transacted}`;
      if (seenKeys.has(key)) {
        console.warn(
          `[fetchInsiderTransactionsLogic] Duplicate transaction detected for ${job.symbol}: ${key}. Skipping duplicate.`
        );
        return false;
      }
      seenKeys.add(key);
      return true;
    });

    // Deduplicate records silently

    // Upsert all records (multiple transactions per symbol)
    const { error: upsertError } = await supabase
      .from('insider_transactions')
      .upsert(deduplicatedRecords, {
        onConflict: 'symbol,filing_date,reporting_cik,securities_transacted',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      throw new Error(`Failed to upsert insider transactions for ${job.symbol}: ${upsertError.message}`);
    }


    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[fetchInsiderTransactionsLogic] Error processing job ${job.id} for ${job.symbol}:`, errorMessage);
    return {
      success: false,
      dataSizeBytes: 0,
      error: errorMessage,
    };
  }
}

