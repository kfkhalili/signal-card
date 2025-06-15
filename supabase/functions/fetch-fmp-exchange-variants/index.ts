// supabase/functions/fetch-fmp-exchange-variants/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FmpExchangeVariantData,
  SupabaseExchangeVariantRecord,
  SupportedSymbol,
  SymbolProcessingResult,
  FunctionResponse,
} from "./types.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENV_CONTEXT: string = Deno.env.get("ENV_CONTEXT") || "PROD";
const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");
const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const FMP_EXCHANGE_VARIANTS_BASE_URL =
  "https://financialmodelingprep.com/stable/search-exchange-variants";
const FMP_API_DELAY_MS = 150;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

async function fetchAndProcessSymbolExchangeVariants(
  baseSymbol: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolProcessingResult> {
  const variantsUrl = `${FMP_EXCHANGE_VARIANTS_BASE_URL}?symbol=${baseSymbol}&apikey=${apiKey}`;
  let fetchedCount = 0;
  let upsertedCount = 0;

  try {
    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Fetching exchange variants for ${baseSymbol} from: ${variantsUrl}`
      );
    }

    const response: Response = await fetch(variantsUrl);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch exchange variants for ${baseSymbol}: ${response.status} ${errorText} from URL: ${variantsUrl}`
      );
    }

    const fmpVariantsResult: unknown = await response.json();

    if (!Array.isArray(fmpVariantsResult)) {
      throw new Error(
        `Invalid exchange variants data array returned from FMP for ${baseSymbol}. Response: ${JSON.stringify(
          fmpVariantsResult
        )}`
      );
    }

    fetchedCount = fmpVariantsResult.length;
    if (fetchedCount === 0) {
      return {
        symbol: baseSymbol,
        success: true,
        message: `No exchange variant entries found for ${baseSymbol}.`,
        fetchedCount: 0,
        upsertedCount: 0,
      };
    }

    const recordsToUpsert: SupabaseExchangeVariantRecord[] = (
      fmpVariantsResult as FmpExchangeVariantData[]
    )
      .filter((fmpEntry) => {
        const isValid = fmpEntry.symbol && fmpEntry.exchangeShortName;
        if (!isValid) {
          console.warn(
            `Skipping invalid FMP exchange variant record for ${baseSymbol} due to missing symbol or exchangeShortName:`,
            fmpEntry
          );
        }
        return isValid;
      })
      .map((fmpEntry) => ({
        base_symbol: baseSymbol,
        variant_symbol: fmpEntry.symbol,
        exchange_short_name: fmpEntry.exchangeShortName,
        price: fmpEntry.price,
        beta: fmpEntry.beta,
        vol_avg: fmpEntry.volAvg !== null ? Math.trunc(fmpEntry.volAvg) : null,
        mkt_cap: fmpEntry.mktCap !== null ? Math.trunc(fmpEntry.mktCap) : null,
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
      }));

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabaseAdmin
        .from("exchange_variants")
        .upsert(recordsToUpsert, {
          onConflict: "variant_symbol,exchange_short_name",
          count: "exact",
        });

      if (upsertError) {
        throw new Error(
          `Supabase upsert failed for ${baseSymbol}: ${upsertError.message}`
        );
      }
      upsertedCount = count || 0;
    }

    return {
      symbol: baseSymbol,
      success: true,
      message: `Exchange variants data processed for ${baseSymbol}. Fetched: ${fetchedCount}, Upserted: ${upsertedCount}.`,
      fetchedCount,
      upsertedCount,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    return {
      symbol: baseSymbol,
      success: false,
      message: `Failed to process exchange variants for ${baseSymbol}: ${errorMessage}`,
      fetchedCount: 0,
      upsertedCount: 0,
    };
  }
}

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({
        message:
          "Server configuration error: Missing API keys or Supabase URL.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: symbolsData, error: symbolsError } = await supabaseAdmin
      .from("supported_symbols")
      .select("symbol")
      .eq("is_active", true);

    if (symbolsError) throw symbolsError;

    const activeSymbols: SupportedSymbol[] = symbolsData || [];
    if (activeSymbols.length === 0) {
      return new Response(JSON.stringify({ message: "No active symbols." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const processingResults: SymbolProcessingResult[] = [];
    for (const [index, symbolEntry] of activeSymbols.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
      }
      const result = await fetchAndProcessSymbolExchangeVariants(
        symbolEntry.symbol,
        FMP_API_KEY,
        supabaseAdmin
      );
      processingResults.push(result);
    }

    const totalSymbolsProcessed = activeSymbols.length;
    const totalVariantsFetched = processingResults.reduce(
      (acc, r) => acc + r.fetchedCount,
      0
    );
    const totalVariantsUpserted = processingResults.reduce(
      (acc, r) => acc + r.upsertedCount,
      0
    );

    const response: FunctionResponse = {
      message: `Processing complete. Symbols: ${totalSymbolsProcessed}, Fetched: ${totalVariantsFetched}, Upserted: ${totalVariantsUpserted}.`,
      details: processingResults,
      totalSymbolsProcessed,
      totalVariantsFetched,
      totalVariantsUpserted,
    };

    const allSuccessful = processingResults.every((r) => r.success);
    return new Response(JSON.stringify(response), {
      status: allSuccessful ? 200 : 207,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
