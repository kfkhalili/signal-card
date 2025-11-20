// supabase/functions/lib/fetch-fmp-exchange-variants.ts
// Library function for processing exchange-variants jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpExchangeVariantData,
  SupabaseExchangeVariantRecord,
} from '../fetch-fmp-exchange-variants/types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_EXCHANGE_VARIANTS_BASE_URL = 'https://financialmodelingprep.com/stable/search-exchange-variants';

export async function fetchExchangeVariantsLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'exchange-variants') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchExchangeVariantsLogic was called for job type ${job.data_type}. Expected 'exchange-variants'.`,
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
      const variantsUrl = `${FMP_EXCHANGE_VARIANTS_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(variantsUrl, { signal: controller.signal });
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
      console.warn(`[fetchExchangeVariantsLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 80000; // 80 KB conservative estimate
    }

    const fmpVariantsResult: unknown = await response.json();

    if (!Array.isArray(fmpVariantsResult)) {
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpVariantsResult}`);
    }

    if (fmpVariantsResult.length === 0) {
      // CRITICAL: Create a sentinel record for exchange-variants if FMP returns empty array
      // This prevents infinite retries for symbols that genuinely have no exchange variants
      // The sentinel record uses special values for variant_symbol and exchange_short_name
      // to avoid conflicts with real data (primary key is on these two fields)
      const sentinelRecord: SupabaseExchangeVariantRecord = {
        base_symbol: job.symbol,
        variant_symbol: `__SENTINEL__${job.symbol}__`, // Unique sentinel value per symbol
        exchange_short_name: '__SENTINEL__', // Sentinel exchange name
        fetched_at: new Date().toISOString(),
        // All other fields will be null by default
        price: null,
        beta: null,
        vol_avg: null,
        mkt_cap: null,
        last_div: null,
        range: null,
        changes: null,
        currency: null,
        cik: null,
        isin: null,
        cusip: null,
        exchange: null,
        dcf_diff: null,
        dcf: null,
        image: null,
        ipo_date: null,
        default_image: null,
        is_actively_trading: null,
      } as SupabaseExchangeVariantRecord; // Type assertion for fetched_at

      // Check if sentinel record already exists
      const { data: existingSentinel, error: checkError } = await supabase
        .from('exchange_variants')
        .select('variant_symbol')
        .eq('base_symbol', job.symbol)
        .eq('variant_symbol', `__SENTINEL__${job.symbol}__`)
        .eq('exchange_short_name', '__SENTINEL__')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn(`[fetchExchangeVariantsLogic] Error checking for sentinel record: ${checkError.message}`);
      }

      if (!existingSentinel) {
        // Insert sentinel record
        const { error: upsertError, count } = await supabase
          .from('exchange_variants')
          .upsert(sentinelRecord, {
            onConflict: 'variant_symbol,exchange_short_name',
            count: 'exact',
          });

        if (upsertError) {
          throw new Error(`Database upsert of sentinel record failed: ${upsertError.message}`);
        }
        console.log(`[fetchExchangeVariantsLogic] Created sentinel exchange-variants record for ${job.symbol}.`);
      } else {
        // Update fetched_at on existing sentinel record
        const { error: updateError } = await supabase
          .from('exchange_variants')
          .update({ fetched_at: new Date().toISOString() })
          .eq('base_symbol', job.symbol)
          .eq('variant_symbol', `__SENTINEL__${job.symbol}__`)
          .eq('exchange_short_name', '__SENTINEL__');

        if (updateError) {
          console.warn(`[fetchExchangeVariantsLogic] Failed to update sentinel record fetched_at: ${updateError.message}`);
        } else {
          console.log(`[fetchExchangeVariantsLogic] Updated sentinel exchange-variants record fetched_at for ${job.symbol}.`);
        }
      }

      return {
        success: true,
        dataSizeBytes: actualSizeBytes, // Still count the API call size
      };
    }

    // CRITICAL: Map FMP data to Supabase record format
    // NOTE: job.symbol is the base_symbol (e.g., "AAPL"), and FMP returns variant symbols (e.g., "AAPL.DE")
    const recordsToUpsert: SupabaseExchangeVariantRecord[] = (
      fmpVariantsResult as FmpExchangeVariantData[]
    )
      .filter((fmpEntry) => {
        const isValid = fmpEntry.symbol && fmpEntry.exchangeShortName;
        if (!isValid) {
          console.warn(
            `[fetchExchangeVariantsLogic] Skipping invalid FMP exchange variant record for ${job.symbol} due to missing symbol or exchangeShortName:`,
            fmpEntry
          );
        }
        return isValid;
      })
      .map((fmpEntry) => ({
        base_symbol: job.symbol, // CRITICAL: Use job.symbol as base_symbol
        variant_symbol: fmpEntry.symbol,
        exchange_short_name: fmpEntry.exchangeShortName,
        price: fmpEntry.price,
        beta: fmpEntry.beta,
        vol_avg: fmpEntry.volAvg !== null ? Math.trunc(fmpEntry.volAvg) : null, // Truncate bigint values
        mkt_cap: fmpEntry.mktCap !== null ? Math.trunc(fmpEntry.mktCap) : null, // Truncate bigint values
        last_div: fmpEntry.lastDiv,
        range: fmpEntry.range,
        changes: fmpEntry.changes,
        currency: fmpEntry.currency,
        cik: fmpEntry.cik,
        isin: fmpEntry.isin,
        cusip: fmpEntry.cusip,
        exchange: fmpEntry.exchange,
        dcf_diff: fmpEntry.dcfDiff,
        dcf: fmpEntry.dcf,
        image: fmpEntry.image,
        ipo_date: fmpEntry.ipoDate,
        default_image: fmpEntry.defaultImage,
        is_actively_trading: fmpEntry.isActivelyTrading,
        fetched_at: new Date().toISOString(), // CRITICAL: Update fetched_at on upsert to prevent infinite job creation
      }));

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabase
        .from('exchange_variants')
        .upsert(recordsToUpsert, {
          onConflict: 'variant_symbol,exchange_short_name',
          count: 'exact',
        });

      if (upsertError) {
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }

      console.log(`[fetchExchangeVariantsLogic] Successfully upserted ${count || 0} exchange variant records for ${job.symbol}.`);
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

