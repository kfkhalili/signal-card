// supabase/functions/fetch-all-exchange-market-status/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Standard CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Interfaces for FMP API Responses ---
interface FmpAllExchangeHoursEntry {
  exchange: string;
  name: string;
  openingHour: string; // Can be "HH:MM AM/PM [+-]HH:MM" or "CLOSED"
  closingHour: string; // Can be "HH:MM AM/PM [+-]HH:MM" or "CLOSED"
  timezone: string; // IANA Timezone Name, e.g., "America/New_York"
  isMarketOpen: boolean; // General status from this bulk endpoint
}

interface FmpMarketHoursDetail {
  // From detailed per-exchange call
  openingHour: string;
  closingHour: string;
}

interface FmpMarketHoliday {
  // From detailed per-exchange call
  year: number;
  [holidayName: string]: string | number; // Date string (YYYY-MM-DD) or year number
}

interface FmpDetailedMarketStatus {
  // From /api/v3/is-the-market-open?exchange=...
  stockExchangeName: string;
  stockMarketHours: FmpMarketHoursDetail;
  stockMarketHolidays: FmpMarketHoliday[];
  isTheStockMarketOpen: boolean; // More precise status for this specific exchange
  // other fields like isTheEuronextMarketOpen, isTheForexMarketOpen, isTheCryptoMarketOpen exist but may not be needed for this table
}

// --- Interface for your Supabase table record ---
interface ExchangeMarketStatusRecord {
  exchange_code: string;
  name?: string | null;
  opening_time_local?: string | null; // Store parsed local time e.g., "09:30", "10:00 AM"
  closing_time_local?: string | null; // Store parsed local time e.g., "16:00", "04:00 PM"
  timezone: string; // IANA timezone is critical
  is_market_open: boolean;
  status_message?: string | null;
  current_day_is_holiday?: boolean | null;
  current_holiday_name?: string | null;
  raw_holidays_json?: FmpMarketHoliday[] | null; // Store the raw array
  last_fetched_at: string; // ISO string
}

// --- Helper Functions ---
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred in the Edge Function.";
}

function censorApiKey(url: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.length < 5) return url;
  // More robust regex to handle apikey at the end or followed by &
  const apiKeyPattern = new RegExp(`(apikey=)(${apiKey})([&]|$)`, "i");
  return url.replace(apiKeyPattern, "$1[CENSORED_API_KEY]$3");
}

/**
 * Parses the time string from FMP (e.g., "10:00 AM +10:00", "09:30")
 * to a simpler local time string (e.g., "10:00 AM", "09:30").
 * Returns null if the input is "CLOSED" or invalid.
 */
function parseLocalTime(
  fmpTimeString: string | undefined | null
): string | null {
  if (!fmpTimeString || fmpTimeString.toUpperCase() === "CLOSED") {
    return null;
  }
  // Regex to extract the core time part (HH:MM or HH:MM AM/PM)
  // Handles formats like "09:30", "10:00 AM", "4:00 PM", "10:00 AM +10:00"
  const timeMatch = fmpTimeString.match(/^(\d{1,2}:\d{2}(\s*(AM|PM))?)/i);
  if (timeMatch && timeMatch[1]) {
    return timeMatch[1].toUpperCase(); // e.g., "10:00 AM" or "09:30"
  }
  // Fallback for unexpected formats, though FMP is usually consistent
  // Or return null if parsing is strict:
  // console.warn(`Could not parse local time from FMP string: ${fmpTimeString}`);
  // return null;
  return fmpTimeString; // Store as is if specific parsing fails but not "CLOSED"
}

/**
 * Checks if today (in the exchange's timezone) is a holiday.
 */
