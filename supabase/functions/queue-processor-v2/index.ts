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
import { fetchRatiosTtmLogic } from '../lib/fetch-fmp-ratios-ttm.ts';
import { fetchDividendHistoryLogic } from '../lib/fetch-fmp-dividend-history.ts';
import { fetchRevenueProductSegmentationLogic } from '../lib/fetch-fmp-revenue-product-segmentation.ts';
import { fetchGradesHistoricalLogic } from '../lib/fetch-fmp-grades-historical.ts';
import { fetchExchangeVariantsLogic } from '../lib/fetch-fmp-exchange-variants.ts';
// All card data types have been migrated to the queue system

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

  // Configuration: Process at rate of 95 jobs per minute (~1.58 jobs per second)
  // CRITICAL: Financial-statements jobs make 3 API calls each, so 95 jobs = 285 API calls per minute
  // (assuming all jobs are financial-statements, which are prioritized first)
  // This targets ~290 API calls/minute with a mix of job types
  // CRITICAL: Retries count toward the 95 jobs/minute limit - each retry is a job that makes API calls
  const BATCH_SIZE = 48; // Process up to 48 jobs per batch (2 iterations × 48 = 96, close to 95 jobs/minute limit)
  const TARGET_JOBS_PER_MINUTE = 95; // Target processing rate (includes retries)
  const TARGET_JOBS_PER_SECOND = TARGET_JOBS_PER_MINUTE / 60; // ~1.58 jobs per second
  const MIN_DELAY_BETWEEN_JOBS_MS = 1000 / TARGET_JOBS_PER_SECOND; // ~632ms delay between job starts
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

      // CRITICAL: Global rate limit check - coordinate across all function invocations
      // Check if processing this batch would exceed the 95 jobs/minute limit
      // CRITICAL: UI jobs (priority 1000) bypass rate limiting - they must be processed immediately
      const hasUIJobs = jobs.some((j: QueueJob) => j.priority >= 1000);

      if (!hasUIJobs) {
        // Only check rate limit for non-UI jobs
        const { data: canProcess, error: rateLimitError } = await supabase.rpc('check_and_increment_rate_limit', {
          p_jobs_to_process: jobs.length,
        });

        if (rateLimitError) {
          console.error('[queue-processor-v2] Rate limit check failed:', rateLimitError);
          // Continue anyway - don't block processing if rate limit check fails
        } else if (canProcess === false) {
          // Would exceed rate limit - return early without processing
          console.warn(`[queue-processor-v2] Rate limit exceeded. Would process ${jobs.length} jobs but limit is 95/minute.`);
          return new Response(
            JSON.stringify({
              message: 'Rate limit exceeded',
              processed: 0,
              skipped: jobs.length
            }),
            {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          );
        }
      } else {
        // UI jobs present - process them immediately, but still track for rate limiting
        const uiJobCount = jobs.filter((j: QueueJob) => j.priority >= 1000).length;
        const nonUIJobCount = jobs.length - uiJobCount;

        // Only check rate limit for non-UI jobs
        if (nonUIJobCount > 0) {
          const { data: canProcess, error: rateLimitError } = await supabase.rpc('check_and_increment_rate_limit', {
            p_jobs_to_process: nonUIJobCount,
          });

          if (rateLimitError) {
            console.error('[queue-processor-v2] Rate limit check failed:', rateLimitError);
          } else if (canProcess === false) {
            // Filter out non-UI jobs if rate limit would be exceeded
            // But always process UI jobs
            console.warn(`[queue-processor-v2] Rate limit exceeded for non-UI jobs (limit: 95/minute). Processing ${uiJobCount} UI jobs, skipping ${nonUIJobCount} non-UI jobs.`);
            const filteredJobs = jobs.filter((j: QueueJob) => j.priority >= 1000);
            // Replace jobs array with only UI jobs
            jobs.length = 0;
            jobs.push(...filteredJobs);
          }
        }
      }

      // Rate-limited processing: Process at 75 jobs per minute (~1.25 jobs per second)
      // CRITICAL: Financial-statements jobs are prioritized and make 3 API calls each
      // This results in 225 API calls per minute (75 jobs × 3 calls = 225 calls)
      // CRITICAL: Retries count toward the 75 jobs/minute limit - each retry is a job that makes API calls
      const processedJobs: Array<{ id: string; success: boolean; error?: string }> = [];
      const processingStartTime = Date.now();
      let jobsProcessed = 0;

      // Process jobs sequentially with rate limiting to ensure retries are counted
      // CRITICAL: Process one job at a time to prevent bursts that exceed rate limits
      for (const job of jobs) {
        // Rate limiting: Ensure we don't exceed 75 jobs per minute
        // Calculate how many jobs we should have processed by now
        const elapsedSeconds = (Date.now() - processingStartTime) / 1000;
        const expectedJobsProcessed = Math.floor(elapsedSeconds * TARGET_JOBS_PER_SECOND);

        // If we're ahead of schedule, add a delay before processing the next job
        // This ensures retries are also subject to the rate limit
        if (jobsProcessed > expectedJobsProcessed) {
          const delayMs = (jobsProcessed - expectedJobsProcessed) * MIN_DELAY_BETWEEN_JOBS_MS;
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

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
              jobsProcessed++; // Count successful jobs toward rate limit
            }
          } else {
            // Mark job as failed (with retry logic)
            // CRITICAL: Failed jobs that will be retried still count toward the rate limit
            // because the retry will make API calls when it's processed again
            const { error: failError } = await supabase.rpc('fail_queue_job_v2', {
              p_job_id: job.id,
              p_error_message: result.error || 'Unknown error',
            });

            if (failError) {
              console.error(`[queue-processor-v2] Failed to fail job ${job.id}:`, failError);
            }

            processedJobs.push({ id: job.id, success: false, error: result.error });
            jobsProcessed++; // Count failed jobs toward rate limit (retries will be counted when processed)
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
            jobsProcessed++; // Count deadlock resets toward rate limit
          } else {
            // Other errors - mark as failed
            const { error: failError } = await supabase.rpc('fail_queue_job_v2', {
              p_job_id: job.id,
              p_error_message: error instanceof Error ? error.message : 'Unknown error',
            });

            if (failError) {
              console.error(`[queue-processor-v2] Failed to fail job ${job.id}:`, failError);
            }

            processedJobs.push({ id: job.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            jobsProcessed++; // Count errors toward rate limit
          }
        }
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
    case 'ratios-ttm':
      return await fetchRatiosTtmLogic(job, supabase);
    case 'dividend-history':
      return await fetchDividendHistoryLogic(job, supabase);
    case 'revenue-product-segmentation':
      return await fetchRevenueProductSegmentationLogic(job, supabase);
    case 'grades-historical':
      return await fetchGradesHistoricalLogic(job, supabase);
    case 'exchange-variants':
      return await fetchExchangeVariantsLogic(job, supabase);
    default:
      return {
        success: false,
        dataSizeBytes: 0,
        error: `Unknown or unsupported data type: ${job.data_type}. This data type is not registered in the queue system.`,
      };
  }
}
