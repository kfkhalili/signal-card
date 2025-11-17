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
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TODO: Import worker functions from /lib/ directory
// import { fetchProfileLogic } from '../lib/fetch-fmp-profile';
// import { fetchQuoteLogic } from '../lib/fetch-fmp-quote';
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
  job_metadata: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get batch of jobs from queue
    const { data: jobs, error: batchError } = await supabase.rpc('get_queue_batch_v2', {
      p_batch_size: 50,
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

    // Process jobs concurrently (with limit)
    const processedJobs: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const job of jobs as QueueJob[]) {
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
          continue; // Skip fail_queue_job - let recover_stuck_jobs handle it
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
    }

    const successCount = processedJobs.filter(j => j.success).length;
    const failureCount = processedJobs.length - successCount;

    return new Response(
      JSON.stringify({
        message: 'Batch processed',
        processed: processedJobs.length,
        success: successCount,
        failed: failureCount,
        jobs: processedJobs,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[queue-processor-v2] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
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
 * TODO: Import actual worker functions from /lib/ and use switch statement
 */
async function processJob(
  job: QueueJob,
  supabase: any
): Promise<{ success: boolean; dataSizeBytes?: number; error?: string }> {
  // TODO: Replace with actual switch statement routing
  // switch (job.data_type) {
  //   case 'quote':
  //     return await fetchQuoteLogic(job, supabase);
  //   case 'profile':
  //     return await fetchProfileLogic(job, supabase);
  //   ...
  //   default:
  //     throw new Error(`Unknown data type: ${job.data_type}`);
  // }

  // Placeholder implementation
  console.log(`[queue-processor-v2] Processing job ${job.id} for ${job.symbol} (${job.data_type})`);

  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    success: true,
    dataSizeBytes: job.estimated_data_size_bytes || 0,
  };
}

