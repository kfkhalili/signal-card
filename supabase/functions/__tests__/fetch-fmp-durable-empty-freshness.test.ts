import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "../lib/types.ts";

Deno.env.set("FMP_API_KEY", "scheduled-baseline-test-key");

const { fetchProfileLogic } = await import(
  "../lib/fetch-fmp-profile.ts?durable-empty-test"
);
const { fetchRatiosTtmLogic } = await import(
  "../lib/fetch-fmp-ratios-ttm.ts?durable-empty-test"
);
const { fetchFinancialStatementsLogic } = await import(
  "../lib/fetch-fmp-financial-statements.ts?durable-empty-test"
);

function queueJob(dataType: string): QueueJob {
  return {
    id: `job-${dataType}`,
    symbol: "EMPTY",
    data_type: dataType,
    status: "processing",
    priority: -1,
    retry_count: 0,
    max_retries: 3,
    created_at: "2026-07-31T00:00:00Z",
    estimated_data_size_bytes: 1,
    job_metadata: {},
  };
}

function freshnessClient(
  calls: Array<{ name: string; args: Record<string, unknown> }>,
): SupabaseClient {
  return {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({ name, args });
      return Promise.resolve({ error: null });
    },
    from: (table: string) => {
      if (table !== "data_type_registry_v2") {
        throw new Error(`Unexpected table access: ${table}`);
      }

      const chain = {
        select: () => chain,
        eq: () => chain,
        single: () =>
          Promise.resolve({
            data: { source_timestamp_column: "accepted_date" },
            error: null,
          }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

Deno.test(
  "durable FMP handlers record valid empty responses without sentinel writes",
  async () => {
    const originalFetch = globalThis.fetch;

    try {
      {
        const calls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        globalThis.fetch = () =>
          Promise.resolve(
            new Response("[]", {
              status: 200,
              headers: { "Content-Length": "17" },
            }),
          );

        const result = await fetchProfileLogic(
          queueJob("profile"),
          freshnessClient(calls),
        );

        assertEquals(result.success, true);
        assertEquals(result.dataSizeBytes, 17);
        assertEquals(calls, [{
          name: "record_data_fetch_freshness_v2",
          args: {
            p_symbol: "EMPTY",
            p_data_type: "profile",
            p_has_data: false,
            p_response_size_bytes: 17,
          },
        }]);
      }

      {
        const calls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        globalThis.fetch = () =>
          Promise.resolve(
            new Response("[]", {
              status: 200,
              headers: { "Content-Length": "23" },
            }),
          );

        const result = await fetchRatiosTtmLogic(
          queueJob("ratios-ttm"),
          freshnessClient(calls),
        );

        assertEquals(result.success, true);
        assertEquals(result.dataSizeBytes, 23);
        assertEquals(calls, [{
          name: "record_data_fetch_freshness_v2",
          args: {
            p_symbol: "EMPTY",
            p_data_type: "ratios-ttm",
            p_has_data: false,
            p_response_size_bytes: 23,
          },
        }]);
      }

      {
        const calls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        const responseSizes = [11, 13, 17];
        globalThis.fetch = () => {
          const size = responseSizes.shift();
          if (size === undefined) {
            throw new Error("Unexpected fourth financial statement request");
          }
          return Promise.resolve(
            new Response("[]", {
              status: 200,
              headers: { "Content-Length": String(size) },
            }),
          );
        };

        const result = await fetchFinancialStatementsLogic(
          queueJob("financial-statements"),
          freshnessClient(calls),
        );

        assertEquals(result.success, true);
        assertEquals(result.dataSizeBytes, 41);
        assertEquals(responseSizes, []);
        assertEquals(calls, [{
          name: "record_data_fetch_freshness_v2",
          args: {
            p_symbol: "EMPTY",
            p_data_type: "financial-statements",
            p_has_data: false,
            p_response_size_bytes: 41,
          },
        }]);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "invalid durable response fails without advancing freshness",
  async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{
      name: string;
      args: Record<string, unknown>;
    }> = [];

    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response('{"error":"schema drift"}', {
            status: 200,
            headers: { "Content-Length": "24" },
          }),
        );

      const result = await fetchRatiosTtmLogic(
        queueJob("ratios-ttm"),
        freshnessClient(calls),
      );

      assertEquals(result.success, false);
      assertStringIncludes(result.error ?? "", "Expected an array");
      assertEquals(calls, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
