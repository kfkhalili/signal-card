// supabase/functions/fetch-fmp-quote-indicators/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or restrict to your specific domain
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- FMP API Response Interfaces ---
interface FmpSymbolSearch {
  symbol: string;
  name: string;
  currency: string;
  exchange: string; // Short name, e.g., "NASDAQ"
  exchangeShortName: string; // Often the same or similar
  exchangeFullName: string; // e.g., "NASDAQ Global Select"
}

interface FmpMarketHours {
  openingHour: string; // e.g., "09:00 a.m. CEST"
  closingHour: string; // e.g., "05:30 p.m. CEST"
}

interface FmpMarketHoliday {
  year: number;
  [holidayName: string]: string | number; // e.g., "Good Friday": "2024-03-29"
}

interface FmpMarketStatus {
  stockExchangeName: string;
  stockMarketHours: FmpMarketHours;
  stockMarketHolidays: FmpMarketHoliday[];
  isTheStockMarketOpen: boolean;
  isTheEuronextMarketOpen?: boolean; // Optional, depends on exchange
  isTheForexMarketOpen?: boolean; // Optional
  isTheCryptoMarketOpen?: boolean; // Optional
}

interface FmpQuoteData {
  symbol: string;
  name: string;
  price: number;
  changePercentage: number;
  change: number;
  volume: number;
  dayLow: number;
  dayHigh: number;
  marketCap: number;
  open: number;
  previousClose: number;
  timestamp: number; // Unix timestamp (seconds)
}

interface FmpSmaData {
  date: string;
  sma: number;
  // FMP /api/v3/technical_indicator also returns open, high, low, close, volume for the period
}

console.log(`Function "fetch-fmp-quote-indicators" up and running!`);

