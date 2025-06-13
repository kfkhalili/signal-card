// supabase/functions/fetch-all-exchange-market-status/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parse, format } from "date-fns";

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
  openingHour: string;
  closingHour: string;
  openingAdditional?: string;
  closingAdditional?: string;
  timezone: string;
  isMarketOpen: boolean;
}

interface FmpMarketHoursDetail {
  openingHour: string;
  closingHour: string;
}

interface FmpMarketHoliday {
  year: number;
  [holidayName: string]: string | number;
}

interface FmpDetailedMarketStatus {
  stockExchangeName: string;
  stockMarketHours: FmpMarketHoursDetail;
  stockMarketHolidays: FmpMarketHoliday[];
  isTheStockMarketOpen: boolean;
}

// --- Interface for your Supabase table record ---
interface ExchangeMarketStatusRecord {
  exchange_code: string;
  name?: string | null;
  opening_time_local?: string | null; // e.g., "09:30", "13:00"
  closing_time_local?: string | null; // e.g., "15:30", "16:00"
  timezone: string;
  is_market_open: boolean;
  status_message?: string | null;
  current_day_is_holiday?: boolean | null;
  current_holiday_name?: string | null;
  raw_holidays_json?: FmpMarketHoliday[] | null;
  last_fetched_at: string;
}

// --- Helper Functions ---
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred in the Edge Function.";
}

function censorApiKey(url: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.length < 5) return url;
  const apiKeyPattern = new RegExp(`(apikey=)(${apiKey})([&]|$)`, "i");
  return url.replace(apiKeyPattern, "$1[CENSORED_API_KEY]$3");
}

/**
 * Parses a time string from FMP and reliably converts it to a 24-hour "HH:MM" format
 * using the date-fns library as requested.
 * Example: "03:30 PM" becomes "15:30".
 */
function parseLocalTime(
  fmpTimeString: string | undefined | null
): string | null {
  if (!fmpTimeString || fmpTimeString.toUpperCase().includes("CLOSED")) {
    return null;
  }

  // Why: This regex extracts the core time part, which might be in 12h or 24h format.
  const coreTimeMatch = fmpTimeString.match(
    /^(\d{1,2}:\d{2}(?:\s*a\.?m\.?|\s*p\.?m\.?)?)/i
  );
  if (!coreTimeMatch) {
    return fmpTimeString; // Fallback
  }
  // Remove periods from a.m./p.m. for compatibility with date-fns
  const coreTime = coreTimeMatch[1].replace(/\./g, "");

  // Why: We determine the correct parsing format based on whether AM/PM is present.
  const hasAmPm = /am|pm/i.test(coreTime);
  const parseFormat = hasAmPm ? "h:mm a" : "HH:mm";

  try {
    // Why: Using date-fns's `parse` and `format` is the most robust and correct
    // way to handle time conversions, avoiding environment-specific bugs.
    const referenceDate = new Date();
    const parsedDate = parse(coreTime, parseFormat, referenceDate);

    if (isNaN(parsedDate.getTime())) {
      return null; // Parsing failed
    }

    return format(parsedDate, "HH:mm");
  } catch (error) {
    console.error(`date-fns failed to parse time: ${coreTime}`, error);
    return null;
  }
}

/**
 * Checks if today (in the exchange's timezone) is a holiday.
 */
function checkIsTodayHoliday(
  holidays: FmpMarketHoliday[] | undefined | null,
  exchangeTimezone: string
): { isHoliday: boolean; holidayName: string | null } {
  if (!holidays || holidays.length === 0 || !exchangeTimezone) {
    return { isHoliday: false, holidayName: null };
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
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
              const formattedHolidayName = keyInYear
                .replace(/([A-Z0-9]+)/g, " $1")
                .trim();
              return { isHoliday: true, holidayName: formattedHolidayName };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error in checkIsTodayHoliday: ${getErrorMessage(e)}`);
    return { isHoliday: false, holidayName: null };
  }
  return { isHoliday: false, holidayName: null };
}

// --- Main Deno Serve Function ---
Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const fmpApiKey = Deno.env.get("FMP_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!fmpApiKey || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Server configuration error.");
    }

    const supabaseAdmin: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const allMarketHoursUrl = `https://financialmodelingprep.com/stable/all-exchange-market-hours?apikey=${fmpApiKey}`;
    const allHoursResponse = await fetch(allMarketHoursUrl);
    if (!allHoursResponse.ok) {
      throw new Error("Failed to fetch all exchange market hours from FMP.");
    }
    const fmpAllExchanges: FmpAllExchangeHoursEntry[] =
      await allHoursResponse.json();

    const recordsToUpsert: ExchangeMarketStatusRecord[] = [];
    const nowISO = new Date().toISOString();

    for (const basicExchangeInfo of fmpAllExchanges) {
      if (!basicExchangeInfo.exchange || !basicExchangeInfo.timezone) {
        continue;
      }

      const detailUrl = `https://financialmodelingprep.com/api/v3/is-the-market-open?exchange=${basicExchangeInfo.exchange}&apikey=${fmpApiKey}`;
      const detailResponse = await fetch(detailUrl);

      let detailedFmpData: FmpDetailedMarketStatus | null = null;
      if (detailResponse.ok) {
        detailedFmpData = await detailResponse.json();
      }

      const marketIsOpen =
        detailedFmpData?.isTheStockMarketOpen ?? basicExchangeInfo.isMarketOpen;
      const holidaysArray = detailedFmpData?.stockMarketHolidays ?? [];
      const exchangeName =
        detailedFmpData?.stockExchangeName || basicExchangeInfo.name;

      let openingTimeLocal = parseLocalTime(
        detailedFmpData?.stockMarketHours?.openingHour ??
          basicExchangeInfo.openingHour
      );
      let closingTimeLocal = parseLocalTime(
        detailedFmpData?.stockMarketHours?.closingHour ??
          basicExchangeInfo.closingHour
      );

      if (
        basicExchangeInfo.openingAdditional &&
        basicExchangeInfo.closingAdditional
      ) {
        const additionalOpening = parseLocalTime(
          basicExchangeInfo.openingAdditional
        );
        const additionalClosing = parseLocalTime(
          basicExchangeInfo.closingAdditional
        );
        if (
          openingTimeLocal &&
          closingTimeLocal &&
          additionalOpening &&
          additionalClosing
        ) {
          openingTimeLocal = `${openingTimeLocal}, ${additionalOpening}`;
          closingTimeLocal = `${closingTimeLocal}, ${additionalClosing}`;
        }
      }

      const { isHoliday, holidayName } = checkIsTodayHoliday(
        holidaysArray,
        basicExchangeInfo.timezone
      );

      let status_message = `Market is ${marketIsOpen ? "Open" : "Closed"}`;
      if (!marketIsOpen && isHoliday) {
        status_message = `Market is Closed (Holiday: ${holidayName})`;
      }

      recordsToUpsert.push({
        exchange_code: basicExchangeInfo.exchange,
        name: exchangeName,
        opening_time_local: openingTimeLocal,
        closing_time_local: closingTimeLocal,
        timezone: basicExchangeInfo.timezone,
        is_market_open: marketIsOpen,
        status_message,
        current_day_is_holiday: isHoliday,
        current_holiday_name: holidayName,
        raw_holidays_json: holidaysArray.length > 0 ? holidaysArray : null,
        last_fetched_at: nowISO,
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("exchange_market_status")
        .upsert(recordsToUpsert, { onConflict: "exchange_code" });

      if (upsertError) {
        throw new Error(`Supabase upsert failed: ${upsertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully processed ${recordsToUpsert.length} exchanges.`,
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
