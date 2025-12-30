// functions/manual-test-sec.ts
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchSecOutstandingSharesLogic } from '../lib/fetch-sec-outstanding-shares.ts';
import type { QueueJob } from '../lib/types.ts';

// 1. Setup - Get Args and Env Vars
const symbol = Deno.args[0];
if (!symbol) {
  console.error("❌ Please provide a symbol argument. Example: deno run ... AAPL");
  Deno.exit(1);
}

const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  Deno.exit(1);
}

// 2. Initialize Real Client
const realSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 3. Create Hybrid Client (Real Read / Mock Write)
// This proxies requests: 'profiles' goes to real DB, 'sec_filings' gets caught and logged.
const hybridSupabase = {
  from: (table: string) => {
    // READ from Real Prod DB
    if (table === 'profiles') {
      return realSupabase.from(table);
    }

    // MOCK WRITE (Don't pollute prod with test runs)
    if (table === 'sec_filings') {
      return {
        upsert: async (payload: unknown) => {
          console.log('\n[HybridClient] 🛑 Intercepted Write to DB (Mocked):');
          console.log(JSON.stringify(payload, null, 2));
          console.log('----------------------------\n');
          return { error: null };
        },
      };
    }

    // Fallback for anything else
    return realSupabase.from(table);
  },
} as unknown as SupabaseClient;

// 4. Define Job
const testJob: QueueJob = {
  id: `manual-test-${symbol}`,
  symbol: symbol.toUpperCase(),
  data_type: 'sec-outstanding-shares',
  status: 'processing',
  priority: 1,
  retry_count: 0,
  max_retries: 3,
  created_at: new Date().toISOString(),
  estimated_data_size_bytes: 0,
  job_metadata: {},
};

// 5. Run Test
console.log(`Starting hybrid SEC fetch test for ${testJob.symbol}...`);
console.log(`Using DB: ${SUPABASE_URL}`);

try {
  // Pass the hybrid client instead of the mock
  const result = await fetchSecOutstandingSharesLogic(testJob, hybridSupabase);
  
  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`Message: ${result.message}`);
    console.log(`Data Size: ${result.dataSizeBytes} bytes`);
  } else {
    console.error('❌ FAILED');
    console.error(`Error: ${result.error}`);
  }
} catch (err) {
  console.error('❌ UNHANDLED EXCEPTION:', err);
}