function checkIsTodayHoliday(
  holidays: FmpMarketHoliday[] | undefined | null,
  exchangeTimezone: string // IANA timezone string e.g. "America/New_York"
): { isHoliday: boolean; holidayName: string | null } {
  if (!holidays || holidays.length === 0 || !exchangeTimezone) {
    return { isHoliday: false, holidayName: null };
  }

  try {
    const now = new Date();
    // Get today's date string (YYYY-MM-DD) in the target exchange's timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      // "en-CA" locale gives YYYY-MM-DD format
      timeZone: exchangeTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(now).reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {} as Record<string, string>);

    if (!parts.year || !parts.month || !parts.day) {
      console.warn(
        `Could not determine current date components for timezone: ${exchangeTimezone}`
      );
      return { isHoliday: false, holidayName: null };
    }

    const todayInExchangeTimezoneStr = `${parts.year}-${parts.month}-${parts.day}`;
    const currentYear = parseInt(parts.year, 10);

    for (const yearHolidays of holidays) {
      if (yearHolidays.year === currentYear) {
        for (const keyInYear of Object.keys(yearHolidays)) {
          if (keyInYear !== "year") {
            const holidayDateStr = yearHolidays[keyInYear] as string;
            if (holidayDateStr === todayInExchangeTimezoneStr) {
              // Format holiday name: "GoodFriday" -> "Good Friday", "NewYear'sDay" -> "New Year's Day"
              const formattedHolidayName = keyInYear
                .replace(/([A-Z0-9]+)/g, " $1") // Add space before uppercase or number series
                .replace(/\sDay/i, " Day") // Ensure " Day" is spaced correctly
                .replace(/\sEve/i, " Eve") // Ensure " Eve" is spaced correctly
                .replace(/\sYear's/i, " Year's") // Ensure " Year's"
                .trim() // Remove leading/trailing spaces
                .replace(/\s+/g, " "); // Condense multiple spaces
              return { isHoliday: true, holidayName: formattedHolidayName };
            }
          }
        }
      }
    }
  } catch (e) {
    // Log error if Intl.DateTimeFormat fails (e.g., invalid timezone string though FMP should provide valid ones)
    console.error(
      `Error in checkIsTodayHoliday for timezone '${exchangeTimezone}': ${getErrorMessage(
        e
      )}`
    );
    return { isHoliday: false, holidayName: null }; // Default to not a holiday on error
  }
  return { isHoliday: false, holidayName: null };
}

