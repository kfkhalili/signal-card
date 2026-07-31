import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "./types.ts";

const PROVIDER = "fmp";
const ENDPOINT = "financial-statements";
const CHECK_CODE = "source_timestamp_regression";
const FIELD_NAME = "accepted_date";
const SOURCE_REFERENCE = "accepted-date-regression";

function queueFailureMessage(
  symbol: string,
  incomingTimestamp: string,
  storedTimestamp: string,
): string {
  return `Stale source timestamp: FMP returned older financial statements for ${symbol} (source timestamp: ${incomingTimestamp} vs existing: ${storedTimestamp}). Stored data was preserved.`;
}

export async function recordFinancialSourceRegression(
  supabase: SupabaseClient,
  job: QueueJob,
  incomingTimestamp: string,
  storedTimestamp: string,
  responseSizeBytes: number,
): Promise<string> {
  const message = queueFailureMessage(
    job.symbol,
    incomingTimestamp,
    storedTimestamp,
  );

  const { error } = await supabase.rpc("record_data_quality_issue_v2", {
    p_symbol: job.symbol,
    p_provider: PROVIDER,
    p_endpoint: ENDPOINT,
    p_check_code: CHECK_CODE,
    p_severity: "warning",
    p_message:
      "FMP returned financial statements older than the newest stored filing; the stored data was preserved.",
    p_evidence: {
      incoming_max_accepted_date: incomingTimestamp,
      stored_max_accepted_date: storedTimestamp,
      response_size_bytes: responseSizeBytes,
      queue_job_id: job.id,
      retry_count: job.retry_count,
      max_retries: job.max_retries,
    },
    p_field_name: FIELD_NAME,
    p_source_date: null,
    p_source_period: null,
    p_source_reference: SOURCE_REFERENCE,
  });

  if (error) {
    throw new Error(
      `Failed to record financial source regression for ${job.symbol}: ${error.message}`,
    );
  }

  return message;
}

export async function resolveFinancialSourceRegression(
  supabase: SupabaseClient,
  symbol: string,
): Promise<boolean> {
  const { error } = await supabase.rpc("resolve_data_quality_issue_v2", {
    p_symbol: symbol,
    p_provider: PROVIDER,
    p_endpoint: ENDPOINT,
    p_check_code: CHECK_CODE,
    p_field_name: FIELD_NAME,
    p_source_date: null,
    p_source_period: null,
    p_source_reference: SOURCE_REFERENCE,
  });

  if (error) {
    console.error(
      `[data-quality] Failed to resolve financial source regression for ${symbol}: ${error.message}`,
    );
    return false;
  }

  return true;
}
