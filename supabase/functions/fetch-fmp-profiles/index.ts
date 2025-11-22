// supabase/functions/fetch-fmp-profiles/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";

import type {
  FmpProfileData,
  SupabaseProfileRecord,
  SupportedSymbol,
  SymbolProcessingResult,
  FunctionResponse,
} from "./types.ts";

const ENV_CONTEXT: string = Deno.env.get("ENV_CONTEXT") || "PROD";
const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");

const SUPABASE_URL: string | undefined =
  Deno.env.get("CUSTOM_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const FMP_PROFILE_BASE_URL = "https://financialmodelingprep.com/stable/profile";
const FMP_API_DELAY_MS = 250;
const STORAGE_BUCKET_NAME = "profile-images";

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

function parseFmpFullTimeEmployees(employeesStr: string): number | null {
  if (employeesStr === undefined) return null;
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

    let finalImageUrl: string | null = profileData.image;

    if (profileData.image && !profileData.defaultImage) {
      const imageFileName = `${profileData.symbol}.png`;

      try {
        const { data: existingFiles, error: listError } =
          await supabaseAdmin.storage
            .from(STORAGE_BUCKET_NAME)
            .list(undefined, { limit: 1, search: imageFileName });

        if (listError) {
          throw new Error(`Storage list error: ${listError.message}`);
        }

        if (!existingFiles || existingFiles.length === 0) {
          const imageResponse = await fetch(profileData.image);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download image from ${profileData.image}`
            );
          }
          const imageBlob = await imageResponse.blob();

          const { error: uploadError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET_NAME)
            .upload(imageFileName, imageBlob, {
              contentType: "image/png",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Upload error: ${uploadError.message}`);
          }
        }

        const { data: urlData } = supabaseAdmin.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(imageFileName);
        finalImageUrl = urlData.publicUrl;
      } catch (imageError) {
        console.error(
          `Image processing failed for ${profileData.symbol}: ${getErrorMessage(
            imageError
          )}`
        );
        finalImageUrl = profileData.image;
      }
    }

    // This object maps directly to the JSONB expected by the PostgreSQL function
    // CRITICAL: Truncate bigint values (volume, market_cap) to integers
    // FMP API sometimes returns decimals like "3955124346827.0005" which breaks bigint columns
    const recordToUpsert = {
      symbol: profileData.symbol,
      price: profileData.price,
      beta: profileData.beta,
      average_volume: Math.trunc(profileData.averageVolume),
      market_cap: profileData.marketCap ? Math.trunc(profileData.marketCap) : null,
      last_dividend: profileData.lastDividend,
      range: profileData.range,
      change: profileData.change,
      change_percentage: profileData.changePercentage,
      company_name: profileData.companyName,
      currency: profileData.currency,
      cik: profileData.cik,
      isin: profileData.isin,
      cusip: profileData.cusip,
      exchange: profileData.exchange,
      exchange_full_name: profileData.exchangeFullName,
      industry: profileData.industry,
      website: profileData.website,
      description: profileData.description,
      ceo: profileData.ceo,
      sector: profileData.sector,
      country: profileData.country,
      full_time_employees: parseFmpFullTimeEmployees(
        profileData.fullTimeEmployees
      ),
      phone: profileData.phone,
      address: profileData.address,
      city: profileData.city,
      state: profileData.state,
      zip: profileData.zip,
      image: finalImageUrl,
      ipo_date: profileData.ipoDate,
      default_image: profileData.defaultImage,
      is_etf: profileData.isEtf,
      is_actively_trading: profileData.isActivelyTrading,
      is_adr: profileData.isAdr,
      is_fund: profileData.isFund,
      volume: profileData.volume ? Math.trunc(profileData.volume) : null,
    };

    const { error: rpcError } = await supabaseAdmin.rpc("upsert_profile", {
      profile_data: recordToUpsert,
    });

    if (rpcError) {
      console.error(`Supabase RPC error for ${profileData.symbol}:`, rpcError);
      throw new Error(
        `Supabase RPC upsert failed for ${profileData.symbol}: ${rpcError.message}`
      );
    }

    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Successfully processed profile data for ${profileData.symbol} via RPC.`
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

  // --- 🔒 Centralized Authorization Check ---
  const authError = ensureCronAuth(_req);
  if (authError) {
    return authError; // Return the 401/500 response
  }
  // --- ✅ Auth Check Passed ---

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
    const totalUpserted = totalSucceeded; // Each success is now one successful RPC call

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
      status: totalSucceeded === activeSymbols.length ? 200 : 207,
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
