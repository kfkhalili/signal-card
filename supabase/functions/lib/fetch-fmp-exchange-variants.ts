// supabase/functions/lib/fetch-fmp-exchange-variants.ts
// Library function for processing exchange-variants jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpExchangeVariantData,
  SupabaseExchangeVariantRecord,
} from '../fetch-fmp-exchange-variants/types.ts';
import {
  syncExchangeVariantQualityFindings,
  validateExchangeVariantsResponse,
} from './exchange-variants-quality.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_EXCHANGE_VARIANTS_BASE_URL = 'https://financialmodelingprep.com/stable/search-exchange-variants';
const NON_RETRYABLE_DATA_QUALITY_PREFIX = 'Non-retryable data-quality failure:';

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

  let actualSizeBytes = 0;

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
    actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
    if (actualSizeBytes === 0) {
      console.warn(`[fetchExchangeVariantsLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 80000; // 80 KB conservative estimate
    }

    const fmpVariantsResult: unknown = await response.json();

    if (!Array.isArray(fmpVariantsResult)) {
      throw new Error(`FMP API returned invalid response format for ${job.symbol}. Expected array, got: ${typeof fmpVariantsResult}`);
    }

    let qualityFindings: ReturnType<typeof validateExchangeVariantsResponse>;

    if (fmpVariantsResult.length === 0) {
      qualityFindings = validateExchangeVariantsResponse({
        symbol: job.symbol,
        response: fmpVariantsResult,
        profileExchange: null,
        profileExists: true,
        knownExchanges: [],
        existingVariants: [],
        variantOwners: [],
      });
    } else {
      const incomingVariantSymbols = [...new Set(
        fmpVariantsResult
          .map((entry) =>
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? (entry as Record<string, unknown>).symbol
              : null
          )
          .filter((symbol): symbol is string =>
            typeof symbol === 'string' && symbol.trim().length > 0
          )
          .map((symbol) => symbol.trim().toUpperCase()),
      )];
      const ownershipPromise = incomingVariantSymbols.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from('exchange_variants')
          .select('symbol, symbol_variant, exchange_short_name')
          .in('symbol_variant', incomingVariantSymbols);
      const [
        profileResult,
        existingResult,
        exchangesResult,
        ownershipResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('exchange')
          .eq('symbol', job.symbol)
          .maybeSingle(),
        supabase
          .from('exchange_variants')
          .select('symbol_variant, exchange_short_name, is_actively_trading')
          .eq('symbol', job.symbol),
        supabase.from('available_exchanges').select('exchange'),
        ownershipPromise,
      ]);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        throw new Error(`Profile lookup failed: ${profileResult.error.message}`);
      }
      if (existingResult.error) {
        throw new Error(`Existing variant lookup failed: ${existingResult.error.message}`);
      }
      if (exchangesResult.error) {
        throw new Error(`Exchange registry lookup failed: ${exchangesResult.error.message}`);
      }
      if (ownershipResult.error) {
        throw new Error(`Variant ownership lookup failed: ${ownershipResult.error.message}`);
      }

      qualityFindings = validateExchangeVariantsResponse({
        symbol: job.symbol,
        response: fmpVariantsResult,
        profileExchange: profileResult.data?.exchange ?? null,
        profileExists: profileResult.data != null,
        knownExchanges: (exchangesResult.data ?? []).map((row) => row.exchange),
        existingVariants: existingResult.data ?? [],
        variantOwners: ownershipResult.data ?? [],
      });
    }

    if (qualityFindings.length > 0) {
      await syncExchangeVariantQualityFindings(
        supabase,
        job,
        qualityFindings,
        actualSizeBytes,
      );
      return {
        success: false,
        dataSizeBytes: actualSizeBytes,
        error: `${NON_RETRYABLE_DATA_QUALITY_PREFIX} Exchange-variant response failed data-quality checks for ${job.symbol}: ${[
          ...new Set(qualityFindings.map((finding) => finding.checkCode)),
        ].join(', ')}. Stored data was preserved.`,
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
    const recordsToReplace: SupabaseExchangeVariantRecord[] = (
      fmpVariantsResult as FmpExchangeVariantData[]
    )
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

    const { error: replaceError } = await supabase.rpc(
      'replace_exchange_variants_v2',
      { p_symbol: job.symbol, p_records: recordsToReplace },
    );
    if (replaceError) {
      throw new Error(`Atomic exchange-variant replacement failed: ${replaceError.message}`);
    }

    await syncExchangeVariantQualityFindings(
      supabase,
      job,
      [],
      actualSizeBytes,
    );

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    return {
      success: false,
      dataSizeBytes: actualSizeBytes,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
