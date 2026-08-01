import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "../lib/types.ts";

Deno.env.set("FMP_API_KEY", "exchange-variants-quality-test-key");

const { fetchExchangeVariantsLogic } = await import(
  "../lib/fetch-fmp-exchange-variants.ts?exchange-variants-quality-test"
);

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

const job: QueueJob = {
  id: "job-exchange-variants",
  symbol: "TEST",
  data_type: "exchange-variants",
  status: "processing",
  priority: -1,
  retry_count: 0,
  max_retries: 3,
  created_at: "2026-08-01T00:00:00Z",
  estimated_data_size_bytes: 1,
  job_metadata: {},
};

function profileChain() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () =>
      Promise.resolve({
        data: {
          price: 10,
          beta: 1,
          average_volume: 1_000,
          market_cap: 1_000_000,
          last_dividend: 0,
          range: "9-11",
          change: 0.1,
          currency: "USD",
          cik: "0000000001",
          isin: null,
          cusip: null,
          exchange: "NASDAQ",
          image: null,
          ipo_date: "2020-01-01",
          default_image: true,
          is_actively_trading: true,
        },
        error: null,
      }),
  };
  return chain;
}

function exchangeVariantsChain(existing = false) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    maybeSingle: () =>
      Promise.resolve({
        data: existing
          ? { symbol_variant: "TEST", exchange_short_name: "NASDAQ" }
          : null,
        error: null,
      }),
    upsert: () => Promise.resolve({ error: null }),
    update: () => chain,
  };
  return chain;
}

Deno.test(
  "empty exchange-variants response records a quality issue before using the fallback",
  async () => {
    const originalFetch = globalThis.fetch;
    const rpcCalls: RpcCall[] = [];
    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response("[]", {
            status: 200,
            headers: { "Content-Length": "2" },
          }),
        );
      const supabase = {
        rpc: (name: string, args: Record<string, unknown>) => {
          rpcCalls.push({ name, args });
          return Promise.resolve({ error: null });
        },
        from: (table: string) => {
          if (table === "profiles") return profileChain();
          if (table === "exchange_variants") return exchangeVariantsChain();
          throw new Error(`Unexpected table access: ${table}`);
        },
      } as unknown as SupabaseClient;

      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result, { success: true, dataSizeBytes: 2 });
      assertEquals(rpcCalls.map((call) => call.name), [
        "record_data_quality_issue_v2",
      ]);
      assertEquals(
        rpcCalls[0].args.p_check_code,
        "empty_exchange_variants_response",
      );
      assertEquals(rpcCalls[0].args.p_severity, "warning");
      const evidence = rpcCalls[0].args.p_evidence as Record<string, unknown>;
      assertEquals(evidence.response_count, 0);
      assertEquals(
        evidence.endpoint_url,
        "https://financialmodelingprep.com/stable/search-exchange-variants?symbol=TEST",
      );
      assertExists(evidence.queue_job_id);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "non-empty exchange-variants response resolves the specific empty-response issue",
  async () => {
    const originalFetch = globalThis.fetch;
    const rpcCalls: RpcCall[] = [];
    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify([{
              symbol: "TEST",
              exchangeShortName: "NASDAQ",
              price: 10,
              beta: 1,
              volAvg: 1_000,
              mktCap: 1_000_000,
              lastDiv: 0,
              range: "9-11",
              changes: 0.1,
              currency: "USD",
              cik: "0000000001",
              isin: null,
              cusip: null,
              exchange: "NASDAQ",
              dcfDiff: null,
              dcf: null,
              image: null,
              ipoDate: "2020-01-01",
              defaultImage: true,
              isActivelyTrading: true,
            }]),
            {
              status: 200,
              headers: { "Content-Length": "100" },
            },
          ),
        );
      const supabase = {
        rpc: (name: string, args: Record<string, unknown>) => {
          rpcCalls.push({ name, args });
          return Promise.resolve({ error: null });
        },
        from: (table: string) => {
          if (table === "exchange_variants") return exchangeVariantsChain();
          throw new Error(`Unexpected table access: ${table}`);
        },
      } as unknown as SupabaseClient;

      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result, { success: true, dataSizeBytes: 100 });
      assertEquals(rpcCalls.map((call) => call.name), [
        "resolve_data_quality_issue_v2",
      ]);
      assertEquals(rpcCalls[0].args, {
        p_symbol: "TEST",
        p_provider: "fmp",
        p_endpoint: "exchange-variants",
        p_check_code: "empty_exchange_variants_response",
        p_field_name: "symbol_variant",
        p_source_date: null,
        p_source_period: null,
        p_source_reference: "empty-response",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "empty response fails closed when its quality issue cannot be recorded",
  async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response("[]", {
            status: 200,
            headers: { "Content-Length": "2" },
          }),
        );
      const supabase = {
        rpc: () =>
          Promise.resolve({ error: { message: "quality store unavailable" } }),
        from: (table: string) => {
          throw new Error(
            `Unexpected fallback write after RPC failure: ${table}`,
          );
        },
      } as unknown as SupabaseClient;

      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result.success, false);
      assertEquals(
        result.error,
        "Failed to record empty exchange-variants response for TEST: quality store unavailable",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
