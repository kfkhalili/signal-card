import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "../lib/types.ts";
import { validateExchangeVariantsResponse } from "../lib/exchange-variants-quality.ts";

Deno.env.set("FMP_API_KEY", "exchange-variants-quality-test-key");

const { fetchExchangeVariantsLogic } = await import(
  "../lib/fetch-fmp-exchange-variants.ts?exchange-variants-quality-gate-test"
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

const baseVariant = {
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
};

const xetraVariant = {
  ...baseVariant,
  symbol: "TEST.DE",
  exchangeShortName: "XETRA",
  currency: "EUR",
};

function mockClient(options: {
  existing?: Array<{
    symbol_variant: string;
    exchange_short_name: string;
    is_actively_trading: boolean | null;
  }>;
  exchanges?: string[];
  profile?: { exchange: string } | null;
  syncError?: string;
}) {
  const rpcCalls: RpcCall[] = [];
  const fromCalls: string[] = [];
  const supabase = {
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({
        data: name === "replace_exchange_variants_v2" ? 2 : null,
        error: name === "sync_data_quality_issues" && options.syncError
          ? { message: options.syncError }
          : null,
      });
    },
    from: (table: string) => {
      fromCalls.push(table);
      if (table === "profiles") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: () =>
            Promise.resolve({ data: options.profile ?? null, error: null }),
        };
        return chain;
      }
      if (table === "exchange_variants") {
        const chain = {
          select: () => chain,
          eq: () =>
            Promise.resolve({ data: options.existing ?? [], error: null }),
        };
        return chain;
      }
      if (table === "available_exchanges") {
        return {
          select: () =>
            Promise.resolve({
              data: (options.exchanges ?? []).map((exchange) => ({ exchange })),
              error: null,
            }),
        };
      }
      throw new Error(`Unexpected table access: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { supabase, rpcCalls, fromCalls };
}

async function withFmpResponse(
  payload: unknown,
  callback: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Length": "100" },
        }),
      );
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

Deno.test(
  "empty response is recorded, rejected, and never writes a sentinel",
  async () => {
    await withFmpResponse([], async () => {
      const { supabase, rpcCalls, fromCalls } = mockClient({});
      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result.success, false);
      assertEquals(result.dataSizeBytes, 100);
      assertEquals(fromCalls, []);
      assertEquals(rpcCalls.map((call) => call.name), [
        "sync_data_quality_issues",
      ]);
      const findings = rpcCalls[0].args.p_findings as Array<
        Record<string, unknown>
      >;
      assertEquals(findings[0].check_code, "empty_exchange_variants_response");
      assertEquals(findings[0].severity, "critical");
      assertEquals(findings[0].source_reference, "empty-response");
      assertExists(
        (findings[0].evidence as Record<string, unknown>).endpointUrl,
      );
    });
  },
);

Deno.test(
  "validated complete response is atomically replaced and clears findings",
  async () => {
    await withFmpResponse([baseVariant, xetraVariant], async () => {
      const { supabase, rpcCalls } = mockClient({
        profile: { exchange: "NASDAQ" },
        exchanges: ["NASDAQ", "XETRA"],
        existing: [
          {
            symbol_variant: "TEST",
            exchange_short_name: "NASDAQ",
            is_actively_trading: true,
          },
          {
            symbol_variant: "TEST.DE",
            exchange_short_name: "XETRA",
            is_actively_trading: true,
          },
        ],
      });
      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result, { success: true, dataSizeBytes: 100 });
      assertEquals(rpcCalls.map((call) => call.name), [
        "replace_exchange_variants_v2",
        "sync_data_quality_issues",
      ]);
      assertEquals(
        (rpcCalls[0].args.p_records as unknown[]).length,
        2,
      );
      assertEquals(rpcCalls[1].args.p_findings, []);
    });
  },
);

Deno.test(
  "missing previously active variant is recorded and preserves stored data",
  async () => {
    await withFmpResponse([baseVariant], async () => {
      const { supabase, rpcCalls } = mockClient({
        profile: { exchange: "NASDAQ" },
        exchanges: ["NASDAQ", "XETRA"],
        existing: [
          {
            symbol_variant: "TEST",
            exchange_short_name: "NASDAQ",
            is_actively_trading: true,
          },
          {
            symbol_variant: "TEST.DE",
            exchange_short_name: "XETRA",
            is_actively_trading: true,
          },
        ],
      });
      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result.success, false);
      assertEquals(rpcCalls.map((call) => call.name), [
        "sync_data_quality_issues",
      ]);
      const findings = rpcCalls[0].args.p_findings as Array<
        Record<string, unknown>
      >;
      assertEquals(
        findings.some((finding) =>
          finding.check_code === "exchange_variant_set_regression"
        ),
        true,
      );
    });
  },
);

Deno.test(
  "quality failure never replaces data when issue persistence fails",
  async () => {
    await withFmpResponse([baseVariant], async () => {
      const { supabase, rpcCalls } = mockClient({
        profile: { exchange: "NASDAQ" },
        exchanges: ["NASDAQ", "XETRA"],
        existing: [
          {
            symbol_variant: "TEST.DE",
            exchange_short_name: "XETRA",
            is_actively_trading: true,
          },
        ],
        syncError: "persistence unavailable",
      });
      const result = await fetchExchangeVariantsLogic(job, supabase);

      assertEquals(result.success, false);
      assertEquals(result.dataSizeBytes, 100);
      assertEquals(result.error?.includes("Failed to synchronize"), true);
      assertEquals(rpcCalls.map((call) => call.name), [
        "sync_data_quality_issues",
      ]);
    });
  },
);

Deno.test("validator rejects incomplete and unknown exchange data", () => {
  const findings = validateExchangeVariantsResponse({
    symbol: "TEST",
    response: [{
      symbol: "OTHER",
      exchangeShortName: "UNKNOWN",
    }],
    profileExchange: "NASDAQ",
    profileExists: true,
    knownExchanges: ["NASDAQ"],
    existingVariants: [],
  });

  assertEquals(
    findings.map((finding) => finding.checkCode).sort(),
    ["exchange_variants_base_listing", "exchange_variants_exchange_code"],
  );
});

Deno.test("validator flags duplicate records and a base-exchange mismatch", () => {
  const findings = validateExchangeVariantsResponse({
    symbol: "TEST",
    response: [baseVariant, xetraVariant, xetraVariant],
    profileExchange: "NYSE",
    profileExists: true,
    knownExchanges: ["NASDAQ", "NYSE", "XETRA"],
    existingVariants: [],
  });

  assertEquals(
    findings.map((finding) => finding.sourceReference).sort(),
    ["duplicate-records", "profile-exchange-mismatch"],
  );
});
