/**
 * Monitoring Alerts Edge Function
 *
 * Exposes monitoring queries as HTTP endpoints for UptimeRobot integration.
 * Each endpoint returns 200 OK if healthy, 503 Service Unavailable if alert condition is met.
 *
 * Endpoints:
 * - /queue-success-rate - Checks if queue success rate <90%
 * - /quota-usage - Checks if quota usage >80%
 * - /stuck-jobs - Checks if stuck jobs >10
 * - /all-alerts - Returns all alert statuses in one response
 */

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const RESPONSE_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

interface AlertResult {
  alert_type: string;
  status: "healthy" | "alert";
}

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

function publicAlert(result: AlertResult): Record<string, string> {
  return {
    status: result.status,
    check: result.alert_type,
  };
}

// CRITICAL: This function is PUBLIC (no JWT verification) for UptimeRobot monitoring
// It uses SERVICE_ROLE_KEY internally, so it can read data without user authentication
Deno.serve(async (req: Request) => {
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
      console.error(
        "[monitoring-alerts] Missing required Supabase environment",
      );
      return jsonResponse(req, { status: "error" }, 500);
    }

    // Use service role key to bypass RLS - this is a monitoring endpoint
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop() || "";

    // Route to appropriate alert check
    let result: AlertResult;
    let statusCode = 200;

    switch (path) {
      case "queue-success-rate":
        result = await checkQueueSuccessRate(supabase);
        break;
      case "quota-usage":
        result = await checkQuotaUsage(supabase);
        break;
      case "stuck-jobs":
        result = await checkStuckJobs(supabase);
        break;
      case "all-alerts":
        return await getAllAlerts(req, supabase);
      default:
        return jsonResponse(req, { status: "not_found" }, 404);
    }

    // Return 503 if alert condition is met, 200 if healthy
    statusCode = result.status === "alert" ? 503 : 200;

    return jsonResponse(req, publicAlert(result), statusCode);
  } catch (error) {
    console.error("[monitoring-alerts] Error:", error);
    return jsonResponse(req, { status: "error" }, 500);
  }
});

/**
 * Check queue success rate (alert if <90%)
 */
async function checkQueueSuccessRate(
  supabase: SupabaseClient,
): Promise<AlertResult> {
  const { data, error } = await supabase.rpc("check_queue_success_rate_alert");

  if (error) {
    throw new Error(`Failed to check queue success rate: ${error.message}`);
  }

  interface QueueSuccessRateResult {
    alert_status?: string;
  }
  const result = (data as QueueSuccessRateResult[])?.[0];
  const alertStatus = result?.alert_status ?? "healthy";

  return {
    alert_type: "queue_success_rate",
    status: alertStatus === "alert" ? "alert" : "healthy",
  };
}

/**
 * Check quota usage (alert if >80%)
 */
async function checkQuotaUsage(supabase: SupabaseClient): Promise<AlertResult> {
  const { data, error } = await supabase.rpc("check_quota_usage_alert");

  if (error) {
    throw new Error(`Failed to check quota usage: ${error.message}`);
  }

  interface QuotaUsageResult {
    alert_status?: string;
  }
  const result = (data as QuotaUsageResult[])?.[0];
  const alertStatus = result?.alert_status ?? "healthy";

  return {
    alert_type: "quota_usage",
    status: alertStatus === "alert" ? "alert" : "healthy",
  };
}

/**
 * Check stuck jobs (alert if >10)
 */
async function checkStuckJobs(supabase: SupabaseClient): Promise<AlertResult> {
  const { data, error } = await supabase.rpc("check_stuck_jobs_alert");

  if (error) {
    throw new Error(`Failed to check stuck jobs: ${error.message}`);
  }

  interface StuckJobsResult {
    alert_status?: string;
  }
  const result = (data as StuckJobsResult[])?.[0];
  const alertStatus = result?.alert_status ?? "healthy";

  return {
    alert_type: "stuck_jobs",
    status: alertStatus === "alert" ? "alert" : "healthy",
  };
}

/**
 * Get all alerts in one response
 */
async function getAllAlerts(req: Request, supabase: SupabaseClient) {
  const [queueSuccess, quotaUsage, stuckJobs] = await Promise.all([
    checkQueueSuccessRate(supabase),
    checkQuotaUsage(supabase),
    checkStuckJobs(supabase),
  ]);

  const alerts = [queueSuccess, quotaUsage, stuckJobs];
  const hasAlert = alerts.some((a) => a.status === "alert");
  const statusCode = hasAlert ? 503 : 200;

  return jsonResponse(
    req,
    {
      status: hasAlert ? "alert" : "healthy",
      checks: {
        queue_success_rate: queueSuccess.status,
        quota_usage: quotaUsage.status,
        stuck_jobs: stuckJobs.status,
      },
    },
    statusCode,
  );
}
