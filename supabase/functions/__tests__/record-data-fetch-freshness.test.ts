import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordDataFetchFreshness } from "../lib/record-data-fetch-freshness.ts";
import type { QueueJob } from "../lib/types.ts";

const job: QueueJob = {
  id: "job-1",
  symbol: "AAPL",
  data_type: "insider-transactions",
  status: "processing",
  priority: 1,
  retry_count: 0,
  max_retries: 3,
  created_at: "2026-07-30T00:00:00Z",
  estimated_data_size_bytes: 200000,
  job_metadata: {},
};

Deno.test("records a successful empty fetch with its measured response size", async () => {
  let rpcName = "";
  let rpcArguments: Record<string, unknown> = {};
  const supabase = {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => {
      rpcName = name;
      rpcArguments = args;
      return Promise.resolve({ error: null });
    },
  } as unknown as SupabaseClient;

  await recordDataFetchFreshness(supabase, job, false, 1234);

  assertEquals(rpcName, "record_data_fetch_freshness_v2");
  assertEquals(rpcArguments, {
    p_symbol: "AAPL",
    p_data_type: "insider-transactions",
    p_has_data: false,
    p_response_size_bytes: 1234,
  });
});

Deno.test("fails the queue handler when freshness cannot be persisted", async () => {
  const supabase = {
    rpc: () =>
      Promise.resolve({
        error: { message: "database unavailable" },
      }),
  } as unknown as SupabaseClient;

  await assertRejects(
    () => recordDataFetchFreshness(supabase, job, false, 1234),
    Error,
    "Failed to record fetch freshness",
  );
});
