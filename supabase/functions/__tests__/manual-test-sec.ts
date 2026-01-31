// functions/manual-test-sec.ts
// Run with Deno: deno run --allow-env --allow-net ... AAPL
// Run with Jest: npm test -- manual-test-sec (uses mocks, no env required)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchSecOutstandingSharesLogic } from "../lib/fetch-sec-outstanding-shares.ts";
import type { QueueJob } from "../lib/types.ts";

const isJest =
  typeof process !== "undefined" && typeof process.env?.JEST_WORKER_ID === "string";

if (isJest) {
  // Jest path: run unit test with mocked client (no real env/network)
  describe("fetchSecOutstandingSharesLogic (manual-test-sec)", () => {
    it("returns Missing CIK when profile has no cik", async () => {
      const mockFrom = (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === "sec_filings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
            upsert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      };
      const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
      const job: QueueJob = {
        id: "jest-test",
        symbol: "AAPL",
        data_type: "sec-outstanding-shares",
        status: "processing",
        priority: 1,
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        estimated_data_size_bytes: 0,
        job_metadata: {},
      };
      const result = await fetchSecOutstandingSharesLogic(job, mockSupabase);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing CIK");
    });
  });
} else {
  // Deno script path: real args and env
  const symbol = Deno.args[0];
  if (!symbol) {
    console.error("❌ Please provide a symbol argument. Example: deno run ... AAPL");
    Deno.exit(1);
  }

  const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
    Deno.exit(1);
  }

  const realSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const hybridSupabase = {
    from: (table: string) => {
      if (table === "profiles") return realSupabase.from(table);
      if (table === "sec_filings") {
        return {
          upsert: async (payload: unknown) => {
            console.log("\n[HybridClient] 🛑 Intercepted Write to DB (Mocked):");
            console.log(JSON.stringify(payload, null, 2));
            console.log("----------------------------\n");
            return { error: null };
          },
        };
      }
      return realSupabase.from(table);
    },
  } as unknown as SupabaseClient;

  const testJob: QueueJob = {
    id: `manual-test-${symbol}`,
    symbol: symbol.toUpperCase(),
    data_type: "sec-outstanding-shares",
    status: "processing",
    priority: 1,
    retry_count: 0,
    max_retries: 3,
    created_at: new Date().toISOString(),
    estimated_data_size_bytes: 0,
    job_metadata: {},
  };

  console.log(`Starting hybrid SEC fetch test for ${testJob.symbol}...`);
  console.log(`Using DB: ${SUPABASE_URL}`);

  try {
    const result = await fetchSecOutstandingSharesLogic(testJob, hybridSupabase);
    if (result.success) {
      console.log("✅ SUCCESS!");
      console.log(`Message: ${result.message}`);
      console.log(`Data Size: ${result.dataSizeBytes} bytes`);
    } else {
      console.error("❌ FAILED");
      console.error(`Error: ${result.error}`);
    }
  } catch (err) {
    console.error("❌ UNHANDLED EXCEPTION:", err);
  }
}
