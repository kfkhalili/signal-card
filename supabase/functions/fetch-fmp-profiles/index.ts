// supabase/functions/fetch-fmp-profiles/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FmpProfileData,
  SupabaseProfileRecord,
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

const FMP_PROFILE_BASE_URL = "https://financialmodelingprep.com/stable/profile";
const FMP_API_DELAY_MS = 250; // Delay between API calls

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

function parseFmpFullTimeEmployees(
  employeesStr: string | null | undefined
): number | null {
  if (employeesStr === null || employeesStr === undefined) return null;
  const num = parseInt(employeesStr.replace(/,/g, ""), 10);
  return isNaN(num) ? null : num;
}

async function fetchAndProcessSymbolProfile(
  symbolToRequest: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolProcessingResult> {
  const profileUrl = `${FMP_PROFILE_BASE_URL}?symbol=${symbolToRequest}&apikey=${apiKey}`;

  try {
    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Fetching profile for ${symbolToRequest} from: ${censorApiKey(
          profileUrl,
          apiKey
        )}`
      );
    }

    const profileResponse: Response = await fetch(profileUrl);

    if (!profileResponse.ok) {
      const errorText: string = await profileResponse.text();
      throw new Error(
        `Failed to fetch profile for ${symbolToRequest}: ${profileResponse.status} ${errorText} from URL: ${profileUrl}`
      );
    }

    const fmpProfileResult: unknown = await profileResponse.json();

    if (!Array.isArray(fmpProfileResult) || fmpProfileResult.length === 0) {
      // FMP /profile/SYMBOL often returns an array with one object.
      // If it's not an array or is empty, it's an issue.
      throw new Error(
        `No profile data array returned or empty array from FMP for ${symbolToRequest}. Response: ${JSON.stringify(
          fmpProfileResult
        )}`
      );
    }

    const profileData = fmpProfileResult[0] as FmpProfileData;

    if (
      !profileData ||
      typeof profileData.symbol !== "string" ||
      profileData.symbol.trim() === ""
    ) {
      throw new Error(
        `Empty or invalid profile data object from FMP for ${symbolToRequest}. Payload: ${JSON.stringify(
          profileData
        )}`
      );
    }

    const recordToUpsert: SupabaseProfileRecord = {
      symbol: profileData.symbol, // Use symbol from FMP response
      price: profileData.price ?? null,
      beta: profileData.beta ?? null,
      average_volume: profileData.volAvg ?? null,
      market_cap: profileData.mktCap ?? null,
      last_dividend: profileData.lastDiv ?? null,
      range: profileData.range ?? null,
      change: profileData.changes ?? null,
      change_percentage:
        profileData.changesPercentage ?? profileData.changesPercentage ?? null, // FMP sometimes uses 'changesPercentage'
      company_name: profileData.companyName ?? null,
      currency: profileData.currency ?? null,
      cik: profileData.cik ?? null,
      isin: profileData.isin ?? null,
      cusip: profileData.cusip ?? null,
      exchange: profileData.exchange ?? null,
      exchange_full_name:
        profileData.exchangeShortName ?? profileData.exchange ?? null,
      industry: profileData.industry ?? null,
      website: profileData.website ?? null,
      description: profileData.description ?? null,
      ceo: profileData.ceo ?? null,
      sector: profileData.sector ?? null,
      country: profileData.country ?? null,
      full_time_employees: parseFmpFullTimeEmployees(
        profileData.fullTimeEmployees
      ),
      phone: profileData.phone ?? null,
      address: profileData.address ?? null,
      city: profileData.city ?? null,
      state: profileData.state ?? null,
      zip: profileData.zip ?? null,
      image: profileData.image ?? null,
      ipo_date: profileData.ipoDate ?? null, // Assuming FMP format is "YYYY-MM-DD" or null
      default_image: profileData.defaultImage ?? false,
      is_etf: profileData.isEtf ?? false,
      is_actively_trading: profileData.isActivelyTrading ?? true,
      is_adr: profileData.isAdr ?? false,
      is_fund: profileData.isFund ?? false,
      volume: profileData.volume ?? null,
      // id and modified_at are handled by the database
    };

    const { error: upsertError, count } = await supabaseAdmin
      .from("profiles")
      .upsert(recordToUpsert, { onConflict: "symbol", count: "exact" });

    if (upsertError) {
      console.error(
        `Supabase upsert error for ${profileData.symbol}:`,
        upsertError
      );
      throw new Error(
        `Supabase upsert failed for ${profileData.symbol}: ${upsertError.message}`
      );
    }

    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Successfully upserted profile data for ${profileData.symbol}. Count: ${count}`
      );
    }
    return {
      symbol: profileData.symbol,
      success: true,
      message: `Profile data processed for ${profileData.symbol}.`,
      data: profileData,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing profile for ${symbolToRequest}: ${errorMessage}`
    );
    return {
      symbol: symbolToRequest,
      success: false,
      message: `Failed to process profile for ${symbolToRequest}: ${errorMessage}`,
    };
  }
}

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const invocationTime: string = new Date().toISOString();
  console.log(
    `Edge function 'fetch-fmp-profiles' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalProcessed: 0,
      totalSucceeded: 0,
      totalUpserted: 0,
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
      console.error("Error fetching symbols:", symbolsError);
      throw new Error(
        `Supabase error fetching symbols: ${symbolsError.message}`
      );
    }

    const activeSymbols: SupportedSymbol[] = (symbolsData ||
      []) as SupportedSymbol[];

    if (activeSymbols.length === 0) {
      console.log("No active symbols found in 'supported_symbols' table.");
      const response: FunctionResponse = {
        message: "No active symbols to process.",
        details: [],
        totalProcessed: 0,
        totalSucceeded: 0,
        totalUpserted: 0,
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
        new Promise<SymbolProcessingResult>((resolve) =>
          setTimeout(async () => {
            const result = await fetchAndProcessSymbolProfile(
              s.symbol,
              FMP_API_KEY,
              supabaseAdmin
            );
            resolve(result);
          }, index * FMP_API_DELAY_MS)
        )
    );

    const results: SymbolProcessingResult[] = await Promise.all(
      processingPromises
    );
    const totalSucceeded = results.filter((r) => r.success).length;
    // Assuming 1 upsert per successful processing.
    // If FMP can return multiple profiles for one symbol (unlikely for /profile/SYMBOL) adjust logic.
    const totalUpserted = totalSucceeded;

    const overallMessage = `Profile processing complete. Processed: ${activeSymbols.length}, Succeeded: ${totalSucceeded}, Upserted: ${totalUpserted}.`;
    console.log(overallMessage);
    if (ENV_CONTEXT === "DEV" || totalSucceeded < activeSymbols.length) {
      results.forEach((r) =>
        console.log(
          `Symbol: ${r.symbol}, Success: ${r.success}, Message: ${r.message}`
        )
      );
    }

    const response: FunctionResponse = {
      message: overallMessage,
      details: results,
      totalProcessed: activeSymbols.length,
      totalSucceeded: totalSucceeded,
      totalUpserted: totalUpserted,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: totalSucceeded === activeSymbols.length ? 200 : 207, // 207 Multi-Status
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-profiles' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message: "An internal server error occurred during profile fetching.",
      details: [{ symbol: "N/A", success: false, message: errorMessage }],
      totalProcessed: 0,
      totalSucceeded: 0,
      totalUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
