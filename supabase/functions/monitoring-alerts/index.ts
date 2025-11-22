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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertResult {
  alert_type: string;
  status: "healthy" | "alert";
  message: string | null;
  metric_value: number | null;
  threshold: string;
}

// CRITICAL: This function is PUBLIC (no JWT verification) for UptimeRobot monitoring
// It uses SERVICE_ROLE_KEY internally, so it can read data without user authentication
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
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
        return await getAllAlerts(supabase);
      default:
        return new Response(
          JSON.stringify({
            error: "Unknown endpoint",
            available_endpoints: [
              "/queue-success-rate",
              "/quota-usage",
              "/stuck-jobs",
              "/all-alerts",
            ],
          }),
          {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
    }

    // Return 503 if alert condition is met, 200 if healthy
    statusCode = result.status === "alert" ? 503 : 200;

    return new Response(JSON.stringify(result, null, 2), {
      status: statusCode,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[monitoring-alerts] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Check queue success rate (alert if <90%)
 */
async function checkQueueSuccessRate(supabase: ReturnType<typeof createClient>): Promise<AlertResult> {
  const { data, error } = await supabase.rpc("check_queue_success_rate_alert");

  if (error) {
    throw new Error(`Failed to check queue success rate: ${error.message}`);
  }

  const result = data?.[0];
  const successRate = parseFloat(result?.success_rate_percent ?? "100");
  const completed = parseInt(result?.completed_count ?? "0", 10);
  const failed = parseInt(result?.failed_count ?? "0", 10);
  const staleRejections = parseInt(result?.stale_data_rejections ?? "0", 10);
  const alertStatus = result?.alert_status ?? "healthy";

  const message = alertStatus === "alert"
    ? `Queue success rate is ${successRate.toFixed(2)}% (below 90% threshold). ${failed} actual failures, ${staleRejections} stale data rejections (expected).`
    : `Queue success rate is ${successRate.toFixed(2)}% (${failed} actual failures, ${staleRejections} stale data rejections excluded)`;

  return {
    alert_type: "queue_success_rate",
    status: alertStatus === "alert" ? "alert" : "healthy",
    message,
    metric_value: successRate,
    threshold: "90%",
  };
}

/**
 * Check quota usage (alert if >80%)
 */
async function checkQuotaUsage(supabase: ReturnType<typeof createClient>): Promise<AlertResult> {
  const { data, error } = await supabase.rpc("check_quota_usage_alert");

  if (error) {
    throw new Error(`Failed to check quota usage: ${error.message}`);
  }

  const result = data?.[0];
  const usagePercent = parseFloat(result?.usage_percent ?? "0");
  const totalBytes = parseInt(result?.total_bytes ?? "0", 10);
  const alertStatus = result?.alert_status ?? "healthy";

  return {
    alert_type: "quota_usage",
    status: alertStatus === "alert" ? "alert" : "healthy",
    message:
      alertStatus === "alert"
        ? `Quota usage is ${usagePercent.toFixed(2)}% (above 80% threshold)`
        : `Quota usage is ${usagePercent.toFixed(2)}%`,
    metric_value: usagePercent,
    threshold: "80%",
  };
}

/**
 * Check stuck jobs (alert if >10)
 */
async function checkStuckJobs(supabase: ReturnType<typeof createClient>): Promise<AlertResult> {
  const { data, error } = await supabase.rpc("check_stuck_jobs_alert");

  if (error) {
    throw new Error(`Failed to check stuck jobs: ${error.message}`);
  }

  const result = data?.[0];
  const stuckCount = parseInt(result?.stuck_count ?? "0", 10);
  const affectedTypes = parseInt(result?.affected_data_types ?? "0", 10);
  const alertStatus = result?.alert_status ?? "healthy";

  return {
    alert_type: "stuck_jobs",
    status: alertStatus === "alert" ? "alert" : "healthy",
    message:
      alertStatus === "alert"
        ? `${stuckCount} stuck jobs detected (above 10 threshold) affecting ${affectedTypes} data types`
        : `${stuckCount} stuck jobs (within threshold)`,
    metric_value: stuckCount,
    threshold: "10 jobs",
  };
}

/**
 * Get all alerts in one response
 */
async function getAllAlerts(supabase: ReturnType<typeof createClient>) {
  const [queueSuccess, quotaUsage, stuckJobs] = await Promise.all([
    checkQueueSuccessRate(supabase),
    checkQuotaUsage(supabase),
    checkStuckJobs(supabase),
  ]);

  const alerts = [queueSuccess, quotaUsage, stuckJobs];
  const hasAlert = alerts.some((a) => a.status === "alert");
  const statusCode = hasAlert ? 503 : 200;

  return new Response(
    JSON.stringify(
      {
        status: hasAlert ? "alert" : "healthy",
        timestamp: new Date().toISOString(),
        alerts: {
          queue_success_rate: queueSuccess,
          quota_usage: quotaUsage,
          stuck_jobs: stuckJobs,
        },
      },
      null,
      2
    ),
    {
      status: statusCode,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
}

