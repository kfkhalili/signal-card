// supabase/functions/fetch-financial-statements/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FmpStatementEntryBase,
  FmpIncomeStatementEntry,
  FmpBalanceSheetEntry,
  FmpCashFlowEntry,
  FinancialStatementRecord,
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

// FMP Stable Endpoints
const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const INCOME_STATEMENT_ENDPOINT = `${FMP_BASE_URL}/income-statement`;
const BALANCE_SHEET_ENDPOINT = `${FMP_BASE_URL}/balance-sheet-statement`;
const CASH_FLOW_ENDPOINT = `${FMP_BASE_URL}/cash-flow-statement`;

const FMP_API_DELAY_MS = 300; // Increased delay slightly

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
  if (!apiKey || apiKey.length < 8) return url; // Check for a reasonable API key length
  // Censor all but the first and last few characters for better security logging
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

async function fetchFmpData<T extends FmpStatementEntryBase>(
  baseUrl: string,
  symbol: string,
  statementType: string,
  apiKey: string
): Promise<T[]> {
  // FMP's stable endpoints often require the symbol in the path
  // and other parameters like 'period' or 'limit' as query params.
  // The examples provided use ?symbol=<symbol>, so we'll stick to that for now.
  // If FMP /stable/ requires /stable/income-statement/AAPL?apikey=... then adjust accordingly.
  // For now, assuming ?symbol= works with /stable/ based on initial prompt.
  const fullUrl = `${baseUrl}?symbol=${symbol}&apikey=${apiKey}`;

  if (ENV_CONTEXT === "DEV") {
    console.log(
      `Fetching ${statementType} for ${symbol} from ${censorApiKey(
        fullUrl,
        apiKey
      )}`
    );
  }

  const response: Response = await fetch(fullUrl);

  if (!response.ok) {
    const errorText: string = await response.text();
    console.error(
      `Failed to fetch ${statementType} for ${symbol}: ${response.status} ${errorText} from URL: ${fullUrl}`
    );
    return []; // Return empty array to allow other operations to continue
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    console.error(
      `Invalid data format for ${statementType} for ${symbol}: Expected array, got ${typeof data}. Response: ${JSON.stringify(
        data
      )}`
    );
    return [];
  }
  // No further runtime validation of each item's structure here for brevity,
  // relying on FMP's consistency and our TypeScript types.
  return data as T[];
}

