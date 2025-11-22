// supabase/functions/fetch-fmp-quote-indicators/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  FmpQuoteData,
  LiveQuoteIndicatorRecord,
  SupportedSymbol,
  SymbolQuoteProcessingResult,
  QuoteFunctionResponse,
} from "./types.ts";

const ENV_CONTEXT: string = Deno.env.get("ENV_CONTEXT") || "PROD";
const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");
const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

// Use FMP Stable Endpoint for quotes
const FMP_QUOTE_BASE_URL = "https://financialmodelingprep.com/stable/quote";

// Delay between API calls to FMP to avoid rate limiting
const FMP_API_DELAY_MS = 250; // 0.25 seconds, adjust as needed

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

function censorApiKey(url: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.length < 8) return url;
  const censoredPart = apiKey
    .substring(4, apiKey.length - 4)
    .replace(/./g, "*");
  const displayApiKey =
    apiKey.substring(0, 4) + censoredPart + apiKey.substring(apiKey.length - 4);
  const apiKeyPattern = new RegExp(
    `(apikey=)(${encodeURIComponent(apiKey)})([&]|$)`,
    "i"
  );
  return url.replace(apiKeyPattern, `$1${displayApiKey}$3`);
}

async function fetchAndProcessSymbolQuote(
  symbolToRequest: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolQuoteProcessingResult> {
  // The FMP /stable/quote?symbol={SYMBOL} endpoint is used here.
  const quoteUrl = `${FMP_QUOTE_BASE_URL}?symbol=${symbolToRequest}&apikey=${apiKey}`;

  try {
    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Fetching quote for ${symbolToRequest} from: ${censorApiKey(
          quoteUrl,
          apiKey
        )}`
      );
    }

    const quoteResponse: Response = await fetch(quoteUrl);

    if (!quoteResponse.ok) {
      const errorText: string = await quoteResponse.text();
      throw new Error(
        `Failed to fetch quote data for ${symbolToRequest}: ${quoteResponse.status} ${errorText} from URL: ${quoteUrl}`
      );
    }

    // FMP /quote/SYMBOL typically returns an array even for one symbol.
    const fmpQuoteResult: unknown = await quoteResponse.json();

    if (!Array.isArray(fmpQuoteResult) || fmpQuoteResult.length === 0) {
      throw new Error(
        `No quote data array returned or empty array from FMP for ${symbolToRequest}. Response: ${JSON.stringify(
          fmpQuoteResult
        )}`
      );
    }

    const quoteData = fmpQuoteResult[0] as FmpQuoteData; // Assuming the first item is the correct quote

    if (
      !quoteData ||
      !quoteData.symbol ||
      typeof quoteData.price !== "number" ||
      typeof quoteData.timestamp !== "number"
    ) {
      throw new Error(
        `Empty, invalid, or incomplete quote data object from FMP for ${symbolToRequest}. Payload: ${JSON.stringify(
          quoteData
        )}`
      );
    }

    const actualFmpSymbol = quoteData.symbol; // Use symbol from FMP response for consistency

    const recordToUpsert: LiveQuoteIndicatorRecord = {
      symbol: actualFmpSymbol,
      current_price: quoteData.price,
      change_percentage:
        quoteData.changesPercentage ?? quoteData.changePercentage ?? null,
      day_change:
        typeof quoteData.change === "number" ? quoteData.change : null,
      // CRITICAL: Truncate bigint values (volume, market_cap) to integers
      // FMP API sometimes returns decimals like "3955124346827.0005" which breaks bigint columns
      volume: typeof quoteData.volume === "number" ? Math.trunc(quoteData.volume) : null,
      day_low: typeof quoteData.dayLow === "number" ? quoteData.dayLow : null,
      day_high:
        typeof quoteData.dayHigh === "number" ? quoteData.dayHigh : null,
      market_cap:
        typeof quoteData.marketCap === "number" ? Math.trunc(quoteData.marketCap) : null,
      day_open: typeof quoteData.open === "number" ? quoteData.open : null,
      previous_close:
        typeof quoteData.previousClose === "number"
          ? quoteData.previousClose
          : null,
      api_timestamp: quoteData.timestamp,
      sma_50d:
        typeof quoteData.priceAvg50 === "number" ? quoteData.priceAvg50 : null,
      sma_200d:
        typeof quoteData.priceAvg200 === "number"
          ? quoteData.priceAvg200
          : null,
      fetched_at: new Date().toISOString(),
      year_high:
        typeof quoteData.yearHigh === "number" ? quoteData.yearHigh : null,
      year_low:
        typeof quoteData.yearLow === "number" ? quoteData.yearLow : null,
      exchange: quoteData.exchange || null,
    };

    const { error: upsertError } = await supabaseAdmin
      .from("live_quote_indicators")
      .upsert(recordToUpsert, { onConflict: "symbol" });

    if (upsertError) {
      console.error(
        `Supabase upsert error for ${actualFmpSymbol}:`,
        upsertError
      );
      throw new Error(
        `Supabase upsert failed for ${actualFmpSymbol}: ${upsertError.message}`
      );
    }

    // Optionally, update a field like 'last_processed_quote_at' in 'supported_symbols'
    // This requires the 'supported_symbols' table to have such a column.
    /*
    const { error: updateSupportedSymbolError } = await supabaseAdmin
        .from('supported_symbols')
        .update({ last_processed_quote_at: new Date().toISOString() })
        .eq('symbol', symbolToRequest); // Use the original symbol from our DB for matching

    if (updateSupportedSymbolError) {
        console.warn(`Failed to update last_processed_quote_at for ${symbolToRequest}: ${updateSupportedSymbolError.message}`);
        // This might not be a critical failure for the overall process.
    }
    */

    if (ENV_CONTEXT === "DEV") {
      console.log(`Successfully upserted quote data for ${actualFmpSymbol}.`);
    }
    return {
      symbol: actualFmpSymbol,
      success: true,
      message: `Quote data processed for ${actualFmpSymbol}.`,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing quote for ${symbolToRequest}: ${errorMessage}`
    );
    return {
      symbol: symbolToRequest,
      success: false,
      message: `Failed to process quote for ${symbolToRequest}: ${errorMessage}`,
    };
  }
}

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // --- 🔒 Centralized Authorization Check ---
  const authError = ensureCronAuth(_req);
  if (authError) {
    return authError; // Return the 401/500 response
  }
  // --- ✅ Auth Check Passed ---

  const invocationTime: string = new Date().toISOString();
  console.log(
    `Edge function 'fetch-fmp-quote-indicators' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: QuoteFunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalProcessed: 0,
      totalSucceeded: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
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

    if (symbolsError) {
      console.error(
        "Error fetching symbols from 'supported_symbols':",
        symbolsError
      );
      throw new Error(
        `Supabase error fetching symbols: ${symbolsError.message}`
      );
    }

    const activeSymbols: SupportedSymbol[] = (symbolsData ||
      []) as SupportedSymbol[];

    if (activeSymbols.length === 0) {
      console.log("No active symbols found in 'supported_symbols' table.");
      const response: QuoteFunctionResponse = {
        message: "No active symbols to process.",
        details: [],
        totalProcessed: 0,
        totalSucceeded: 0,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(
      `Found ${activeSymbols.length} active symbols to process: ${activeSymbols
        .map((s: SupportedSymbol) => s.symbol)
        .join(", ")}`
    );

    const processingPromises = activeSymbols.map(
      (s, index) =>
        new Promise<SymbolQuoteProcessingResult>(
          (resolve) =>
            setTimeout(async () => {
              const result = await fetchAndProcessSymbolQuote(
                s.symbol,
                FMP_API_KEY,
                supabaseAdmin
              );
              resolve(result);
            }, index * FMP_API_DELAY_MS) // Stagger API calls
        )
    );

    const results: SymbolQuoteProcessingResult[] = await Promise.all(
      processingPromises
    );

    const totalSucceeded = results.filter((r) => r.success).length;
    const allProcessedSuccessfully = totalSucceeded === activeSymbols.length;

    const responseMessage = allProcessedSuccessfully
      ? "All symbol quotes processed successfully."
      : `Processed ${totalSucceeded}/${activeSymbols.length} symbols successfully. Some failures occurred.`;

    if (ENV_CONTEXT === "DEV" || !allProcessedSuccessfully) {
      results.forEach((r) =>
        console.log(
          `Symbol: ${r.symbol}, Success: ${r.success}, Message: ${r.message}`
        )
      );
    }

    const response: QuoteFunctionResponse = {
      message: responseMessage,
      details: results,
      totalProcessed: activeSymbols.length,
      totalSucceeded: totalSucceeded,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: allProcessedSuccessfully ? 200 : 207, // 207 Multi-Status if partial success
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-quote-indicators' Edge Function:",
      errorMessage
    );
    const errorResponse: QuoteFunctionResponse = {
      message: "An internal server error occurred during quote fetching.",
      details: [{ symbol: "N/A", success: false, message: errorMessage }],
      totalProcessed: 0,
      totalSucceeded: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
