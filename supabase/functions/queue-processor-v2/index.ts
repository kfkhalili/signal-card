/**
 * Queue Processor Edge Function (Monofunction Architecture)
 *
 * CRITICAL: This is a "monofunction" that imports all fetch-fmp-* logic directly.
 * This prevents connection pool exhaustion from FaaS-to-FaaS invocations.
 *
 * Architecture:
 * - Processes ONE batch and exits (stateless)
 * - Loop is in SQL invoker (invoke_processor_loop_v2), not here
 * - Uses switch statement to route to correct handler based on data_type
 * - All worker functions imported from /lib/ directory
 * - OPTIMIZED: Smaller batch size (10), parallel processing, overall timeout
 */

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import worker functions from /lib/ directory (monofunction architecture)
import { fetchProfileLogic } from '../lib/fetch-fmp-profile.ts';
import { fetchQuoteLogic } from '../lib/fetch-fmp-quote.ts';
import { fetchFinancialStatementsLogic } from '../lib/fetch-fmp-financial-statements.ts';
// TODO: Import other worker functions as they are migrated
// ... etc for all data types

interface QueueJob {
  id: string;
  symbol: string;
  data_type: string;
  status: string;
  priority: number;
  retry_count: number;
  max_retries: number;
  created_at: string;
  estimated_data_size_bytes: number;
  job_metadata: Record<string, unknown>;
}

// OPTIMIZATION: Reduced batch size for faster processing
const BATCH_SIZE = 10; // Reduced from 50 to 10 for faster completion
const MAX_CONCURRENT_JOBS = 5; // Process up to 5 jobs in parallel
const FUNCTION_TIMEOUT_MS = 50000; // 50 seconds overall timeout

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // OPTIMIZATION: Overall function timeout
  const functionStartTime = Date.now();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Function timeout after ${FUNCTION_TIMEOUT_MS}ms`));
    }, FUNCTION_TIMEOUT_MS);
  });

  try {
    // CRITICAL: Validate environment variables before proceeding
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[queue-processor-v2] Missing required environment variables');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // OPTIMIZATION: Race between function timeout and actual processing
    const processingPromise = (async () => {
      // Get batch of jobs from queue (reduced batch size)
      const { data: jobs, error: batchError } = await supabase.rpc('get_queue_batch_v2', {
        p_batch_size: BATCH_SIZE, // Reduced from 50 to 10
        p_max_priority: 1000,
      });

      if (batchError) {
        console.error('[queue-processor-v2] Failed to get batch:', batchError);
        return new Response(
          JSON.stringify({ error: 'Failed to get batch', details: batchError.message }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!jobs || jobs.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No jobs to process', processed: 0 }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      // OPTIMIZATION: Process jobs in parallel with concurrency limit
      const processedJobs: Array<{ id: string; success: boolean; error?: string }> = [];

      // Process jobs in batches with concurrency limit
      for (let i = 0; i < jobs.length; i += MAX_CONCURRENT_JOBS) {
        const batch = jobs.slice(i, i + MAX_CONCURRENT_JOBS);
        const batchPromises = batch.map(async (job) => {
          try {
            // CRITICAL: Route to correct handler based on data_type
            // This replaces FaaS-to-FaaS invocations with direct function calls
            const result = await processJob(job, supabase);

            if (result.success) {
              // Mark job as completed
              const { error: completeError } = await supabase.rpc('complete_queue_job_v2', {
                p_job_id: job.id,
                p_data_size_bytes: result.dataSizeBytes,
              });

              if (completeError) {
                console.error(`[queue-processor-v2] Failed to complete job ${job.id}:`, completeError);
                processedJobs.push({ id: job.id, success: false, error: completeError.message });
              } else {
                processedJobs.push({ id: job.id, success: true });
              }
            } else {
              // Mark job as failed (with retry logic)
              const { error: failError } = await supabase.rpc('fail_queue_job_v2', {
                p_job_id: job.id,
                p_error_message: result.error || 'Unknown error',
              });

              if (failError) {
                console.error(`[queue-processor-v2] Failed to fail job ${job.id}:`, failError);
              }

              processedJobs.push({ id: job.id, success: false, error: result.error });
            }
          } catch (error) {
            // CRITICAL: Deadlock-aware error handling
            if (error instanceof Error && (
              error.message?.includes('deadlock detected') ||
              error.message?.includes('40P01')
            )) {
              console.warn(`[queue-processor-v2] Deadlock detected for job ${job.id}, resetting immediately`);

              // Reset job immediately (doesn't increment retry_count)
              const { error: resetError } = await supabase.rpc('reset_job_immediate_v2', {
                p_job_id: job.id,
              });

              if (resetError) {
                console.error(`[queue-processor-v2] Failed to reset job ${job.id}:`, resetError);
              }

              processedJobs.push({ id: job.id, success: false, error: 'Deadlock - reset for retry' });
              return; // Skip fail_queue_job - let recover_stuck_jobs handle it
            }

            // Other errors - mark as failed
            const { error: failError } = await supabase.rpc('fail_queue_job_v2', {
              p_job_id: job.id,
              p_error_message: error instanceof Error ? error.message : 'Unknown error',
            });

            if (failError) {
              console.error(`[queue-processor-v2] Failed to fail job ${job.id}:`, failError);
            }

            processedJobs.push({ id: job.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        });

        // Wait for this batch to complete before starting the next
        await Promise.all(batchPromises);
      }

      const successCount = processedJobs.filter(j => j.success).length;
      const failureCount = processedJobs.length - successCount;
      const duration = Date.now() - functionStartTime;

      return new Response(
        JSON.stringify({
          message: 'Batch processed',
          processed: processedJobs.length,
          success: successCount,
          failed: failureCount,
          duration_ms: duration,
          jobs: processedJobs,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    })();

    // Race between timeout and processing
    return await Promise.race([processingPromise, timeoutPromise]);
  } catch (error) {
    const duration = Date.now() - functionStartTime;
    console.error('[queue-processor-v2] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Process a single job
 * CRITICAL: This is where we route to the correct handler based on data_type
 * Uses switch statement to route to library functions (monofunction architecture)
 */
async function processJob(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<{ success: boolean; dataSizeBytes: number; error?: string }> {
  // CRITICAL: Route to correct handler based on data_type
  // This replaces FaaS-to-FaaS invocations with direct function calls
  // Prevents connection pool exhaustion (50 concurrent invocations = 50 connections)
  switch (job.data_type) {
    case 'profile':
      return await fetchProfileLogic(job, supabase);
    case 'quote':
      return await fetchQuoteLogic(job, supabase);
    case 'financial-statements':
      return await fetchFinancialStatementsLogic(job, supabase);
    // TODO: Add other data types as they are migrated to /lib/
    // ... etc
    default:
      return {
        success: false,
        dataSizeBytes: 0,
        error: `Unknown or unsupported data type: ${job.data_type}. This data type has not been migrated to the queue system yet.`,
      };
  }
}
