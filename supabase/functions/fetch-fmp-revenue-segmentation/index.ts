// supabase/functions/fetch-fmp-revenue-segmentation/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  FmpRevenueProductSegmentationData,
  SupabaseRevenueProductSegmentationRecord,
  SupportedSymbol,
  SymbolProcessingResult,
  FunctionResponse,
} from "./types.ts";

const ENV_CONTEXT: string = Deno.env.get("ENV_CONTEXT") || "PROD";
const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");
const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const FMP_REVENUE_SEGMENTATION_BASE_URL =
  "https://financialmodelingprep.com/stable/revenue-product-segmentation";
const FMP_API_DELAY_MS = 350; // Being conservative with FMP rate limits

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

function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

async function fetchAndProcessSymbolRevenueSegmentation(
  symbolToRequest: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolProcessingResult> {
  const segmentationUrl = `${FMP_REVENUE_SEGMENTATION_BASE_URL}?symbol=${symbolToRequest}&apikey=${apiKey}`;
  let fetchedCount = 0;
  let upsertedCount = 0;

  try {
    if (ENV_CONTEXT === "DEV") {
      console.log(
        `Fetching revenue segmentation for ${symbolToRequest} from: ${censorApiKey(
          segmentationUrl,
          apiKey
        )}`
      );
    }

    const response: Response = await fetch(segmentationUrl);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch revenue segmentation for ${symbolToRequest}: ${response.status} ${errorText} from URL: ${segmentationUrl}`
      );
    }

    const fmpSegmentationResult: unknown = await response.json();

    if (!Array.isArray(fmpSegmentationResult)) {
      if (
        typeof fmpSegmentationResult === "object" &&
        fmpSegmentationResult !== null &&
        Object.keys(fmpSegmentationResult).length === 0
      ) {
        if (ENV_CONTEXT === "DEV") {
          console.log(
            `No revenue segmentation data found for ${symbolToRequest} (empty object returned by FMP).`
          );
        }
        return {
          symbol: symbolToRequest,
          success: true,
          message: `No revenue segmentation data found for ${symbolToRequest}.`,
          fetchedCount: 0,
          upsertedCount: 0,
        };
      }
      throw new Error(
        `Invalid revenue segmentation data array returned from FMP for ${symbolToRequest}. Response: ${JSON.stringify(
          fmpSegmentationResult
        )}`
      );
    }

    fetchedCount = fmpSegmentationResult.length;
    if (fetchedCount === 0) {
      if (ENV_CONTEXT === "DEV") {
        console.log(
          `No revenue segmentation entries found for ${symbolToRequest}.`
        );
      }
      return {
        symbol: symbolToRequest,
        success: true,
        message: `No revenue segmentation entries in array for ${symbolToRequest}.`,
        fetchedCount: 0,
        upsertedCount: 0,
      };
    }

    const recordsToUpsert: SupabaseRevenueProductSegmentationRecord[] = [];
    for (const fmpEntry of fmpSegmentationResult as FmpRevenueProductSegmentationData[]) {
      if (
        !fmpEntry.symbol ||
        typeof fmpEntry.fiscalYear !== "number" ||
        !fmpEntry.period ||
        !fmpEntry.date ||
        !isValidDateString(fmpEntry.date) ||
        typeof fmpEntry.data !== "object" ||
        fmpEntry.data === null
      ) {
        console.warn(
          `Skipping invalid FMP revenue segmentation record for ${symbolToRequest} due to missing or invalid key fields:`,
          fmpEntry
        );
        continue;
      }

      recordsToUpsert.push({
        symbol: fmpEntry.symbol,
        fiscal_year: fmpEntry.fiscalYear,
        period: fmpEntry.period,
        date: fmpEntry.date,
        reported_currency: fmpEntry.reportedCurrency || null,
        data: fmpEntry.data,
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabaseAdmin
        .from("revenue_product_segmentation")
        .upsert(recordsToUpsert, {
          onConflict: "symbol,fiscal_year,period,date", // Composite PK
          count: "exact",
        });

      if (upsertError) {
        console.error(
          `Supabase upsert error for revenue_product_segmentation ${symbolToRequest}:`,
          upsertError
        );
        throw new Error(
          `Supabase upsert failed for ${symbolToRequest}: ${upsertError.message}`
        );
      }
      upsertedCount = count || 0;
      if (ENV_CONTEXT === "DEV") {
        console.log(
          `Successfully upserted ${upsertedCount} revenue segmentation records for ${symbolToRequest}.`
        );
      }
    }

    return {
      symbol: symbolToRequest,
      success: true,
      message: `Revenue segmentation data processed for ${symbolToRequest}. Fetched: ${fetchedCount}, Upserted: ${upsertedCount}.`,
      fetchedCount,
      upsertedCount,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing revenue segmentation for ${symbolToRequest}: ${errorMessage}`
    );
    return {
      symbol: symbolToRequest,
      success: false,
      message: `Failed to process revenue segmentation for ${symbolToRequest}: ${errorMessage}`,
      fetchedCount: 0,
      upsertedCount: 0,
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
    `Edge function 'fetch-fmp-revenue-segmentation' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalSymbolsProcessed: 0,
      totalSegmentationRecordsFetched: 0,
      totalSegmentationRecordsUpserted: 0,
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
        totalSymbolsProcessed: 0,
        totalSegmentationRecordsFetched: 0,
        totalSegmentationRecordsUpserted: 0,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(
      `Found ${
        activeSymbols.length
      } active symbols to process for revenue segmentation: ${activeSymbols
        .map((s: SupportedSymbol) => s.symbol)
        .join(", ")}`
    );

    const processingResults: SymbolProcessingResult[] = [];
    let totalFetched = 0;
    let totalUpserted = 0;

    for (const [index, symbolEntry] of activeSymbols.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
      }
      const result: SymbolProcessingResult =
        await fetchAndProcessSymbolRevenueSegmentation(
          symbolEntry.symbol,
          FMP_API_KEY,
          supabaseAdmin
        );
      processingResults.push(result);
      if (result.success) {
        totalFetched += result.fetchedCount;
        totalUpserted += result.upsertedCount;
      }
    }

    const overallMessage = `Revenue product segmentation processing complete. Symbols processed: ${activeSymbols.length}. Total records fetched: ${totalFetched}, total records upserted: ${totalUpserted}.`;
    console.log(overallMessage);

    if (ENV_CONTEXT === "DEV" || processingResults.some((r) => !r.success)) {
      processingResults.forEach((r) =>
        console.log(
          `Symbol: ${r.symbol}, Success: ${r.success}, Fetched: ${r.fetchedCount}, Upserted: ${r.upsertedCount}, Message: ${r.message}`
        )
      );
    }

    const response: FunctionResponse = {
      message: overallMessage,
      details: processingResults,
      totalSymbolsProcessed: activeSymbols.length,
      totalSegmentationRecordsFetched: totalFetched,
      totalSegmentationRecordsUpserted: totalUpserted,
    };

    const allSuccessful = processingResults.every((r) => r.success);
    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: allSuccessful ? 200 : 207, // 207 Multi-Status if any symbol had issues
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-revenue-segmentation' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message:
        "An internal server error occurred during revenue segmentation fetching.",
      details: [
        {
          symbol: "N/A",
          success: false,
          message: errorMessage,
          fetchedCount: 0,
          upsertedCount: 0,
        },
      ],
      totalSymbolsProcessed: 0,
      totalSegmentationRecordsFetched: 0,
      totalSegmentationRecordsUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
