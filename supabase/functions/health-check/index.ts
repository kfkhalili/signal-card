/**
 * Health Check Edge Function
 *
 * Purpose: External monitoring endpoint for pg_cron job health
 * This allows external services (UptimeRobot, GitHub Actions, etc.) to monitor
 * whether the critical cron jobs are running correctly.
 *
 * CRITICAL: This is a public endpoint (uses anon_key) to allow external monitoring.
 * It only reads from pg_cron.job_run_details - no sensitive data exposed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query pg_cron job execution history
    const { data: jobRuns, error } = await supabase.rpc('check_cron_job_health', {
      critical_jobs: [
        'check-stale-data',
        'process-queue-batch',
        'scheduled-refreshes',
        'refresh-analytics-table',
        'maintain-queue-partitions',
      ],
    });

    if (error) {
      console.error('[health-check] Failed to query cron job health:', error);
      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Failed to check cron job health',
          details: error.message,
        }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Type for job run data from database
    interface JobRun {
      jobname: string;
      last_run: string | null;
    }

    // Check if any critical job is stale (hasn't run in expected interval)
    const staleJobs = (jobRuns || []).filter((job: JobRun) => {
      if (!job.last_run) {
        // Job has never run - this is a problem
        return true;
      }

      const expectedInterval =
        job.jobname === 'process-queue-batch' ? 2 : // 2 minutes (runs every 1 min, allow 1 min buffer)
        job.jobname === 'check-stale-data' ? 10 : // 10 minutes (runs every 5 min, allow 5 min buffer)
        job.jobname === 'scheduled-refreshes' ? 5 : // 5 minutes (runs every 1 min, allow 4 min buffer)
        job.jobname === 'refresh-analytics-table' ? 20 : // 20 minutes (runs every 15 min, allow 5 min buffer)
        job.jobname === 'maintain-queue-partitions' ? 10080 : // 1 week (runs weekly, allow 1 day buffer)
        10; // Default 10 minutes

      const timeSinceLastRun = Date.now() - new Date(job.last_run).getTime();
      const thresholdMs = expectedInterval * 60 * 1000;

      return timeSinceLastRun > thresholdMs;
    });

    if (staleJobs.length > 0) {
      console.warn('[health-check] Stale cron jobs detected:', staleJobs);
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          error: 'Cron jobs are stale',
          stale_jobs: staleJobs.map((j: JobRun) => ({
            name: j.jobname,
            last_run: j.last_run,
            time_since_run_minutes: j.last_run
              ? Math.round((Date.now() - new Date(j.last_run).getTime()) / 60000)
              : null,
          })),
          all_jobs: jobRuns,
        }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // All jobs are healthy
    return new Response(
      JSON.stringify({
        status: 'healthy',
        jobs: jobRuns,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[health-check] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
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

