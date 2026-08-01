import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueJob } from "../lib/types.ts";

Deno.env.set("FMP_API_KEY", "data-quality-wiring-test-key");

const { fetchFinancialStatementsLogic } = await import(
  "../lib/fetch-fmp-financial-statements.ts?data-quality-wiring-test"
);
const { fetchQuoteLogic } = await import(
  "../lib/fetch-fmp-quote.ts?data-quality-wiring-test"
);

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

function queueJob(dataType: string): QueueJob {
  return {
    id: `job-${dataType}`,
    symbol: "TEST",
    data_type: dataType,
    status: "processing",
    priority: -1,
    retry_count: 0,
    max_retries: 3,
    created_at: "2026-08-01T00:00:00Z",
    estimated_data_size_bytes: 1,
    job_metadata: {},
  };
}

Deno.test(
  "financial statement queue handler synchronizes deterministic findings",
  async () => {
    const originalFetch = globalThis.fetch;
    const rpcCalls: RpcCall[] = [];
    const baseStatement = {
      date: "2025-12-31",
      symbol: "TEST",
      reportedCurrency: "USD",
      cik: "0000000001",
      filingDate: "2026-02-01",
      acceptedDate: "2026-02-01T12:00:00Z",
      fiscalYear: "2025",
      period: "FY",
    };
    const responses = [
      { ...baseStatement, revenue: 1_000 },
      {
        ...baseStatement,
        totalAssets: 1_000,
        totalLiabilities: 600,
        totalEquity: 400,
      },
      { ...baseStatement, operatingCashFlow: 100 },
    ];

    try {
      globalThis.fetch = () => {
        const payload = responses.shift();
        if (!payload) throw new Error("Unexpected fourth FMP request");
        return Promise.resolve(
          new Response(JSON.stringify([payload]), {
            status: 200,
            headers: { "Content-Length": "100" },
          }),
        );
      };

      const supabase = {
        rpc: (name: string, args: Record<string, unknown>) => {
          rpcCalls.push({ name, args });
          return Promise.resolve({ error: null });
        },
        from: (table: string) => {
          if (table === "data_type_registry_v2") {
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
          }

          if (table === "financial_statements") {
            const chain = {
              select: () => chain,
              eq: () => chain,
              not: () => chain,
              order: () => chain,
              limit: () => chain,
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              upsert: () => Promise.resolve({ error: null }),
            };
            return chain;
          }

          throw new Error(`Unexpected table access: ${table}`);
        },
      } as unknown as SupabaseClient;

      const result = await fetchFinancialStatementsLogic(
        queueJob("financial-statements"),
        supabase,
      );

      assertEquals(result.success, true);
      assertEquals(result.dataSizeBytes, 300);
      assertEquals(responses, []);
      assertEquals(
        rpcCalls.map((call) => call.name),
        [
          "sync_data_quality_issues",
          "record_data_fetch_freshness_v2",
          "resolve_data_quality_issue_v2",
        ],
      );
      assertEquals(rpcCalls[0].args, {
        p_symbol: "TEST",
        p_provider: "fmp",
        p_endpoint: "financial-statements",
        p_findings: [],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "quote queue handler persists market-cap reconciliation findings",
  async () => {
    const originalFetch = globalThis.fetch;
    const rpcCalls: RpcCall[] = [];

    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify([{
              symbol: "TEST",
              price: 10,
              timestamp: 1_700_000_000,
              marketCap: 1_500,
              sharesOutstanding: 100,
            }]),
            {
              status: 200,
              headers: { "Content-Length": "200" },
            },
          ),
        );

      const supabase = {
        rpc: (name: string, args: Record<string, unknown>) => {
          rpcCalls.push({ name, args });
          return Promise.resolve({ error: null });
        },
        from: (table: string) => {
          if (table === "data_type_registry_v2") {
            const chain = {
              select: () => chain,
              eq: () => chain,
              single: () =>
                Promise.resolve({
                  data: { source_timestamp_column: "api_timestamp" },
                  error: null,
                }),
            };
            return chain;
          }

          if (table === "live_quote_indicators") {
            const chain = {
              select: () => chain,
              eq: () => chain,
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              upsert: () => Promise.resolve({ error: null }),
            };
            return chain;
          }

          throw new Error(`Unexpected table access: ${table}`);
        },
      } as unknown as SupabaseClient;

      const result = await fetchQuoteLogic(queueJob("quote"), supabase);

      assertEquals(result.success, true);
      assertEquals(result.dataSizeBytes, 200);
      assertEquals(rpcCalls.map((call) => call.name), [
        "sync_data_quality_issues",
      ]);

      const findings = rpcCalls[0].args.p_findings as Array<
        Record<string, unknown>
      >;
      assertEquals(findings.length, 1);
      assertEquals(findings[0].check_code, "market_cap_reconciliation");
      assertEquals(findings[0].severity, "critical");
      assertExists(findings[0].evidence);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
