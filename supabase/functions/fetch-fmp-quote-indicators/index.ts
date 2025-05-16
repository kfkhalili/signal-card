// supabase/functions/fetch-fmp-quote-indicators/index.ts
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FmpMarketHours {
  openingHour: string;
  closingHour: string;
}

interface FmpMarketHoliday {
  year: number;
  [holidayName: string]: string | number;
}

interface FmpMarketStatus {
  stockExchangeName: string;
  stockMarketHours: FmpMarketHours;
  stockMarketHolidays: FmpMarketHoliday[];
  isTheStockMarketOpen: boolean;
  isTheEuronextMarketOpen?: boolean;
  isTheForexMarketOpen?: boolean;
  isTheCryptoMarketOpen?: boolean;
}

interface FmpQuoteData {
  symbol: string;
  name: string;
  price: number;
  changePercentage?: number | null;
  change: number;
  volume: number;
  dayLow: number;
  dayHigh: number;
  yearHigh?: number | null;
  yearLow?: number | null;
  marketCap: number;
  priceAvg50?: number | null;
  priceAvg200?: number | null;
  exchange?: string;
  open: number;
  previousClose: number;
  timestamp: number;
}

interface LiveQuoteIndicatorRecord {
  symbol: string;
  current_price: number;
  change_percentage?: number | null;
  day_change: number;
  day_low: number;
  day_high: number;
  year_high?: number | null;
  year_low?: number | null;
  market_cap: number;
  day_open: number;
  previous_close: number;
  api_timestamp: number;
  volume: number;
  sma_50d?: number | null;
  sma_200d?: number | null;
  fetched_at: string;
  is_market_open: boolean;
  market_status_message: string;
  market_exchange_name: string;
}

const SYMBOLS_TO_PROCESS: string[] = [
  "AAPL",
  "MSFT",
  "GOOG",
  "TSLA",
  "NVDA",
  "AMD",
  "BTC",
];

console.log(
  `Function "fetch-fmp-quote-indicators" up and running for symbols: ${SYMBOLS_TO_PROCESS.join(
    ", "
  )}`
);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

function censorApiKey(url: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.length < 5) return url;
  const apiKeyPattern = new RegExp(`(apikey=)(${apiKey})([&]|$)`, "i");
  return url.replace(apiKeyPattern, "$1[CENSORED_API_KEY]$3");
}

