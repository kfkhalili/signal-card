// supabase/functions/fetch-fmp-exchange-prices-api/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FmpExchangeQuoteData,
  LiveQuoteIndicatorRecord,
  ExchangeQuoteProcessingResult,
  ExchangeQuoteFunctionResponse,
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

// Use FMP Exchange Quotes Endpoint
const FMP_EXCHANGE_QUOTE_BASE_URL =
  "https://financialmodelingprep.com/api/v3/quotes";

// Hardcoded exchanges to fetch
const EXCHANGES = ["NYSE", "NASDAQ"];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

async function fetchAndProcessExchangeQuotes(
  exchange: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<ExchangeQuoteProcessingResult> {
  const exchangeUrl = `${FMP_EXCHANGE_QUOTE_BASE_URL}/${exchange}?apikey=${apiKey}`;

  try {
    const exchangeResponse: Response = await fetch(exchangeUrl);

    if (!exchangeResponse.ok) {
      const errorText: string = await exchangeResponse.text();
      throw new Error(
        `Failed to fetch exchange quote data for ${exchange}: ${exchangeResponse.status} ${errorText} from URL: ${exchangeUrl}`
      );
    }

    // FMP exchange endpoint returns an array of quote objects
    const fmpExchangeResult: unknown = await exchangeResponse.json();

    if (!Array.isArray(fmpExchangeResult)) {
      throw new Error(
        `No exchange quote data array returned from FMP for ${exchange}. Response: ${JSON.stringify(
          fmpExchangeResult
        )}`
      );
    }

    const exchangeQuoteData = fmpExchangeResult as FmpExchangeQuoteData[];

    if (exchangeQuoteData.length === 0) {
      console.warn(`Empty exchange quote data array returned from FMP for ${exchange}.`);
      return {
        exchange,
        success: false,
        message: `No quote data returned from FMP for ${exchange}.`,
        recordsProcessed: 0,
      };
    }

    // Process each quote in the exchange response
    // Use batching to reduce memory usage
    const BATCH_SIZE = 500; // Process in batches of 500 records
    const fetchedAt = new Date().toISOString();
    let totalProcessed = 0;
    let currentBatch: LiveQuoteIndicatorRecord[] = [];

    for (const quoteData of exchangeQuoteData) {
      // Skip records with missing required fields or null price
      if (
        !quoteData ||
        !quoteData.symbol ||
        quoteData.price === null ||
        quoteData.price === undefined ||
        typeof quoteData.price !== "number" ||
        typeof quoteData.timestamp !== "number"
      ) {
        continue;
      }

      const actualFmpSymbol = quoteData.symbol;

      // FMP /api/v3/quotes endpoint uses timestamp in seconds (not milliseconds)
      const apiTimestampSeconds = quoteData.timestamp;

      const recordToUpsert: LiveQuoteIndicatorRecord = {
        symbol: actualFmpSymbol,
        current_price: quoteData.price,
        change_percentage:
          typeof quoteData.changesPercentage === "number"
            ? quoteData.changesPercentage
            : null,
        day_change:
          typeof quoteData.change === "number" ? quoteData.change : null,
        volume:
          typeof quoteData.volume === "number"
            ? Math.floor(quoteData.volume)
            : null,
        day_low:
          typeof quoteData.dayLow === "number" ? quoteData.dayLow : null,
        day_high:
          typeof quoteData.dayHigh === "number" ? quoteData.dayHigh : null,
        market_cap:
          typeof quoteData.marketCap === "number"
            ? Math.floor(quoteData.marketCap)
            : null,
        day_open: typeof quoteData.open === "number" ? quoteData.open : null,
        previous_close:
          typeof quoteData.previousClose === "number"
            ? quoteData.previousClose
            : null,
        api_timestamp: apiTimestampSeconds,
        sma_50d:
          typeof quoteData.priceAvg50 === "number" ? quoteData.priceAvg50 : null,
        sma_200d:
          typeof quoteData.priceAvg200 === "number"
            ? quoteData.priceAvg200
            : null,
        fetched_at: fetchedAt,
        year_high:
          typeof quoteData.yearHigh === "number" ? quoteData.yearHigh : null,
        year_low:
          typeof quoteData.yearLow === "number" ? quoteData.yearLow : null,
        exchange: quoteData.exchange || exchange,
      };

      currentBatch.push(recordToUpsert);

      // Upsert in batches to reduce memory usage
      if (currentBatch.length >= BATCH_SIZE) {
        const { error: upsertError } = await supabaseAdmin
          .from("live_quote_indicators")
          .upsert(currentBatch, { onConflict: "symbol" });

        if (upsertError) {
          console.error(
            `Supabase bulk upsert error for ${exchange} (batch):`,
            upsertError
          );
          throw new Error(
            `Supabase bulk upsert failed for ${exchange}: ${upsertError.message}`
          );
        }

        totalProcessed += currentBatch.length;
        currentBatch = []; // Clear batch to free memory
      }
    }

    // Upsert remaining records in the final batch
    if (currentBatch.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("live_quote_indicators")
        .upsert(currentBatch, { onConflict: "symbol" });

      if (upsertError) {
        console.error(
          `Supabase bulk upsert error for ${exchange} (final batch):`,
          upsertError
        );
        throw new Error(
          `Supabase bulk upsert failed for ${exchange}: ${upsertError.message}`
        );
      }

      totalProcessed += currentBatch.length;
    }

    if (totalProcessed > 0) {
      return {
        exchange,
        success: true,
        message: `Successfully processed ${totalProcessed} quotes for ${exchange}.`,
        recordsProcessed: totalProcessed,
      };
    }

    return {
      exchange,
      success: false,
      message: `No valid records to upsert for ${exchange}.`,
      recordsProcessed: 0,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing exchange quotes for ${exchange}: ${errorMessage}`
    );
    return {
      exchange,
      success: false,
      message: `Failed to process exchange quotes for ${exchange}: ${errorMessage}`,
      recordsProcessed: 0,
    };
  }
}

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const invocationTime: string = new Date().toISOString();
  console.log(
    `Edge function 'fetch-fmp-exchange-prices-api' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: ExchangeQuoteFunctionResponse = {
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

    // Fetch and process exchanges sequentially to reduce memory usage
    const results: ExchangeQuoteProcessingResult[] = [];
    for (const exchange of EXCHANGES) {
      if (!FMP_API_KEY) {
        throw new Error("FMP_API_KEY is not set");
      }
      const result = await fetchAndProcessExchangeQuotes(
        exchange,
        FMP_API_KEY,
        supabaseAdmin
      );
      results.push(result);
    }

    const totalSucceeded = results.filter((r) => r.success).length;
    const totalProcessed = results.reduce(
      (sum, r) => sum + r.recordsProcessed,
      0
    );
    const allProcessedSuccessfully = totalSucceeded === EXCHANGES.length;

    const responseMessage = allProcessedSuccessfully
      ? `All exchanges processed successfully. Total records: ${totalProcessed}.`
      : `Processed ${totalSucceeded}/${EXCHANGES.length} exchanges successfully. Total records: ${totalProcessed}. Some failures occurred.`;

    if (ENV_CONTEXT === "DEV" || !allProcessedSuccessfully) {
      results.forEach((r) =>
        console.log(
          `Exchange: ${r.exchange}, Success: ${r.success}, Records: ${r.recordsProcessed}, Message: ${r.message}`
        )
      );
    }

    const response: ExchangeQuoteFunctionResponse = {
      message: responseMessage,
      details: results,
      totalProcessed: totalProcessed,
      totalSucceeded: totalSucceeded,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: allProcessedSuccessfully ? 200 : 207, // 207 Multi-Status if partial success
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-exchange-prices-api' Edge Function:",
      errorMessage
    );
    const errorResponse: ExchangeQuoteFunctionResponse = {
      message: "An internal server error occurred during exchange quote fetching.",
      details: [
        {
          exchange: "N/A",
          success: false,
          message: errorMessage,
          recordsProcessed: 0,
        },
      ],
      totalProcessed: 0,
      totalSucceeded: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

