import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "./types.ts";

const PROVIDER = "fmp";
const ENDPOINT = "exchange-variants";
const CHECK_CODE = "empty_exchange_variants_response";
const FIELD_NAME = "symbol_variant";
const SOURCE_REFERENCE = "empty-response";
const FMP_ENDPOINT_URL =
  "https://financialmodelingprep.com/stable/search-exchange-variants";

export async function recordEmptyExchangeVariantsResponse(
  supabase: SupabaseClient,
  job: QueueJob,
  responseSizeBytes: number,
): Promise<void> {
  const validationUrl = `${FMP_ENDPOINT_URL}?symbol=${
    encodeURIComponent(job.symbol)
  }`;
  const { error } = await supabase.rpc("record_data_quality_issue_v2", {
    p_symbol: job.symbol,
    p_provider: PROVIDER,
    p_endpoint: ENDPOINT,
    p_check_code: CHECK_CODE,
    p_severity: "warning",
    p_message:
      "FMP returned an empty exchange-variants array for a listed symbol; a profile-derived fallback was used for display continuity.",
    p_evidence: {
      response_count: 0,
      response_size_bytes: responseSizeBytes,
      endpoint_url: validationUrl,
      queue_job_id: job.id,
      retry_count: job.retry_count,
      max_retries: job.max_retries,
      fallback_strategy: "profile-derived-sentinel",
    },
    p_field_name: FIELD_NAME,
    p_source_date: null,
    p_source_period: null,
    p_source_reference: SOURCE_REFERENCE,
  });

  if (error) {
    throw new Error(
      `Failed to record empty exchange-variants response for ${job.symbol}: ${error.message}`,
    );
  }
}

export async function resolveEmptyExchangeVariantsResponse(
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
      `[data-quality] Failed to resolve empty exchange-variants response for ${symbol}: ${error.message}`,
    );
    return false;
  }

  return true;
}
