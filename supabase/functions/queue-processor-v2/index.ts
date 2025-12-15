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
import { fetchInsiderTradingStatisticsLogic } from '../lib/fetch-fmp-insider-trading-statistics.ts';
import { fetchInsiderTransactionsLogic } from '../lib/fetch-fmp-insider-transactions.ts';
import { fetchDcfLogic } from '../lib/fetch-fmp-dcf.ts';
import { fetchMarketRiskPremiumLogic } from '../lib/fetch-fmp-market-risk-premium.ts';
import { fetchTreasuryRatesLogic } from '../lib/fetch-fmp-treasury-rates.ts';
import { fetchPriceTargetConsensusLogic } from '../lib/fetch-fmp-price-target-consensus.ts';
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

  // Configuration: Process at rate of 250 jobs per minute (~4.17 jobs per second)
  // CRITICAL: Financial-statements jobs (3 API calls each) are done, remaining jobs are 1 API call each
  // So 250 jobs/minute = 250 API calls/minute (safely under 300 limit)
  // CRITICAL: Retries count toward the 250 jobs/minute limit - each retry is a job that makes API calls
  const BATCH_SIZE = 125; // Process up to 125 jobs per batch (2 iterations × 125 = 250, matches 250 jobs/minute limit)
  const TARGET_JOBS_PER_MINUTE = 250; // Target processing rate (includes retries)
  const TARGET_JOBS_PER_SECOND = TARGET_JOBS_PER_MINUTE / 60; // ~4.17 jobs per second
  const MIN_DELAY_BETWEEN_JOBS_MS = 1000 / TARGET_JOBS_PER_SECOND; // ~240ms delay between job starts
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

      // CRITICAL: Job rate limiting removed - API call rate limiting is now the primary constraint
      // API call rate limiting (300 calls/minute) is more accurate than job rate limiting
      // Each job is checked individually for API call limits before processing
      // This allows us to maximize throughput while respecting the real constraint (API calls)

      // CRITICAL: Circuit breaker - check if we should stop processing entirely
      // If we're at or near the API call limit (295+), stop processing this batch
      // Wait for the minute to roll over before resuming (prevents exceeding 300 limit)
      const { data: shouldStop, error: circuitBreakerError } = await supabase.rpc('should_stop_processing_api_calls', {
        p_api_calls_to_reserve: 1, // Check with minimum (1 call)
        p_max_api_calls_per_minute: 300,
        p_safety_buffer: 5, // Stop 5 calls before the limit to prevent overruns
      });

      if (circuitBreakerError) {
        console.error('[queue-processor-v2] Circuit breaker check failed:', circuitBreakerError);
        // Continue anyway - don't block if check fails
      } else if (shouldStop === true) {
        // Circuit breaker triggered - stop processing this batch entirely
        console.warn(`[queue-processor-v2] Circuit breaker: API call limit reached (295+). Stopping processing for this batch. Will resume when minute rolls over.`);
        return new Response(
          JSON.stringify({
            message: 'Circuit breaker: API call limit reached',
            processed: 0,
            skipped: jobs.length,
            reason: 'API call limit reached (295+) - waiting for minute rollover to prevent exceeding 300 limit'
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      const processedJobs: { id: string; success: boolean; error?: string }[] = [];
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

        // CRITICAL: Check API call limit before processing each job
        // Look up how many API calls this job type makes
        const { data: registryData, error: registryError } = await supabase
          .from('data_type_registry_v2')
          .select('api_calls_per_job')
          .eq('data_type', job.data_type)
          .single();

        if (registryError || !registryData) {
          console.warn(`[queue-processor-v2] Failed to get api_calls_per_job for ${job.data_type}, defaulting to 1. Error:`, registryError);
        }

        const apiCallsForJob = registryData?.api_calls_per_job ?? 1;

        // CRITICAL: Atomically reserve API calls BEFORE making them
        // This prevents multiple processors from all checking at once and exceeding the limit
        // The reservation is atomic (check + increment in one operation with row lock)
        let reservationSuccessful: boolean | null = null;
        let reservationError: Error | null = null;

        try {
          const result = await supabase.rpc('reserve_api_calls', {
            p_api_calls_to_reserve: apiCallsForJob,
          });

          reservationSuccessful = result.data;
          reservationError = result.error;
        } catch (error) {
          reservationError = error instanceof Error ? error : new Error(String(error));
          console.error(`[queue-processor-v2] Exception during API call reservation for job ${job.id}:`, reservationError);
        }

        if (reservationError) {
          console.error(`[queue-processor-v2] API call reservation failed for job ${job.id}:`, reservationError);
          // Skip this job - don't process without reservation to prevent exceeding limits
          processedJobs.push({ id: job.id, success: false, error: `Reservation failed: ${reservationError.message}` });
          continue;
        } else if (reservationSuccessful === false || reservationSuccessful === null) {
          // Would exceed API call limit or reservation returned null - skip this job, leave it pending
          console.warn(`[queue-processor-v2] Skipping job ${job.id} (${job.data_type}): would exceed API call limit (needs ${apiCallsForJob} calls)`);
          processedJobs.push({ id: job.id, success: false, error: `Skipped: would exceed API call limit (needs ${apiCallsForJob} calls)` });
          continue; // Skip to next job in queue
        }

        // API call reservation successful - proceed with processing
        try {
          // CRITICAL: Route to correct handler based on data_type
          // This replaces FaaS-to-FaaS invocations with direct function calls
          const result = await processJob(job, supabase);

          if (result.success) {
            // Mark job as completed
            // CRITICAL: API calls were already reserved and counted in reserve_api_calls
            // Pass the actual API calls made (in case job failed partway through)
            const { error: completeError } = await supabase.rpc('complete_queue_job_v2', {
              p_job_id: job.id,
              p_data_size_bytes: result.dataSizeBytes,
              p_api_calls_made: apiCallsForJob, // Pass actual calls made
            });

            if (completeError) {
              console.error(`[queue-processor-v2] Failed to complete job ${job.id}:`, completeError);
              processedJobs.push({ id: job.id, success: false, error: completeError.message });
            } else {
              processedJobs.push({ id: job.id, success: true });
              jobsProcessed++; // Count successful jobs toward rate limit
            }
          } else {
            // Job failed - but API call was already made (counts toward limit)
            // CRITICAL: Do NOT release the reservation - the API call was made to FMP
            // Even if validation failed, database upsert failed, etc., the call counts
            // The reservation was already incremented in reserve_api_calls, keep it
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
          // CRITICAL: Do NOT release API call reservation on error
          // The API call may have been made (even if it failed or threw an exception)
          // Once we reserve, we commit to making the call - it counts toward the limit
          // The reservation was already incremented in reserve_api_calls, keep it

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
    case 'insider-trading-statistics':
      return await fetchInsiderTradingStatisticsLogic(job, supabase);
    case 'insider-transactions':
      return await fetchInsiderTransactionsLogic(job, supabase);
    case 'valuations':
      return await fetchDcfLogic(job, supabase);
    case 'market-risk-premium':
      return await fetchMarketRiskPremiumLogic(job, supabase);
    case 'treasury-rates':
      return await fetchTreasuryRatesLogic(job, supabase);
    case 'analyst-price-targets':
      return await fetchPriceTargetConsensusLogic(job, supabase);
    default:
      return {
        success: false,
        dataSizeBytes: 0,
        error: `Unknown or unsupported data type: ${job.data_type}. This data type is not registered in the queue system.`,
      };
  }
}
