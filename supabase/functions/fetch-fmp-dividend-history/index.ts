// supabase/functions/fetch-fmp-dividend-history/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  FmpDividendData,
  SupabaseDividendRecord,
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

const FMP_DIVIDENDS_BASE_URL =
  "https://financialmodelingprep.com/stable/dividends";
const FMP_API_DELAY_MS = 300; // Be respectful of FMP rate limits

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

async function fetchAndProcessSymbolDividends(
  symbolToRequest: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolProcessingResult> {
  const dividendsUrl = `${FMP_DIVIDENDS_BASE_URL}?symbol=${symbolToRequest}&apikey=${apiKey}`;
  let fetchedCount = 0;
  let upsertedCount = 0;

  try {
    const response: Response = await fetch(dividendsUrl);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch dividend data for ${symbolToRequest}: ${response.status} ${errorText} from URL: ${dividendsUrl}`
      );
    }

    const fmpDividendResult: unknown = await response.json();

    if (!Array.isArray(fmpDividendResult)) {
      // FMP might return an empty object {} if no dividends or invalid symbol
      if (
        typeof fmpDividendResult === "object" &&
        fmpDividendResult !== null &&
        Object.keys(fmpDividendResult).length === 0
      ) {
        return {
          symbol: symbolToRequest,
          success: true,
          message: `No dividend data found for ${symbolToRequest}.`,
          fetchedCount: 0,
          upsertedCount: 0,
        };
      }
      throw new Error(
        `Invalid dividend data array returned from FMP for ${symbolToRequest}. Response: ${JSON.stringify(
          fmpDividendResult
        )}`
      );
    }

    fetchedCount = fmpDividendResult.length;
    if (fetchedCount === 0) {
      return {
        symbol: symbolToRequest,
        success: true,
        message: `No dividend entries in array for ${symbolToRequest}.`,
        fetchedCount: 0,
        upsertedCount: 0,
      };
    }

    const recordsToUpsert: SupabaseDividendRecord[] = [];
    for (const fmpEntry of fmpDividendResult as FmpDividendData[]) {
      if (
        !fmpEntry.symbol ||
        !fmpEntry.date ||
        !isValidDateString(fmpEntry.date)
      ) {
        console.warn(
          `Skipping invalid FMP dividend record for ${symbolToRequest} due to missing symbol or invalid date format:`,
          fmpEntry
        );
        continue;
      }

      recordsToUpsert.push({
        symbol: fmpEntry.symbol, // Use symbol from FMP data for consistency
        date: fmpEntry.date,
        record_date: isValidDateString(fmpEntry.recordDate)
          ? fmpEntry.recordDate
          : null,
        payment_date: isValidDateString(fmpEntry.paymentDate)
          ? fmpEntry.paymentDate
          : null,
        declaration_date: isValidDateString(fmpEntry.declarationDate)
          ? fmpEntry.declarationDate
          : null,
        adj_dividend:
          typeof fmpEntry.adjDividend === "number"
            ? fmpEntry.adjDividend
            : null,
        dividend:
          typeof fmpEntry.dividend === "number" ? fmpEntry.dividend : null,
        yield: typeof fmpEntry.yield === "number" ? fmpEntry.yield : null,
        frequency: fmpEntry.frequency || null,
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabaseAdmin
        .from("dividend_history")
        .upsert(recordsToUpsert, {
          onConflict: "symbol,date",
          count: "exact",
        });

      if (upsertError) {
        console.error(
          `Supabase upsert error for dividend_history ${symbolToRequest}:`,
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
      message: `Dividend data processed for ${symbolToRequest}. Fetched: ${fetchedCount}, Upserted: ${upsertedCount}.`,
      fetchedCount,
      upsertedCount,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing dividends for ${symbolToRequest}: ${errorMessage}`
    );
    return {
      symbol: symbolToRequest,
      success: false,
      message: `Failed to process dividends for ${symbolToRequest}: ${errorMessage}`,
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
    `Edge function 'fetch-fmp-dividend-history' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalSymbolsProcessed: 0,
      totalDividendsFetched: 0,
      totalDividendsUpserted: 0,
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
        totalDividendsFetched: 0,
        totalDividendsUpserted: 0,
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
        await fetchAndProcessSymbolDividends(
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

    const overallMessage = `Dividend history processing complete. Symbols processed: ${activeSymbols.length}. Total dividends fetched: ${totalFetched}, total dividends upserted: ${totalUpserted}.`;
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
      totalDividendsFetched: totalFetched,
      totalDividendsUpserted: totalUpserted,
    };

    const allSuccessful = processingResults.every((r) => r.success);
    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: allSuccessful ? 200 : 207, // 207 Multi-Status if any symbol had issues
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-dividend-history' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message:
        "An internal server error occurred during dividend history fetching.",
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
      totalDividendsFetched: 0,
      totalDividendsUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
