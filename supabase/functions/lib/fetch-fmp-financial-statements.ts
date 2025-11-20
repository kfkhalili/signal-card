// supabase/functions/lib/fetch-fmp-financial-statements.ts
// Library function for processing financial-statements jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpStatementEntryBase,
  FmpIncomeStatementEntry,
  FmpBalanceSheetEntry,
  FmpCashFlowEntry,
  FinancialStatementRecord,
} from '../fetch-fmp-financial-statements/types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const INCOME_STATEMENT_ENDPOINT = `${FMP_BASE_URL}/income-statement`;
const BALANCE_SHEET_ENDPOINT = `${FMP_BASE_URL}/balance-sheet-statement`;
const CASH_FLOW_ENDPOINT = `${FMP_BASE_URL}/cash-flow-statement`;
const FMP_API_DELAY_MS = 300; // Delay between API calls to respect rate limits


async function fetchFmpData<T extends FmpStatementEntryBase>(
  baseUrl: string,
  symbol: string,
  statementType: string,
  apiKey: string
): Promise<T[]> {
  const fullUrl = `${baseUrl}?symbol=${symbol}&apikey=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  let response: Response;
  try {
    response = await fetch(fullUrl, { signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`FMP API request timed out after 10 seconds for ${statementType}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FMP API error for ${statementType}: ${response.status} ${errorText}`);
  }

  // CRITICAL: Get the ACTUAL data transfer size (what FMP bills for)
  const contentLength = response.headers.get('Content-Length');
  let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
  if (actualSizeBytes === 0) {
    console.warn(`[fetchFinancialStatementsLogic] Content-Length header missing for ${symbol}/${statementType}. Using fallback estimate.`);
    actualSizeBytes = 200000; // 200 KB conservative estimate per statement type
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`Invalid data format for ${statementType}: Expected array, got ${typeof data}`);
  }

  return data as T[];
}

export async function fetchFinancialStatementsLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'financial-statements') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchFinancialStatementsLogic was called for job type ${job.data_type}. Expected 'financial-statements'.`,
    };
  }

  try {
    if (!FMP_API_KEY) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }

    const statementsForSymbolUpsert: FinancialStatementRecord[] = [];
    let totalDataSizeBytes = 0;

    // Fetch income statements
    await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
    const incomeStatements: FmpIncomeStatementEntry[] = await fetchFmpData<FmpIncomeStatementEntry>(
      INCOME_STATEMENT_ENDPOINT,
      job.symbol,
      'Income Statement',
      FMP_API_KEY
    );
    totalDataSizeBytes += incomeStatements.length > 0 ? 200000 : 0; // Estimate per statement type

    // Fetch balance sheets
    await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
    const balanceSheets: FmpBalanceSheetEntry[] = await fetchFmpData<FmpBalanceSheetEntry>(
      BALANCE_SHEET_ENDPOINT,
      job.symbol,
      'Balance Sheet',
      FMP_API_KEY
    );
    totalDataSizeBytes += balanceSheets.length > 0 ? 200000 : 0;

    // Fetch cash flow statements
    await new Promise((resolve) => setTimeout(resolve, FMP_API_DELAY_MS));
    const cashFlows: FmpCashFlowEntry[] = await fetchFmpData<FmpCashFlowEntry>(
      CASH_FLOW_ENDPOINT,
      job.symbol,
      'Cash Flow',
      FMP_API_KEY
    );
    totalDataSizeBytes += cashFlows.length > 0 ? 200000 : 0;

    // Use a Map to consolidate data by a unique key (date + period)
    const consolidatedStatements = new Map<string, Partial<FinancialStatementRecord>>();

    const allStatements = [
      ...incomeStatements.map((s) => ({ ...s, type: 'income' })),
      ...balanceSheets.map((s) => ({ ...s, type: 'balance' })),
      ...cashFlows.map((s) => ({ ...s, type: 'cashflow' })),
    ];

    for (const stmt of allStatements) {
      if (!stmt.date || !stmt.period || !stmt.symbol) {
        console.warn(`Skipping statement entry with missing key fields for ${job.symbol}:`, stmt);
        continue;
      }
      const key = `${stmt.date}-${stmt.period}`;
      const existing = consolidatedStatements.get(key) || {
        symbol: job.symbol,
        date: stmt.date,
        period: stmt.period,
        reported_currency: stmt.reportedCurrency,
        cik: stmt.cik,
        filing_date: stmt.filingDate,
        accepted_date: stmt.acceptedDate,
        fiscal_year: stmt.fiscalYear,
      };

      // CRITICAL: Always update fetched_at when processing statements (even if record already exists)
      // Type assertion needed because fetched_at is optional in the type definition
      (existing as FinancialStatementRecord & { fetched_at: string }).fetched_at = new Date().toISOString();

      if (stmt.type === 'income') {
        existing.income_statement_payload = stmt as FmpIncomeStatementEntry;
      } else if (stmt.type === 'balance') {
        existing.balance_sheet_payload = stmt as FmpBalanceSheetEntry;
      } else if (stmt.type === 'cashflow') {
        existing.cash_flow_payload = stmt as FmpCashFlowEntry;
      }

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
      const { error: upsertError, count } = await supabase
        .from('financial_statements')
        .upsert(statementsForSymbolUpsert, {
          onConflict: 'symbol,date,period',
          count: 'exact',
        });

      if (upsertError) {
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }

      console.log(`[fetchFinancialStatementsLogic] Successfully upserted ${count || 0} statement periods for ${job.symbol}`);
    } else {
      console.warn(`[fetchFinancialStatementsLogic] No consolidated statement data to upsert for ${job.symbol}`);
    }

    return {
      success: true,
      dataSizeBytes: totalDataSizeBytes,
    };
  } catch (error) {
    return {
      success: false,
      dataSizeBytes: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

