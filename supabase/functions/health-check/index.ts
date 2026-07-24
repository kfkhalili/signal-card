/**
 * Health Check Edge Function
 *
 * Purpose: External monitoring endpoint for pg_cron job health
 * This allows external services (UptimeRobot, GitHub Actions, etc.) to monitor
 * whether the critical cron jobs are running correctly.
 *
 * CRITICAL: This is a public endpoint so external monitoring can reach it.
 * Its public response intentionally exposes only coarse health state.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const RESPONSE_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(req.method === "HEAD" ? null : JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { ...RESPONSE_HEADERS, "Allow": "GET, HEAD, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[health-check] Missing required Supabase environment");
      return jsonResponse(req, { status: "error" }, 500);
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Query pg_cron job execution history
    // NOTE: Parameter name must match SQL function parameter (p_critical_jobs)
    // Using actual cron job names from the database
    const { data: jobRuns, error } = await supabase.rpc(
      "check_cron_job_health",
      {
        p_critical_jobs: [
          "check-stale-data-v2",
          "invoke-processor-v2",
          "queue-scheduled-refreshes-v2",
          "maintain-queue-partitions-v2",
        ],
      },
    );

    if (error) {
      console.error("[health-check] Failed to query cron job health:", error);
      return jsonResponse(req, { status: "error" }, 503);
    }

    // Type for job run data from database
    interface JobRun {
      jobname: string;
      last_run: string | null;
    }

    // Check if any critical job is stale (hasn't run in expected interval)
    const staleJobs = (jobRuns || []).filter((job: JobRun) => {
      if (!job.last_run) {
        // Job has never run - this could be a problem, but for weekly jobs
        // (like maintain-queue-partitions-v2), it's normal if they haven't run yet
        // Only flag as stale if it's a frequent job (should have run by now)
        const isFrequentJob = job.jobname === "invoke-processor-v2" ||
          job.jobname === "check-stale-data-v2" ||
          job.jobname === "queue-scheduled-refreshes-v2";

        // Frequent jobs should have run by now, weekly jobs are OK if they haven't run yet
        return isFrequentJob;
      }

      const expectedInterval = job.jobname === "invoke-processor-v2"
        ? 2 // 2 minutes (runs every 1 min, allow 1 min buffer)
        : job.jobname === "check-stale-data-v2"
        ? 10 // 10 minutes (runs every 1 min, allow 9 min buffer)
        : job.jobname === "queue-scheduled-refreshes-v2"
        ? 5 // 5 minutes (runs every 1 min, allow 4 min buffer)
        : job.jobname === "maintain-queue-partitions-v2"
        ? 11520 // 8 days (weekly schedule plus 1 day buffer)
        : 10; // Default 10 minutes

      const timeSinceLastRun = Date.now() - new Date(job.last_run).getTime();
      const thresholdMs = expectedInterval * 60 * 1000;

      return timeSinceLastRun > thresholdMs;
    });

    if (staleJobs.length > 0) {
      console.warn("[health-check] Stale cron jobs detected:", staleJobs);
      return jsonResponse(
        req,
        {
          status: "unhealthy",
          failed_check_count: staleJobs.length,
        },
        503,
      );
    }

    // All jobs are healthy
    return jsonResponse(req, { status: "healthy" }, 200);
  } catch (error) {
    console.error("[health-check] Unexpected error:", error);
    return jsonResponse(req, { status: "error" }, 500);
  }
});
