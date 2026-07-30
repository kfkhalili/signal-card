import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "./types.ts";

/**
 * Record freshness only after an upstream response has been validated and any
 * returned business data has been persisted. A failure here fails the queue
 * job so a successful empty response can never be silently left uncached.
 */
export async function recordDataFetchFreshness(
  supabase: SupabaseClient,
  job: QueueJob,
  hasData: boolean,
  responseSizeBytes: number,
): Promise<void> {
  const { error } = await supabase.rpc("record_data_fetch_freshness_v2", {
    p_symbol: job.symbol,
    p_data_type: job.data_type,
    p_has_data: hasData,
    p_response_size_bytes: responseSizeBytes,
  });

  if (error) {
    throw new Error(
      `Failed to record fetch freshness for ${job.symbol}/${job.data_type}: ${error.message}`,
    );
  }
}
