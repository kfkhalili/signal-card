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
      // CRITICAL: The sentinel record uses the actual symbol as symbol_variant (not a sentinel value)
      // This allows the card to visualize it as "the only variant" (the base symbol itself)
      // CRITICAL: Populate sentinel record with data from profiles table so it can render correctly

      // Fetch profile data to populate the sentinel record
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('price, beta, average_volume, market_cap, last_dividend, range, change, currency, cik, isin, cusip, exchange, image, ipo_date, default_image, is_actively_trading')
        .eq('symbol', job.symbol)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn(`[fetchExchangeVariantsLogic] Error fetching profile data for sentinel record: ${profileError.message}`);
      }

      // Derive exchange_short_name from profile data
      // The exchange field in profiles is usually the short name (e.g., "NYSE", "NASDAQ")
      // Use it directly, or 'N/A' if not available
      let exchangeShortName = profileData?.exchange ?? 'N/A';

      const sentinelRecord: SupabaseExchangeVariantRecord = {
        symbol: job.symbol,
        symbol_variant: job.symbol, // CRITICAL: Use actual symbol, not sentinel value - this makes it visualizable
        exchange_short_name: exchangeShortName, // Use exchange from profile, or 'N/A' if not available
        fetched_at: new Date().toISOString(),
        // Populate from profile data if available
        price: profileData?.price ?? null,
        beta: profileData?.beta ?? null,
        vol_avg: profileData?.average_volume ?? null, // Map average_volume to vol_avg
        mkt_cap: profileData?.market_cap ?? null,
        last_div: profileData?.last_dividend ?? null,
        range: profileData?.range ?? null,
        changes: profileData?.change ?? null, // Map change to changes
        currency: profileData?.currency ?? null,
        cik: profileData?.cik ?? null,
        isin: profileData?.isin ?? null,
        cusip: profileData?.cusip ?? null,
        exchange: profileData?.exchange ?? null,
        dcf_diff: null, // Not available in profiles
        dcf: null, // Not available in profiles
        image: profileData?.image ?? null,
        ipo_date: profileData?.ipo_date ?? null,
        default_image: profileData?.default_image ?? null,
        is_actively_trading: profileData?.is_actively_trading ?? true, // Use profile value, default to true
      } as SupabaseExchangeVariantRecord; // Type assertion for fetched_at

      // Check if sentinel record already exists
      // CRITICAL: Check for both old format (exchange_short_name = 'N/A') and new format (exchange_short_name = actual exchange)
      // This handles migration from old sentinel records to new populated ones
      const { data: existingSentinel, error: checkError } = await supabase
        .from('exchange_variants')
        .select('symbol_variant, exchange_short_name')
        .eq('symbol', job.symbol)
        .eq('symbol_variant', job.symbol)
        .in('exchange_short_name', [exchangeShortName, 'N/A']) // Check both old and new format
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn(`[fetchExchangeVariantsLogic] Error checking for sentinel record: ${checkError.message}`);
      }

      if (!existingSentinel) {
        // Insert sentinel record
        const { error: upsertError, count } = await supabase
          .from('exchange_variants')
          .upsert(sentinelRecord, {
            onConflict: 'symbol_variant,exchange_short_name',
            count: 'exact',
          });

        if (upsertError) {
          throw new Error(`Database upsert of sentinel record failed: ${upsertError.message}`);
        }
        console.log(`[fetchExchangeVariantsLogic] Created sentinel exchange-variants record for ${job.symbol} (treating as the only variant).`);
      } else {
        // Update existing sentinel record with latest profile data
        // This ensures the sentinel record stays in sync with profile updates
        const updateData: Partial<SupabaseExchangeVariantRecord> = {
          fetched_at: new Date().toISOString(),
        };

        // Update fields from profile if available
        if (profileData) {
          updateData.price = profileData.price ?? null;
          updateData.beta = profileData.beta ?? null;
          updateData.vol_avg = profileData.average_volume ?? null;
          updateData.mkt_cap = profileData.market_cap ?? null;
          updateData.last_div = profileData.last_dividend ?? null;
          updateData.range = profileData.range ?? null;
          updateData.changes = profileData.change ?? null;
          updateData.currency = profileData.currency ?? null;
          updateData.cik = profileData.cik ?? null;
          updateData.isin = profileData.isin ?? null;
          updateData.cusip = profileData.cusip ?? null;
          updateData.exchange = profileData.exchange ?? null;
          updateData.image = profileData.image ?? null;
          updateData.ipo_date = profileData.ipo_date ?? null;
          updateData.default_image = profileData.default_image ?? null;
          updateData.is_actively_trading = profileData.is_actively_trading ?? true;

          // Update exchange_short_name if exchange changed
          if (profileData.exchange) {
            updateData.exchange_short_name = profileData.exchange;
          }
        }

        // CRITICAL: Update using the existing sentinel's exchange_short_name (could be 'N/A' or actual exchange)
        // This allows migration from old format to new format
        const { error: updateError } = await supabase
          .from('exchange_variants')
          .update(updateData)
          .eq('symbol', job.symbol)
          .eq('symbol_variant', job.symbol)
          .in('exchange_short_name', [exchangeShortName, 'N/A']); // Update both old and new format

        if (updateError) {
          console.warn(`[fetchExchangeVariantsLogic] Failed to update sentinel record: ${updateError.message}`);
        } else {
          console.log(`[fetchExchangeVariantsLogic] Updated sentinel exchange-variants record for ${job.symbol} with profile data.`);
        }
      }

      return {
        success: true,
        dataSizeBytes: actualSizeBytes, // Still count the API call size
      };
    }

    // CRITICAL VALIDATION #3: Source Timestamp Check (if available in registry)
    // NOTE: Exchange variants data type does not have a source timestamp in the FMP API response.
    // The exchange-variants endpoint returns variant symbols (e.g., "AAPL.DE" for Apple on Deutsche Börse)
    // with basic quote information. There is no timestamp field in the API response that indicates
    // when the data was last updated. The ipoDate field is a historical business date, not a freshness
    // timestamp. Therefore, source timestamp validation is not applicable for exchange-variants data type.

    // CRITICAL: Map FMP data to Supabase record format
    // NOTE: job.symbol is the symbol (e.g., "AAPL"), and FMP returns variant symbols (e.g., "AAPL.DE")
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
        symbol: job.symbol, // CRITICAL: Use job.symbol as symbol (renamed from base_symbol)
        symbol_variant: fmpEntry.symbol, // Renamed from variant_symbol
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
          onConflict: 'symbol_variant,exchange_short_name',
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

