// supabase/functions/fetch-fmp-grades-historical/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  FmpGradesHistoricalData,
  SupabaseGradesHistoricalRecord,
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

const FMP_GRADES_HISTORICAL_BASE_URL =
  "https://financialmodelingprep.com/stable/grades-historical";
const FMP_API_DELAY_MS = 350; // Adjusted delay

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

async function fetchAndProcessSymbolGradesHistorical(
  symbolToRequest: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolProcessingResult> {
  const gradesUrl = `${FMP_GRADES_HISTORICAL_BASE_URL}?symbol=${symbolToRequest}&apikey=${apiKey}`;
  let fetchedCount = 0;
  let upsertedCount = 0;

  try {
    const response: Response = await fetch(gradesUrl);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch historical grades for ${symbolToRequest}: ${response.status} ${errorText} from URL: ${gradesUrl}`
      );
    }

    const fmpGradesResult: unknown = await response.json();

    if (!Array.isArray(fmpGradesResult)) {
      if (
        typeof fmpGradesResult === "object" &&
        fmpGradesResult !== null &&
        Object.keys(fmpGradesResult).length === 0
      ) {
        return {
          symbol: symbolToRequest,
          success: true,
          message: `No historical grades data found for ${symbolToRequest}.`,
          fetchedCount: 0,
          upsertedCount: 0,
        };
      }
      throw new Error(
        `Invalid historical grades data array returned from FMP for ${symbolToRequest}. Response: ${JSON.stringify(
          fmpGradesResult
        )}`
      );
    }

    fetchedCount = fmpGradesResult.length;
    if (fetchedCount === 0) {
      return {
        symbol: symbolToRequest,
        success: true,
        message: `No historical grades entries in array for ${symbolToRequest}.`,
        fetchedCount: 0,
        upsertedCount: 0,
      };
    }

    const recordsToUpsert: SupabaseGradesHistoricalRecord[] = [];
    for (const fmpEntry of fmpGradesResult as FmpGradesHistoricalData[]) {
      if (
        !fmpEntry.symbol ||
        !fmpEntry.date ||
        !isValidDateString(fmpEntry.date)
      ) {
        console.warn(
          `Skipping invalid FMP historical grade record for ${symbolToRequest} due to missing symbol or invalid date:`,
          fmpEntry
        );
        continue;
      }

      recordsToUpsert.push({
        symbol: fmpEntry.symbol,
        date: fmpEntry.date,
        analyst_ratings_strong_buy:
          typeof fmpEntry.analystRatingsStrongBuy === "number"
            ? fmpEntry.analystRatingsStrongBuy
            : null,
        analyst_ratings_buy:
          typeof fmpEntry.analystRatingsBuy === "number"
            ? fmpEntry.analystRatingsBuy
            : null,
        analyst_ratings_hold:
          typeof fmpEntry.analystRatingsHold === "number"
            ? fmpEntry.analystRatingsHold
            : null,
        analyst_ratings_sell:
          typeof fmpEntry.analystRatingsSell === "number"
            ? fmpEntry.analystRatingsSell
            : null,
        analyst_ratings_strong_sell:
          typeof fmpEntry.analystRatingsStrongSell === "number"
            ? fmpEntry.analystRatingsStrongSell
            : null,
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabaseAdmin
        .from("grades_historical")
        .upsert(recordsToUpsert, {
          onConflict: "symbol,date",
          count: "exact",
        });

      if (upsertError) {
        console.error(
          `Supabase upsert error for grades_historical ${symbolToRequest}:`,
          upsertError
        );
        throw new Error(
          `Supabase upsert failed for ${symbolToRequest}: ${upsertError.message}`
        );
      }
      upsertedCount = count || 0;
    }

    return {
      symbol: symbolToRequest,
      success: true,
      message: `Historical grades data processed for ${symbolToRequest}. Fetched: ${fetchedCount}, Upserted: ${upsertedCount}.`,
      fetchedCount,
      upsertedCount,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing historical grades for ${symbolToRequest}: ${errorMessage}`
    );
    return {
      symbol: symbolToRequest,
      success: false,
      message: `Failed to process historical grades for ${symbolToRequest}: ${errorMessage}`,
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
    `Edge function 'fetch-fmp-grades-historical' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalSymbolsProcessed: 0,
      totalGradesFetched: 0,
      totalGradesUpserted: 0,
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
        totalGradesFetched: 0,
        totalGradesUpserted: 0,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const processingResults: SymbolProcessingResult[] = [];
    let totalFetched = 0;
    let totalUpserted = 0;

    for (const [index, symbolEntry] of activeSymbols.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
      }
      const result: SymbolProcessingResult =
        await fetchAndProcessSymbolGradesHistorical(
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

    const overallMessage = `Historical grades processing complete. Symbols processed: ${activeSymbols.length}. Total records fetched: ${totalFetched}, total records upserted: ${totalUpserted}.`;
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
      totalGradesFetched: totalFetched,
      totalGradesUpserted: totalUpserted,
    };

    const allSuccessful = processingResults.every((r) => r.success);
    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: allSuccessful ? 200 : 207, // 207 Multi-Status if any symbol had issues
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-grades-historical' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message:
        "An internal server error occurred during historical grades fetching.",
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
      totalGradesFetched: 0,
      totalGradesUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
