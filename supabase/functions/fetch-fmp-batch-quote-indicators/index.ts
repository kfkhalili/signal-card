// supabase/functions/fetch-fmp-batch-quote-indicators/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FmpBatchQuoteData,
  LiveQuoteIndicatorRecord,
  SupportedSymbol,
  SymbolQuoteProcessingResult,
  QuoteFunctionResponse,
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

// Use FMP Batch Pre/Post Market Endpoint
const FMP_BATCH_QUOTE_BASE_URL =
  "https://financialmodelingprep.com/api/v4/batch-pre-post-market";

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

async function fetchAndProcessBatchQuotes(
  symbols: string[],
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolQuoteProcessingResult[]> {
  if (symbols.length === 0) {
    return [];
  }

  // Build comma-separated list of symbols
  const symbolsList = symbols.join(",");
  const batchUrl = `${FMP_BATCH_QUOTE_BASE_URL}/${symbolsList}?apikey=${apiKey}`;

  try {
    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Fetching batch quotes for ${symbols.length} symbols from: ${censorApiKey(
          batchUrl,
          apiKey
        )}`
      );
    }

    const batchResponse: Response = await fetch(batchUrl);

    if (!batchResponse.ok) {
      const errorText: string = await batchResponse.text();
      throw new Error(
        `Failed to fetch batch quote data: ${batchResponse.status} ${errorText} from URL: ${batchUrl}`
      );
    }

    // FMP batch endpoint returns an array of quote objects
    const fmpBatchResult: unknown = await batchResponse.json();

    if (!Array.isArray(fmpBatchResult)) {
      throw new Error(
        `No batch quote data array returned from FMP. Response: ${JSON.stringify(
          fmpBatchResult
        )}`
      );
    }

    const batchQuoteData = fmpBatchResult as FmpBatchQuoteData[];

    if (batchQuoteData.length === 0) {
      console.warn("Empty batch quote data array returned from FMP.");
      return symbols.map((symbol) => ({
        symbol,
        success: false,
        message: "No quote data returned from FMP for this symbol.",
      }));
    }

    // Process each quote in the batch
    const recordsToUpsert: LiveQuoteIndicatorRecord[] = [];
    const results: SymbolQuoteProcessingResult[] = [];
    const fetchedAt = new Date().toISOString();

    for (const quoteData of batchQuoteData) {
      if (
        !quoteData ||
        !quoteData.symbol ||
        typeof quoteData.ask !== "number" ||
        typeof quoteData.timestamp !== "number"
      ) {
        results.push({
          symbol: quoteData?.symbol || "UNKNOWN",
          success: false,
          message: `Invalid quote data from FMP: ${JSON.stringify(quoteData)}`,
        });
        continue;
      }

      const actualFmpSymbol = quoteData.symbol;

      // Convert timestamp from milliseconds to seconds (FMP batch API uses milliseconds)
      const apiTimestampSeconds = Math.floor(quoteData.timestamp / 1000);

      // Use ask price as current_price (or could use midpoint: (ask + bid) / 2)
      const recordToUpsert: LiveQuoteIndicatorRecord = {
        symbol: actualFmpSymbol,
        current_price: quoteData.ask,
        change_percentage: null,
        day_change: null,
        volume: null,
        day_low: null,
        day_high: null,
        market_cap: null,
        day_open: null,
        previous_close: null,
        api_timestamp: apiTimestampSeconds,
        sma_50d: null,
        sma_200d: null,
        fetched_at: fetchedAt,
        year_high: null,
        year_low: null,
        exchange: null,
      };

      recordsToUpsert.push(recordToUpsert);
    }

    // Bulk upsert all records
    if (recordsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("live_quote_indicators")
        .upsert(recordsToUpsert, { onConflict: "symbol" });

      if (upsertError) {
        console.error("Supabase bulk upsert error:", upsertError);
        throw new Error(
          `Supabase bulk upsert failed: ${upsertError.message}`
        );
      }

      // Mark all successfully upserted records as successful
      for (const record of recordsToUpsert) {
        results.push({
          symbol: record.symbol,
          success: true,
          message: `Batch quote data processed for ${record.symbol}.`,
        });
      }
    }

    // Check for symbols that were requested but not returned in the response
    const returnedSymbols = new Set(batchQuoteData.map((q) => q.symbol));
    for (const symbol of symbols) {
      if (!returnedSymbols.has(symbol)) {
        results.push({
          symbol,
          success: false,
          message: `Symbol ${symbol} was requested but not returned in batch response.`,
        });
      }
    }

    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Successfully upserted ${recordsToUpsert.length} quote records from batch.`
      );
    }

    return results;
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing batch quotes for ${symbols.length} symbols: ${errorMessage}`
    );
    // Return failure results for all symbols
    return symbols.map((symbol) => ({
      symbol,
      success: false,
      message: `Failed to process batch quote for ${symbol}: ${errorMessage}`,
    }));
  }
}

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const invocationTime: string = new Date().toISOString();
  console.log(
    `Edge function 'fetch-fmp-batch-quote-indicators' invoked at: ${invocationTime}`
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

    const symbolList = activeSymbols.map((s) => s.symbol);

    console.log(
      `Found ${activeSymbols.length} active symbols to process: ${symbolList.join(", ")}`
    );

    // Fetch and process all symbols in a single batch API call
    const results: SymbolQuoteProcessingResult[] =
      await fetchAndProcessBatchQuotes(
        symbolList,
        FMP_API_KEY!,
        supabaseAdmin
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
      "Critical error in 'fetch-fmp-batch-quote-indicators' Edge Function:",
      errorMessage
    );
    const errorResponse: QuoteFunctionResponse = {
      message: "An internal server error occurred during batch quote fetching.",
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

