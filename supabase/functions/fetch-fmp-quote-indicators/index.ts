// supabase/functions/fetch-fmp-quote-indicators/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- FMP API Response Interfaces ---
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

// Updated to be more explicit about potential nulls for numeric optional fields
interface FmpQuoteData {
  symbol: string;
  name: string;
  price: number;
  changePercentage?: number | null; // FMP might send null or omit
  change: number; // Assuming this is always present and a number if quote is valid
  volume: number; // Assuming this is always present and a number
  dayLow: number; // Assuming this is always present and a number
  dayHigh: number; // Assuming this is always present and a number
  yearHigh?: number | null;
  yearLow?: number | null;
  marketCap: number; // Assuming this is always present and a number
  priceAvg50?: number | null;
  priceAvg200?: number | null;
  exchange?: string;
  open: number; // Assuming this is always present and a number
  previousClose: number; // Assuming this is always present and a number
  timestamp: number;
}

console.log(`Function "fetch-fmp-quote-indicators" up and running!`);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const fmpApiKey = Deno.env.get("FMP_API_KEY");
    if (!fmpApiKey) {
      throw new Error("Missing FMP_API_KEY environment variable.");
    }

    const targetSymbol = "AAPL";

    const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${targetSymbol}&apikey=${fmpApiKey}`;
    console.log(
      `Fetching core data for ${targetSymbol} from: ${censorApiKey(
        quoteUrl,
        fmpApiKey
      )}`
    );

    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      throw new Error(
        `Failed to fetch quote data: ${
          quoteResponse.status
        } ${await quoteResponse.text()}`
      );
    }
    const fmpQuoteArray: FmpQuoteData[] = await quoteResponse.json();
    if (!fmpQuoteArray || fmpQuoteArray.length === 0) {
      throw new Error(`No quote data array from FMP for ${targetSymbol}.`);
    }
    const quoteData = fmpQuoteArray[0];
    if (!quoteData) {
      throw new Error(`Empty quote data object from FMP for ${targetSymbol}.`);
    }
    // Basic validation for essential numeric fields from quoteData
    if (
      typeof quoteData.price !== "number" ||
      typeof quoteData.change !== "number" ||
      typeof quoteData.previousClose !== "number" ||
      typeof quoteData.timestamp !== "number" ||
      quoteData.timestamp <= 0
    ) {
      throw new Error(
        `Invalid core numeric data or timestamp in quote for ${targetSymbol}.`
      );
    }
    console.log(`Received quote for ${targetSymbol}: Price=${quoteData.price}`);

    const exchange = quoteData.exchange || "NASDAQ";
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
                  marketStatusMessage = `Market is Closed (Holiday: ${holidayName})`;
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
          `Failed to fetch market status for ${exchange}: ${marketStatusResponse.status} ${errorText}`
        );
        marketStatusMessage = "Failed to fetch market status";
      }
    } catch (statusError) {
      console.warn(
        `Error fetching market status for ${exchange}: ${getErrorMessage(
          statusError
        )}`
      );
      marketStatusMessage = "Error fetching market status";
    }

    const recordToUpsert = {
      symbol: targetSymbol,
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: upsertError } = await supabaseAdmin
      .from("live_quote_indicators")
      .upsert(recordToUpsert, { onConflict: "symbol" });

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }
    console.log(`Successfully upserted data for ${targetSymbol}.`);

    return new Response(
      JSON.stringify({ message: `Data processed for ${targetSymbol}.` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    let message = "An unknown error occurred in the edge function.";
    let stack: string | undefined = undefined;
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (typeof error === "string") {
      message = error;
    } else if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      message = (error as { message: string }).message;
    }

    console.error("Error in Edge Function:", message, stack);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