async function fetchAndProcessSymbol(
  symbol: string,
  fmpApiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<{ symbol: string; success: boolean; message: string }> {
  try {
    // 1. Fetch Quote Data for the individual symbol
    // Ensure you are using the correct FMP endpoint.
    // If `/stable/quote` returns an array even for one symbol, we take the first element.
    // If it returns a single object, the .json() parsing will handle it.
    const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${fmpApiKey}`; // Or other appropriate FMP endpoint

    console.log(
      `Fetching quote for ${symbol} from: ${censorApiKey(quoteUrl, fmpApiKey)}`
    );

    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      throw new Error(
        `Failed to fetch quote data for ${symbol}: ${
          quoteResponse.status
        } ${await quoteResponse.text()}`
      );
    }

    // FMP's /stable/quote (and /api/v3/quote/) typically returns an array, even for a single symbol.
    const fmpQuoteArray: FmpQuoteData[] = await quoteResponse.json();
    if (!Array.isArray(fmpQuoteArray) || fmpQuoteArray.length === 0) {
      throw new Error(`No quote data array from FMP for ${symbol}.`);
    }
    const quoteData = fmpQuoteArray[0];
    if (!quoteData) {
      throw new Error(`Empty quote data object from FMP for ${symbol}.`);
    }
    // Ensure the symbol in the response matches the requested symbol, in case of any API nuances
    if (quoteData.symbol.toUpperCase() !== symbol.toUpperCase()) {
      console.warn(
        `FMP returned data for ${quoteData.symbol} when ${symbol} was requested. Proceeding with FMP's symbol.`
      );
      // Or throw an error: throw new Error(`FMP returned data for ${quoteData.symbol} when ${symbol} was requested.`);
    }

    if (
      typeof quoteData.price !== "number" ||
      typeof quoteData.change !== "number" ||
      typeof quoteData.previousClose !== "number" ||
      typeof quoteData.timestamp !== "number" ||
      quoteData.timestamp <= 0
    ) {
      throw new Error(
        `Invalid core numeric data or timestamp in quote for ${quoteData.symbol}. Price: ${quoteData.price}, Timestamp: ${quoteData.timestamp}`
      );
    }
    console.log(
      `Processing data for ${quoteData.symbol}: Price=${quoteData.price}`
    );

    const exchange = quoteData.exchange || "NASDAQ"; // Default to NASDAQ if not provided
    let marketExchangeName = quoteData.exchange || "NASDAQ";

    const marketStatusUrl = `https://financialmodelingprep.com/api/v3/is-the-market-open?exchange=${exchange}&apikey=${fmpApiKey}`;
    let isMarketOpen = false;
    let marketStatusMessage = "Status unknown";

    try {
      const marketStatusResponse = await fetch(marketStatusUrl);
      if (marketStatusResponse.ok) {
        const statusData: FmpMarketStatus = await marketStatusResponse.json();
        isMarketOpen = statusData.isTheStockMarketOpen;
        marketExchangeName = statusData.stockExchangeName || exchange;
        marketStatusMessage = isMarketOpen
          ? "Market is Open"
          : `Market is Closed (${marketExchangeName})`;

        if (
          !isMarketOpen &&
          statusData.stockMarketHolidays &&
          statusData.stockMarketHolidays.length > 0
        ) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

          for (const yearHolidays of statusData.stockMarketHolidays) {
            if (yearHolidays.year === today.getFullYear()) {
              for (const holidayName in yearHolidays) {
                if (
                  holidayName !== "year" &&
                  yearHolidays[holidayName] === todayStr
                ) {
                  marketStatusMessage = `Market is Closed (Holiday: ${holidayName
                    .replace(/([A-Z])/g, " $1")
                    .trim()})`;
                  break;
                }
              }
            }
            if (marketStatusMessage.includes("Holiday")) break;
          }
        }
      } else {
        const errorText = await marketStatusResponse.text();
        console.warn(
          `Failed to fetch market status for ${quoteData.symbol} (exchange: ${exchange}): ${marketStatusResponse.status} ${errorText}`
        );
        marketStatusMessage = "Failed to fetch market status";
      }
    } catch (statusError) {
      console.warn(
        `Error fetching market status for ${
          quoteData.symbol
        } (exchange: ${exchange}): ${getErrorMessage(statusError)}`
      );
      marketStatusMessage = "Error fetching market status";
    }

    const recordToUpsert: LiveQuoteIndicatorRecord = {
      symbol: quoteData.symbol, // Use symbol from quoteData which might be canonical (e.g. BTCUSD vs BTC)
      current_price: quoteData.price,
      change_percentage: quoteData.changePercentage,
      day_change: quoteData.change,
      day_low: quoteData.dayLow,
      day_high: quoteData.dayHigh,
      year_high: quoteData.yearHigh,
      year_low: quoteData.yearLow,
      market_cap: quoteData.marketCap,
      day_open: quoteData.open,
      previous_close: quoteData.previousClose,
      api_timestamp: quoteData.timestamp,
      volume: quoteData.volume,
      sma_50d: quoteData.priceAvg50,
      sma_200d: quoteData.priceAvg200,
      fetched_at: new Date().toISOString(),
      is_market_open: isMarketOpen,
      market_status_message: marketStatusMessage,
      market_exchange_name: marketExchangeName,
    };

    const { error: upsertError } = await supabaseAdmin
      .from("live_quote_indicators")
      .upsert(recordToUpsert, { onConflict: "symbol" }); // onConflict should use the symbol from recordToUpsert

    if (upsertError) {
      throw new Error(
        `Supabase upsert failed for ${recordToUpsert.symbol}: ${upsertError.message}`
      );
    }
    console.log(`Successfully upserted data for ${recordToUpsert.symbol}.`);
    return {
      symbol: recordToUpsert.symbol,
      success: true,
      message: `Data processed for ${recordToUpsert.symbol}.`,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing ${symbol}: ${errorMessage}`,
      error instanceof Error ? error.stack : ""
    );
    return {
      symbol: symbol,
      success: false,
      message: `Failed to process ${symbol}: ${errorMessage}`,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const fmpApiKey = Deno.env.get("FMP_API_KEY");
  if (!fmpApiKey) {
    console.error("Missing FMP_API_KEY environment variable.");
    return new Response(
      JSON.stringify({ error: "Missing FMP_API_KEY environment variable." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }

  const symbolsArray = SYMBOLS_TO_PROCESS;
  if (!symbolsArray || symbolsArray.length === 0) {
    const errorMsg = "SYMBOLS_TO_PROCESS array is empty.";
    console.error(errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: Array<{ symbol: string; success: boolean; message: string }> =
    [];
  let overallSuccess = true;

  // Loop through each symbol and process it individually
  for (const symbol of symbolsArray) {
    // Optional: Add a small delay here if you're concerned about hitting FMP rate limits too quickly,
    // though for a handful of symbols this might not be necessary.
    // await new Promise(resolve => setTimeout(resolve, 200)); // e.g., 200ms delay

    const result = await fetchAndProcessSymbol(
      symbol,
      fmpApiKey,
      supabaseAdmin
    );
    results.push(result);
    if (!result.success) {
      overallSuccess = false;
    }
  }

  return new Response(
    JSON.stringify({
      message: overallSuccess
        ? "All symbols processed."
        : "Some symbols failed to process.",
      results,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: overallSuccess ? 200 : 207, // 207 Multi-Status if some failed
    }
  );
});