// --- Main Deno Serve Function ---
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  console.log(
    "Edge function 'fetch-all-exchange-market-status' invoked at:",
    new Date().toISOString()
  );

  try {
    // Environment variables
    const fmpApiKey = Deno.env.get("FMP_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!fmpApiKey || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing required environment variables.");
      throw new Error(
        "Server configuration error: Missing API keys or Supabase URL."
      );
    }

    const supabaseAdmin: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    // 1. Fetch the list of all exchanges and their general status/timezones
    const allMarketHoursUrl = `https://financialmodelingprep.com/stable/all-exchange-market-hours?apikey=${fmpApiKey}`;
    console.log(
      `Step 1: Fetching general exchange statuses from FMP... (URL: ${censorApiKey(
        allMarketHoursUrl,
        fmpApiKey
      )})`
    );
    const allHoursResponse = await fetch(allMarketHoursUrl);
    if (!allHoursResponse.ok) {
      throw new Error(
        `Failed to fetch all exchange market hours from FMP: ${
          allHoursResponse.status
        } ${await allHoursResponse.text()}`
      );
    }
    const fmpAllExchanges: FmpAllExchangeHoursEntry[] =
      await allHoursResponse.json();
    if (!Array.isArray(fmpAllExchanges)) {
      throw new Error(
        "Invalid data format received from FMP /all-exchange-market-hours endpoint."
      );
    }
    console.log(
      `Workspaceed general status for ${fmpAllExchanges.length} exchanges.`
    );

    const recordsToUpsert: ExchangeMarketStatusRecord[] = [];
    const nowISO = new Date().toISOString();
    let processedCount = 0;
    let successfulDetailFetches = 0;

    // 2. For each exchange, fetch its detailed status (including holidays)
    for (const basicExchangeInfo of fmpAllExchanges) {
      if (!basicExchangeInfo.exchange || !basicExchangeInfo.timezone) {
        console.warn(
          "Skipping FMP entry due to missing exchange code or timezone:",
          basicExchangeInfo
        );
        continue;
      }
      processedCount++;
      let record: ExchangeMarketStatusRecord | null = null;

      try {
        // Optional: Add a small delay here if hitting FMP rate limits
        // if (processedCount > 1) await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay

        const detailUrl = `https://financialmodelingprep.com/api/v3/is-the-market-open?exchange=${basicExchangeInfo.exchange}&apikey=${fmpApiKey}`;
        // console.log(`Workspaceing detailed status for ${basicExchangeInfo.exchange}...`); // Verbose
        const detailResponse = await fetch(detailUrl);

        let detailedFmpData: FmpDetailedMarketStatus | null = null;
        if (detailResponse.ok) {
          detailedFmpData = await detailResponse.json();
          successfulDetailFetches++;
        } else {
          console.warn(
            `Failed to fetch detailed status for ${
              basicExchangeInfo.exchange
            }: ${
              detailResponse.status
            } ${await detailResponse.text()}. Will use general info.`
          );
          // Fallback to using data from the /all-exchange-market-hours endpoint if detail fetch fails
        }

        // Prioritize data from detailed call if available, else fallback to basic info
        const marketIsOpen = detailedFmpData
          ? detailedFmpData.isTheStockMarketOpen
          : basicExchangeInfo.isMarketOpen;
        const holidaysArray = detailedFmpData
          ? detailedFmpData.stockMarketHolidays
          : [];
        const exchangeName =
          detailedFmpData?.stockExchangeName || basicExchangeInfo.name;

        // Get opening/closing hours: prefer detailed, fallback to basic
        const fmpOpeningHourStr =
          detailedFmpData?.stockMarketHours?.openingHour ??
          basicExchangeInfo.openingHour;
        const fmpClosingHourStr =
          detailedFmpData?.stockMarketHours?.closingHour ??
          basicExchangeInfo.closingHour;

        const openingTimeLocal = parseLocalTime(fmpOpeningHourStr);
        const closingTimeLocal = parseLocalTime(fmpClosingHourStr);

        const { isHoliday, holidayName } = checkIsTodayHoliday(
          holidaysArray,
          basicExchangeInfo.timezone
        );

        let finalStatusMessage = "";
        if (marketIsOpen) {
          finalStatusMessage = `Market is Open (${exchangeName}${
            openingTimeLocal ? ` ${openingTimeLocal}` : ""
          }${closingTimeLocal ? ` - ${closingTimeLocal}` : ""})`;
        } else if (isHoliday && holidayName) {
          finalStatusMessage = `Market is Closed (Holiday: ${holidayName})`;
        } else {
          finalStatusMessage = `Market is Closed (${exchangeName}${
            openingTimeLocal ? ` ${openingTimeLocal}` : ""
          }${closingTimeLocal ? ` - ${closingTimeLocal}` : ""})`;
        }

        record = {
          exchange_code: basicExchangeInfo.exchange,
          name: exchangeName,
          opening_time_local: openingTimeLocal,
          closing_time_local: closingTimeLocal,
          timezone: basicExchangeInfo.timezone, // Crucial IANA timezone
          is_market_open: marketIsOpen,
          status_message: finalStatusMessage,
          current_day_is_holiday: isHoliday,
          current_holiday_name: holidayName,
          raw_holidays_json:
            holidaysArray && holidaysArray.length > 0 ? holidaysArray : null,
          last_fetched_at: nowISO,
        };
      } catch (detailProcessingError) {
        console.error(
          `Error processing detailed FMP status for ${
            basicExchangeInfo.exchange
          }: ${getErrorMessage(detailProcessingError)}`
        );
        // Fallback to create a record with whatever info we have from the basic call
        record = {
          exchange_code: basicExchangeInfo.exchange,
          name: basicExchangeInfo.name,
          opening_time_local: parseLocalTime(basicExchangeInfo.openingHour),
          closing_time_local: parseLocalTime(basicExchangeInfo.closingHour),
          timezone: basicExchangeInfo.timezone,
          is_market_open: basicExchangeInfo.isMarketOpen,
          status_message: `Error fetching details. General status: ${
            basicExchangeInfo.isMarketOpen ? "Open" : "Closed"
          }`,
          current_day_is_holiday: false,
          current_holiday_name: null,
          raw_holidays_json: null,
          last_fetched_at: nowISO,
        };
      }

      if (record) {
        recordsToUpsert.push(record);
      }
    }

    // 3. Upsert all collected records to Supabase
    if (recordsToUpsert.length > 0) {
      console.log(
        `Attempting to upsert ${recordsToUpsert.length} exchange status records to Supabase...`
      );
      const { error: upsertError } = await supabaseAdmin
        .from("exchange_market_status")
        .upsert(recordsToUpsert, { onConflict: "exchange_code" });

      if (upsertError) {
        console.error("Supabase upsert error:", upsertError);
        throw new Error(
          `Supabase upsert failed for exchange_market_status: ${upsertError.message}`
        );
      }
      console.log(
        `Successfully upserted/updated ${recordsToUpsert.length} exchange statuses.`
      );
    } else {
      console.log(
        "No valid exchange market status records were prepared to upsert."
      );
    }

    return new Response(
      JSON.stringify({
        message: `Successfully processed exchange market statuses. Fetched general info for ${fmpAllExchanges.length} exchanges. Attempted detailed processing for ${processedCount}. Fetched details for ${successfulDetailFetches}. Upserted ${recordsToUpsert.length} records to DB.`,
        summary: {
          totalExchangesFromFMPList: fmpAllExchanges.length,
          detailedProcessingAttempts: processedCount,
          successfulDetailFetches: successfulDetailFetches,
          recordsPreparedForUpsert: recordsToUpsert.length,
        },
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-all-exchange-market-status' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    return new Response(
      JSON.stringify({
        error: "An internal server error occurred.",
        details: errorMessage,
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
