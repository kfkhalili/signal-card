import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recordFinancialSourceRegression,
  resolveFinancialSourceRegression,
} from "../lib/financial-source-regression.ts";
import type { QueueJob } from "../lib/types.ts";

const job: QueueJob = {
  id: "00000000-0000-4000-8000-000000000001",
  symbol: "NVA",
  data_type: "financial-statements",
  status: "processing",
  priority: -1,
  retry_count: 0,
  max_retries: 3,
  created_at: "2026-07-31T11:00:00Z",
  estimated_data_size_bytes: 500000,
  job_metadata: {},
};

Deno.test("records a financial source regression with stable issue identity", async () => {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];
  const supabase = {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({ name, args });
      return Promise.resolve({ error: null });
    },
  } as unknown as SupabaseClient;

  const message = await recordFinancialSourceRegression(
    supabase,
    job,
    "2025-06-30 00:00:00",
    "2025-09-19T16:00:54+00:00",
    600000,
  );

  assertStringIncludes(message, "Stale source timestamp");
  assertStringIncludes(message, "Stored data was preserved");
  assertEquals(calls, [{
    name: "record_data_quality_issue_v2",
    args: {
      p_symbol: "NVA",
      p_provider: "fmp",
      p_endpoint: "financial-statements",
      p_check_code: "source_timestamp_regression",
      p_severity: "warning",
      p_message:
        "FMP returned financial statements older than the newest stored filing; the stored data was preserved.",
      p_evidence: {
        incoming_max_accepted_date: "2025-06-30 00:00:00",
        stored_max_accepted_date: "2025-09-19T16:00:54+00:00",
        response_size_bytes: 600000,
        queue_job_id: "00000000-0000-4000-8000-000000000001",
        retry_count: 0,
        max_retries: 3,
      },
      p_field_name: "accepted_date",
      p_source_date: null,
      p_source_period: null,
      p_source_reference: "accepted-date-regression",
    },
  }]);
});

Deno.test("does not discard a regression when issue persistence fails", async () => {
  const supabase = {
    rpc: () =>
      Promise.resolve({
        error: { message: "database unavailable" },
      }),
  } as unknown as SupabaseClient;

  await assertRejects(
    () =>
      recordFinancialSourceRegression(
        supabase,
        job,
        "2025-06-30 00:00:00",
        "2025-09-19T16:00:54+00:00",
        600000,
      ),
    Error,
    "Failed to record financial source regression",
  );
});

Deno.test("resolves only the stable source-regression fingerprint", async () => {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];
  const supabase = {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({ name, args });
      return Promise.resolve({ error: null });
    },
  } as unknown as SupabaseClient;

  assertEquals(
    await resolveFinancialSourceRegression(supabase, "NVA"),
    true,
  );
  assertEquals(calls, [{
    name: "resolve_data_quality_issue_v2",
    args: {
      p_symbol: "NVA",
      p_provider: "fmp",
      p_endpoint: "financial-statements",
      p_check_code: "source_timestamp_regression",
      p_field_name: "accepted_date",
      p_source_date: null,
      p_source_period: null,
      p_source_reference: "accepted-date-regression",
    },
  }]);
});

Deno.test("financial handler records regressions without advancing freshness", async () => {
  const originalFetch = globalThis.fetch;
  const rpcCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];
  const baseStatement = {
    date: "2025-06-30",
    symbol: "NVA",
    reportedCurrency: "USD",
    cik: "0000000001",
    filingDate: "2025-06-30",
    acceptedDate: "2025-06-30 00:00:00",
    fiscalYear: "2025",
    period: "FY",
  };

  Deno.env.set("FMP_API_KEY", "source-regression-test-key");
  const { fetchFinancialStatementsLogic } = await import(
    "../lib/fetch-fmp-financial-statements.ts?source-regression-test"
  );

  try {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify([baseStatement]), {
          status: 200,
          headers: { "Content-Length": "200000" },
        }),
      );

    const supabase = {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => {
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
            maybeSingle: () =>
              Promise.resolve({
                data: { accepted_date: "2025-09-19T16:00:54+00:00" },
                error: null,
              }),
            upsert: () => {
              throw new Error("regressed data must not be upserted");
            },
          };
          return chain;
        }

        throw new Error(`Unexpected table access: ${table}`);
      },
    } as unknown as SupabaseClient;

    const result = await fetchFinancialStatementsLogic(job, supabase);

    assertEquals(result.success, false);
    assertEquals(result.dataSizeBytes, 600000);
    assertStringIncludes(result.error ?? "", "Stale source timestamp");
    assertEquals(
      rpcCalls.map((call) => call.name),
      ["record_data_quality_issue_v2"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