async function processSymbol(
  symbol: string,
  supabaseAdmin: SupabaseClient,
  apiKey: string
): Promise<SymbolProcessingResult> {
  let message = `Processing symbol: ${symbol}\n`;
  const statementsForSymbolUpsert: FinancialStatementRecord[] = [];

  try {
    // Stagger API calls
    await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
    const incomeStatements: FmpIncomeStatementEntry[] =
      await fetchFmpData<FmpIncomeStatementEntry>(
        INCOME_STATEMENT_ENDPOINT,
        symbol,
        "Income Statement",
        apiKey
      );

    await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
    const balanceSheets: FmpBalanceSheetEntry[] =
      await fetchFmpData<FmpBalanceSheetEntry>(
        BALANCE_SHEET_ENDPOINT,
        symbol,
        "Balance Sheet",
        apiKey
      );

    await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
    const cashFlows: FmpCashFlowEntry[] = await fetchFmpData<FmpCashFlowEntry>(
      CASH_FLOW_ENDPOINT,
      symbol,
      "Cash Flow",
      apiKey
    );

    message += `  Fetched: ${incomeStatements.length} income, ${balanceSheets.length} balance, ${cashFlows.length} cash flow statements.\n`;

    // Use a Map to consolidate data by a unique key (date + period)
    // This helps ensure each financial period is processed once, even if FMP returns duplicates or slightly varied entries.
    const consolidatedStatements = new Map<
      string,
      Partial<FinancialStatementRecord>
    >();

    const allStatements = [
      ...incomeStatements.map((s) => ({ ...s, type: "income" })),
      ...balanceSheets.map((s) => ({ ...s, type: "balance" })),
      ...cashFlows.map((s) => ({ ...s, type: "cashflow" })),
    ];

    for (const stmt of allStatements) {
      if (!stmt.date || !stmt.period || !stmt.symbol) {
        console.warn(
          `Skipping statement entry with missing key fields for ${symbol}:`,
          stmt
        );
        continue;
      }
      const key = `${stmt.date}-${stmt.period}`;
      const existing = consolidatedStatements.get(key) || {
        symbol: symbol, // Use the symbol from our DB/loop
        date: stmt.date,
        period: stmt.period,
        reported_currency: stmt.reportedCurrency,
        cik: stmt.cik,
        filing_date: stmt.filingDate,
        accepted_date: stmt.acceptedDate,
        fiscal_year: stmt.fiscalYear,
      };

      if (stmt.type === "income")
        existing.income_statement_payload = stmt as FmpIncomeStatementEntry;
      else if (stmt.type === "balance")
        existing.balance_sheet_payload = stmt as FmpBalanceSheetEntry;
      else if (stmt.type === "cashflow")
        existing.cash_flow_payload = stmt as FmpCashFlowEntry;

      consolidatedStatements.set(key, existing);
    }

    consolidatedStatements.forEach((record) => {
      // Only add if there's at least one payload to avoid empty records
      if (
        record.income_statement_payload ||
        record.balance_sheet_payload ||
        record.cash_flow_payload
      ) {
        statementsForSymbolUpsert.push(record as FinancialStatementRecord);
      }
    });

    if (statementsForSymbolUpsert.length > 0) {
      const { error: upsertError, count } = await supabaseAdmin
        .from("financial_statements")
        .upsert(statementsForSymbolUpsert, {
          onConflict: "symbol,date,period",
          count: "exact",
        });

      if (upsertError) {
        message += `  Supabase upsert error for ${symbol}: ${upsertError.message}\n`;
        console.error(`Supabase upsert error for ${symbol}:`, upsertError);
        return { symbol, success: false, message: message.trim() };
      }
      const currentUpsertCount = count || 0;
      message += `  Successfully upserted/updated ${currentUpsertCount} statement periods for ${symbol}.\n`;

      // Update last_processed_at for the symbol in supported_symbols table
      const { error: updateError } = await supabaseAdmin
        .from("supported_symbols")
        .update({ last_processed_at: new Date().toISOString() })
        .eq("symbol", symbol);
      if (updateError) {
        message += `  Failed to update last_processed_at for ${symbol}: ${updateError.message}\n`;
        console.error(
          `Failed to update last_processed_at for ${symbol}:`,
          updateError
        );
        // Decide if this constitutes a symbol processing failure
      }
    } else {
      message += `  No consolidated statement data to upsert for ${symbol}.\n`;
    }
    return { symbol, success: true, message: message.trim() };
  } catch (e: unknown) {
    message += `  Error processing symbol ${symbol}: ${getErrorMessage(e)}\n`;
    console.error(`Error processing symbol ${symbol}:`, e);
    return { symbol, success: false, message: message.trim() };
  }
}

Deno.serve(async (_req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const invocationTime: string = new Date().toISOString();
  console.log(
    `Edge function 'fetch-financial-statements' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
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

    // Process symbols sequentially to manage API rate limits and logging clarity
    const symbolProcessingResults: SymbolProcessingResult[] = [];
    for (const { symbol } of activeSymbols) {
      if (!symbol) continue;
      const result = await processSymbol(symbol, supabaseAdmin, FMP_API_KEY);
      symbolProcessingResults.push(result);
    }

    const totalUpsertedCount = symbolProcessingResults.reduce((acc, result) => {
      if (result.success) {
        // Try to parse the number of upserted items from the message
        const match = result.message.match(
          /Successfully upserted\/updated (\d+) statement periods/
        );
        if (match && match[1]) {
          return acc + parseInt(match[1], 10);
        }
      }
      return acc;
    }, 0);

    const overallMessage = `Financial statements processing complete. Total records upserted across all symbols: ${totalUpsertedCount}.`;
    console.log(overallMessage);
    if (ENV_CONTEXT === "DEV") {
      symbolProcessingResults.forEach((r) => console.log(r.message));
    }

    const response: FunctionResponse = {
      message: overallMessage,
      details: symbolProcessingResults,
      totalUpserted: totalUpsertedCount,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-financial-statements' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message: "An internal server error occurred.",
      details: [{ symbol: "N/A", success: false, message: errorMessage }],
      totalUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