// Helper to fetch and get latest SMA value
async function getLatestSma(
  symbol: string,
  period: number,
  timeframe: string,
  apiKey: string
): Promise<number | null> {
  // Corrected endpoint based on FMP v3 docs for technical indicators
  const url = `https://financialmodelingprep.com/api/v3/technical_indicator/${timeframe}/${symbol}?period=${period}&type=sma&apikey=${apiKey}`;
  console.log(`Fetching SMA (${period} ${timeframe}) from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `SMA fetch failed for ${period} ${timeframe} ${symbol}: ${
          response.status
        } ${await response.text()}`
      );
      return null;
    }
    const data: FmpSmaData[] = await response.json();
    if (data && data.length > 0 && typeof data[0]?.sma === "number") {
      console.log(
        `Latest SMA (${period} ${timeframe}) for ${symbol} found: ${data[0].sma}`
      );
      return data[0].sma;
    }
    console.warn(
      `No valid SMA data found for ${period} ${timeframe} ${symbol}. Response:`,
      data ? data.slice(0, 1) : "no data"
    ); // Log first item if data exists
    return null;
  } catch (error) {
    console.error(
      `Error fetching SMA for ${period} ${timeframe} ${symbol}:`,
      error
    );
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const fmpApiKey = Deno.env.get("FMP_API_KEY");
    if (!fmpApiKey)
      throw new Error("Missing FMP_API_KEY environment variable.");

    const targetSymbol = "AAPL";

    // --- 1. Fetch Exchange for the Symbol ---
    const searchUrl = `https://financialmodelingprep.com/stable/search-symbol?query=${targetSymbol}&limit=1&apikey=${fmpApiKey}`;
    console.log(`Fetching exchange for ${targetSymbol} from: ${searchUrl}`);
    let exchange = "NASDAQ"; // Default
    let exchangeFullName = "NASDAQ Stock Market";

    try {
      const searchResponse = await fetch(searchUrl);
      if (searchResponse.ok) {
        const searchData: FmpSymbolSearch[] = await searchResponse.json();
        if (searchData && searchData.length > 0 && searchData[0].exchange) {
          exchange = searchData[0].exchange;
          exchangeFullName = searchData[0].exchangeFullName || exchange;
          console.log(
            `Found exchange for ${targetSymbol}: ${exchange} (${exchangeFullName})`
          );
        } else {
          console.warn(
            `Could not find exchange for ${targetSymbol} in search results. Using default: ${exchange}`
          );
        }
      } else {
        console.warn(
          `Failed to fetch exchange for ${targetSymbol}: ${
            searchResponse.status
          } ${await searchResponse.text()}. Using default: ${exchange}`
        );
      }
    } catch (searchError) {
      console.warn(
        `Error fetching exchange for ${targetSymbol}: ${searchError.message}. Using default: ${exchange}`
      );
    }

    // --- 2. Fetch Market Status using the determined exchange ---
    const marketStatusUrl = `https://financialmodelingprep.com/api/v3/is-the-market-open?exchange=${exchange}&apikey=${fmpApiKey}`;
    console.log(
      `Fetching market status for ${exchange} from: ${marketStatusUrl}`
    );
    let isMarketOpen = false;
    let marketStatusMessage = "Status unknown";

    try {
      const marketStatusResponse = await fetch(marketStatusUrl);
      if (marketStatusResponse.ok) {
        const statusData: FmpMarketStatus = await marketStatusResponse.json();
        isMarketOpen = statusData.isTheStockMarketOpen;
        marketStatusMessage = isMarketOpen
          ? "Market is Open"
          : `Market is Closed (${statusData.stockExchangeName || exchange})`;

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
        console.log(
          `Market status for ${exchange}: Open = ${isMarketOpen}, Message = ${marketStatusMessage}`
        );
      } else {
        console.warn(
          `Failed to fetch market status for ${exchange}: ${
            marketStatusResponse.status
          } ${await marketStatusResponse.text()}`
        );
        marketStatusMessage = "Failed to fetch market status";
      }
    } catch (statusError) {
      console.warn(
        `Error fetching market status for ${exchange}: ${statusError.message}`
      );
      marketStatusMessage = "Error fetching market status";
    }

    // --- 3. Fetch Quote and SMAs Concurrently ---
    const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${targetSymbol}?apikey=${fmpApiKey}`;
    console.log(`Fetching quote from: ${quoteUrl}`);

    const dataFetchPromises = [
      fetch(quoteUrl),
      getLatestSma(targetSymbol, 50, "daily", fmpApiKey),
      getLatestSma(targetSymbol, 200, "daily", fmpApiKey),
    ];
    const results = await Promise.allSettled(dataFetchPromises);

    // --- Process Quote Result ---
    let quoteData: FmpQuoteData;
    const quoteResult = results[0];
    if (quoteResult.status === "fulfilled" && quoteResult.value.ok) {
      const fmpQuoteArray: FmpQuoteData[] = await quoteResult.value.json();
      if (!fmpQuoteArray || fmpQuoteArray.length === 0)
        throw new Error(`No quote data array from FMP for ${targetSymbol}.`);
      quoteData = fmpQuoteArray[0];
      if (!quoteData)
        throw new Error(
          `Empty quote data object from FMP for ${targetSymbol}.`
        );
      console.log(
        `Received quote for ${targetSymbol}: Price=${quoteData.price}, Timestamp=${quoteData.timestamp}`
      );
      if (typeof quoteData.timestamp !== "number" || quoteData.timestamp <= 0)
        throw new Error(`Invalid quote timestamp: ${quoteData.timestamp}.`);
    } else {
      const reason =
        quoteResult.status === "rejected"
          ? quoteResult.reason
          : `Status: ${(quoteResult.value as Response).status} ${await (
              quoteResult.value as Response
            ).text()}`;
      throw new Error(`Failed to fetch valid quote data: ${reason}`);
    }

    // --- Process SMA Results ---
    const sma50d = results[1].status === "fulfilled" ? results[1].value : null;
    if (results[1].status === "rejected")
      console.warn("50-day SMA fetch rejected:", results[1].reason);
    const sma200d = results[2].status === "fulfilled" ? results[2].value : null;
    if (results[2].status === "rejected")
      console.warn("200-day SMA fetch rejected:", results[2].reason);

    // --- Prepare data for Supabase upsert ---
    const recordToUpsert = {
      symbol: targetSymbol,
      current_price: quoteData.price,
      change_percentage: quoteData.changePercentage,
      day_change: quoteData.change,
      day_low: quoteData.dayLow,
      day_high: quoteData.dayHigh,
      market_cap: quoteData.marketCap,
      day_open: quoteData.open,
      previous_close: quoteData.previousClose,
      api_timestamp: quoteData.timestamp,
      volume: quoteData.volume,
      sma_50d: sma50d,
      sma_200d: sma200d,
      fetched_at: new Date().toISOString(),
      is_market_open: isMarketOpen,
      market_status_message: marketStatusMessage,
      market_exchange_name: exchangeFullName,
    };

    // --- Upsert into Supabase ---
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    console.log(
      `Attempting to upsert data for ${targetSymbol} into live_quote_indicators...`
    );

    const { error: upsertError } = await supabaseAdmin
      .from("live_quote_indicators")
      .upsert(recordToUpsert, { onConflict: "symbol" });

    if (upsertError)
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    console.log(`Successfully upserted data for ${targetSymbol}.`);

    return new Response(
      JSON.stringify({ message: `Data processed for ${targetSymbol}.` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in Edge Function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
