// supabase/functions/fetch-fmp-shares-float/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  FmpSharesFloatData,
  SupabaseSharesFloatRecord,
  ProcessingResult,
  FunctionResponse,
} from "./types.ts";

const ENV_CONTEXT: string = Deno.env.get("ENV_CONTEXT") || "PROD";
const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");
const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const FMP_SHARES_FLOAT_BASE_URL =
  "https://financialmodelingprep.com/stable/shares-float-all";
const FMP_PAGE_LIMIT = 5000;
const FMP_API_DELAY_MS = 250; // Adjusted delay slightly

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

/**
 * Parses a date string (potentially "YYYY-MM-DD HH:MM:SS") to "YYYY-MM-DD".
 * Returns null if the date string is invalid or cannot be parsed.
 */
function parseDateToYMD(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  try {
    // Attempt to create a date object. Handles various formats robustly.
    const dateObj = new Date(dateString);
    // Check if the date object is valid
    if (isNaN(dateObj.getTime())) {
      // console.warn(`Invalid date string encountered: ${dateString}`);
      return null;
    }
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    // console.warn(`Error parsing date string "${dateString}": ${getErrorMessage(e)}`);
    return null;
  }
}

async function fetchPageAndUpsert(
  page: number,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<ProcessingResult> {
  const sharesFloatUrl = `${FMP_SHARES_FLOAT_BASE_URL}?page=${page}&limit=${FMP_PAGE_LIMIT}&apikey=${apiKey}`;
  let fetchedCount = 0;
  let upsertedCount = 0;
  let skippedCount = 0;

  try {
    const response: Response = await fetch(sharesFloatUrl);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch shares float page ${page}: ${response.status} ${errorText} from URL: ${sharesFloatUrl}`
      );
    }

    const fmpDataArray: unknown = await response.json();

    if (!Array.isArray(fmpDataArray)) {
      throw new Error(
        `Invalid data format for shares float page ${page}: Expected array, got ${typeof fmpDataArray}.`
      );
    }

    fetchedCount = fmpDataArray.length;
    if (fetchedCount === 0) {
      return {
        page,
        fetchedCount: 0,
        upsertedCount: 0,
        skippedCount: 0,
        success: true,
        message: `Page ${page}: No more data.`,
      };
    }

    const recordsToUpsert: SupabaseSharesFloatRecord[] = [];
    for (const item of fmpDataArray) {
      const data = item as FmpSharesFloatData;

      const parsedDate = parseDateToYMD(data.date);

      if (
        !data ||
        typeof data.symbol !== "string" ||
        !data.symbol.trim() ||
        !parsedDate // Ensure date was successfully parsed to "YYYY-MM-DD"
      ) {
        skippedCount++;
        continue;
      }

      recordsToUpsert.push({
        symbol: data.symbol.trim(),
        date: parsedDate, // Use the parsed "YYYY-MM-DD" date
        free_float: typeof data.freeFloat === "number" ? data.freeFloat : null,
        float_shares:
          typeof data.floatShares === "number" ? data.floatShares : null,
        outstanding_shares:
          typeof data.outstandingShares === "number"
            ? data.outstandingShares
            : null,
      });
    }

    if (recordsToUpsert.length > 0) {
      const { error: upsertError, count } = await supabaseAdmin
        .from("shares_float")
        .upsert(recordsToUpsert, {
          onConflict: "symbol,date", // Composite PK
          count: "exact",
        });

      if (upsertError) {
        console.error(
          `Supabase upsert error for shares_float page ${page}:`,
          upsertError
        );
        throw new Error(
          `Supabase upsert failed for page ${page}: ${upsertError.message}`
        );
      }
      upsertedCount = count || 0;
    }

    return {
      page,
      fetchedCount,
      upsertedCount,
      skippedCount,
      success: true,
      message: `Page ${page}: Fetched ${fetchedCount}, Prepared ${recordsToUpsert.length}, Upserted ${upsertedCount}, Skipped ${skippedCount}.`,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing shares float page ${page}: ${errorMessage}`
    );
    return {
      page,
      fetchedCount,
      upsertedCount,
      skippedCount,
      success: false,
      message: `Page ${page}: Failed - ${errorMessage}`,
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
    `Edge function 'fetch-fmp-shares-float' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalPagesProcessed: 0,
      totalRecordsFetched: 0,
      totalRecordsUpserted: 0,
      totalRecordsSkipped: 0,
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

  const allResults: ProcessingResult[] = [];
  let currentPage = 0;
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;
  let keepFetching = true;
  // Max pages to prevent infinite loops if API behaves unexpectedly
  const MAX_PAGES_TO_PROCESS = 200;

  try {
    while (keepFetching && currentPage < MAX_PAGES_TO_PROCESS) {
      if (currentPage > 0) {
        await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
      }
      const pageResult: ProcessingResult = await fetchPageAndUpsert(
        currentPage,
        FMP_API_KEY,
        supabaseAdmin
      );
      allResults.push(pageResult);

      totalFetched += pageResult.fetchedCount;
      totalUpserted += pageResult.upsertedCount;
      totalSkipped += pageResult.skippedCount;

      // Stop if no records fetched on a page (usual end condition)
      // or if fetched less than limit (also indicates end for some APIs, though FMP is usually consistent)
      if (
        pageResult.fetchedCount === 0 ||
        pageResult.fetchedCount < FMP_PAGE_LIMIT
      ) {
        keepFetching = false;
      }
      currentPage++;
    }

    if (currentPage === MAX_PAGES_TO_PROCESS && keepFetching) {
      console.warn(
        `Stopped fetching due to reaching MAX_PAGES_TO_PROCESS limit of ${MAX_PAGES_TO_PROCESS}.`
      );
      allResults.push({
        page: currentPage,
        fetchedCount: 0,
        upsertedCount: 0,
        skippedCount: 0,
        success: false,
        message: `Stopped due to exceeding maximum page processing limit (${MAX_PAGES_TO_PROCESS}).`,
      });
    }

    const overallMessage = `Shares float processing complete. Total pages attempted: ${currentPage}. Records fetched: ${totalFetched}, upserted: ${totalUpserted}, skipped: ${totalSkipped}.`;
    console.log(overallMessage);

    if (
      ENV_CONTEXT === "DEV" ||
      allResults.some((r) => !r.success || r.skippedCount > 0)
    ) {
      allResults.forEach((r) =>
        console.log(
          `Page: ${r.page}, Fetched: ${r.fetchedCount}, Upserted: ${r.upsertedCount}, Skipped: ${r.skippedCount}, Success: ${r.success}, Message: ${r.message}`
        )
      );
    }

    const response: FunctionResponse = {
      message: overallMessage,
      details: allResults,
      totalPagesProcessed: currentPage,
      totalRecordsFetched: totalFetched,
      totalRecordsUpserted: totalUpserted,
      totalRecordsSkipped: totalSkipped,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status:
        allResults.every((r) => r.success) && totalSkipped === 0 ? 200 : 207, // 207 Multi-Status if any page had issues or skips
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-shares-float' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message:
        "An internal server error occurred during shares float fetching.",
      details: [
        {
          page: currentPage,
          fetchedCount: 0,
          upsertedCount: 0,
          skippedCount: totalSkipped,
          success: false,
          message: errorMessage,
        },
      ],
      totalPagesProcessed: currentPage,
      totalRecordsFetched: totalFetched,
      totalRecordsUpserted: totalUpserted,
      totalRecordsSkipped: totalSkipped,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
