// supabase/functions/fetch-fmp-quote-indicators/index.ts
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Interface for FMP Quote Data (matches your Edge Function's current FmpQuoteData)
interface FmpQuoteData {
  symbol: string;
  name?: string; // Optional, as it's primarily in profiles table
  price: number;
  changesPercentage?: number | null; // FMP uses 'changesPercentage' sometimes
  changePercentage?: number | null; // And sometimes 'changePercentage'
  change: number;
  volume: number;
  dayLow: number;
  dayHigh: number;
  yearHigh?: number | null;
  yearLow?: number | null;
  marketCap: number | null;
  priceAvg50?: number | null;
  priceAvg200?: number | null;
  exchange?: string; // This is the key for linking to exchange_market_status
  open: number;
  previousClose: number;
  timestamp: number; // Unix timestamp (seconds) from FMP
}

// Interface for the record to be upserted into your live_quote_indicators table
// This now matches your DDL *after* the proposed alterations.
interface LiveQuoteIndicatorRecord {
  // id: string; // Not needed for upsert if using symbol as conflict target
  symbol: string;
  current_price: number;
  change_percentage?: number | null;
  day_change: number | null; // Made nullable to match DDL more closely if FMP `change` can be null
  volume: number | null; // Made nullable
  day_low: number | null; // Made nullable
  day_high: number | null; // Made nullable
  market_cap: number | null; // bigint in DDL maps to number, can be null
  day_open: number | null; // Made nullable
  previous_close: number | null; // Made nullable
  api_timestamp: number; // bigint in DDL, from FMP (seconds)
  sma_50d?: number | null;
  sma_200d?: number | null;
  fetched_at: string; // ISO string for timestamptz
  year_high?: number | null;
  year_low?: number | null;
  exchange?: string | null; // New column to store FMP's 'exchange'
}

// Symbols to process - keep this list updated or fetch dynamically
const SYMBOLS_TO_PROCESS: string[] = [
  "AAPL",
  "MSFT",
  "GOOG",
  "TSLA",
  "NVDA",
  "AMD",
  "GME",
  "BTCUSD",
  "ETHUSD",
  "ADAUSD",
];

console.log(
  `Function "fetch-fmp-quote-indicators" (schema-aligned) up and running for symbols: ${SYMBOLS_TO_PROCESS.join(
    ", "
  )}`
);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred.";
}

function censorApiKey(url: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.length < 5) return url;
  const apiKeyPattern = new RegExp(`(apikey=)(${apiKey})([&]|$)`, "i");
  return url.replace(apiKeyPattern, "$1[CENSORED_API_KEY]$3");
}

async function fetchAndProcessSymbolQuote(
  symbolToRequest: string, // The symbol we intend to fetch
  fmpApiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<{ symbol: string; success: boolean; message: string }> {
  try {
    // FMP's /api/v3/quote/ endpoint is good for single or multiple symbols
    // FMP's /api/v3/quote-short/ is also an option for fewer fields
    const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolToRequest}?apikey=${fmpApiKey}`;

    if (Deno.env.get("ENV_CONTEXT") === "DEV") {
      console.log(
        `Workspaceing quote for ${symbolToRequest} from: ${censorApiKey(
          quoteUrl,
          fmpApiKey
        )}`
      );
    }

    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      throw new Error(
        `Failed to fetch quote data for ${symbolToRequest}: ${
          quoteResponse.status
        } ${await quoteResponse.text()}`
      );
    }

    const fmpQuoteResult: FmpQuoteData[] | FmpQuoteData =
      await quoteResponse.json();
    let quoteData: FmpQuoteData;

    // FMP /quote/SYMBOL typically returns an array even for one symbol.
    if (Array.isArray(fmpQuoteResult)) {
      if (fmpQuoteResult.length === 0) {
        throw new Error(
          `No quote data array returned from FMP for ${symbolToRequest}.`
        );
      }
      quoteData = fmpQuoteResult[0];
    } else if (typeof fmpQuoteResult === "object" && fmpQuoteResult !== null) {
      // Handle cases where FMP might return a single object if URL was /api/v3/quote/SYMBOL directly
      quoteData = fmpQuoteResult;
    } else {
      throw new Error(`Unexpected FMP response format for ${symbolToRequest}.`);
    }

    if (!quoteData || !quoteData.symbol) {
      throw new Error(
        `Empty or invalid quote data object from FMP for ${symbolToRequest}. Payload: ${JSON.stringify(
          quoteData
        )}`
      );
    }

    // Use the symbol returned by FMP as it might be canonical (e.g., BTCUSD vs BTC-USD)
    const actualFmpSymbol = quoteData.symbol;

    // Basic validation for essential numeric fields and timestamp
    if (
      typeof quoteData.price !== "number" || // price is NOT NULL in your DDL
      typeof quoteData.timestamp !== "number" || // api_timestamp is NOT NULL
      quoteData.timestamp <= 0
    ) {
      throw new Error(
        `Invalid essential numeric data or timestamp in quote for ${actualFmpSymbol}. Price: ${quoteData.price}, Timestamp: ${quoteData.timestamp}`
      );
    }
    if (Deno.env.get("ENV_CONTEXT") === "DEV") {
      console.log(
        `Processing data for ${actualFmpSymbol}: Price=${quoteData.price}, Exchange: ${quoteData.exchange}`
      );
    }

    // Prepare the record for upsert, matching your DDL structure
    const recordToUpsert: LiveQuoteIndicatorRecord = {
      symbol: actualFmpSymbol, // Use symbol from FMP response
      current_price: quoteData.price,
      // Use `changesPercentage` if available, else `changePercentage` (FMP can be inconsistent)
      change_percentage:
        quoteData.changesPercentage ?? quoteData.changePercentage ?? null,
      day_change:
        typeof quoteData.change === "number" ? quoteData.change : null,
      day_low: typeof quoteData.dayLow === "number" ? quoteData.dayLow : null,
      day_high:
        typeof quoteData.dayHigh === "number" ? quoteData.dayHigh : null,
      year_high:
        typeof quoteData.yearHigh === "number" ? quoteData.yearHigh : null,
      year_low:
        typeof quoteData.yearLow === "number" ? quoteData.yearLow : null,
      market_cap:
        typeof quoteData.marketCap === "number" ? quoteData.marketCap : null,
      day_open: typeof quoteData.open === "number" ? quoteData.open : null,
      previous_close:
        typeof quoteData.previousClose === "number"
          ? quoteData.previousClose
          : null,
      api_timestamp: quoteData.timestamp, // This is seconds from FMP
      volume: typeof quoteData.volume === "number" ? quoteData.volume : null,
      sma_50d:
        typeof quoteData.priceAvg50 === "number" ? quoteData.priceAvg50 : null,
      sma_200d:
        typeof quoteData.priceAvg200 === "number"
          ? quoteData.priceAvg200
          : null,
      fetched_at: new Date().toISOString(),
      exchange: quoteData.exchange || null, // Store the exchange code from FMP
    };

    const { error: upsertError } = await supabaseAdmin
      .from("live_quote_indicators")
      .upsert(recordToUpsert, { onConflict: "symbol" }); // Upsert based on the symbol

    if (upsertError) {
      console.error("Supabase upsert error details:", upsertError);
      throw new Error(
        `Supabase upsert failed for ${recordToUpsert.symbol}: ${upsertError.message}`
      );
    }

    if (Deno.env.get("ENV_CONTEXT") === "DEV") {
      console.log(
        `Successfully upserted quote data for ${recordToUpsert.symbol}.`
      );
    }
    return {
      symbol: recordToUpsert.symbol,
      success: true,
      message: `Quote data processed for ${recordToUpsert.symbol}.`,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing quote for ${symbolToRequest}: ${errorMessage}`,
      error instanceof Error ? error.stack : ""
    );
    return {
      symbol: symbolToRequest, // Return the symbol we attempted
      success: false,
      message: `Failed to process quote for ${symbolToRequest}: ${errorMessage}`,
    };
  }
}

// --- Main Deno Serve Function ---
Deno.serve(async (req: Request) => {
  // ... (OPTIONS handling and initial env var checks remain the same) ...
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  console.log(
    "Edge function 'fetch-fmp-quote-indicators' (schema-aligned) invoked at:",
    new Date().toISOString()
  );

  const fmpApiKey = Deno.env.get("FMP_API_KEY");
  if (!fmpApiKey) {
    console.error("Missing FMP_API_KEY environment variable.");
    return new Response(
      JSON.stringify({
        error: "Server configuration error: Missing FMP API Key.",
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase environment variables.");
    return new Response(
      JSON.stringify({
        error: "Server configuration error: Missing Supabase credentials.",
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }

  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  );

  const symbolsToFetch = SYMBOLS_TO_PROCESS;
  if (!symbolsToFetch || symbolsToFetch.length === 0) {
    return new Response(
      JSON.stringify({ message: "No symbols configured to process." }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  const results: Array<{ symbol: string; success: boolean; message: string }> =
    [];
  let overallSuccessCount = 0;

  for (const symbol of symbolsToFetch) {
    // Optional: Add delay if needed for FMP rate limits
    // if (results.length > 0) await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between symbols

    const result = await fetchAndProcessSymbolQuote(
      symbol,
      fmpApiKey,
      supabaseAdmin
    );
    results.push(result);
    if (result.success) {
      overallSuccessCount++;
    }
  }

  const allProcessedSuccessfully =
    overallSuccessCount === symbolsToFetch.length;

  return new Response(
    JSON.stringify({
      message: allProcessedSuccessfully
        ? "All symbol quotes processed successfully."
        : `Processed ${overallSuccessCount}/${symbolsToFetch.length} symbols successfully. Some failures occurred.`,
      results,
    }),
    {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: allProcessedSuccessfully ? 200 : 207, // 207 Multi-Status if some failures
    }
  );
});
