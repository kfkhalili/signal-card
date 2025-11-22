# UptimeRobot Monitoring Setup Guide

**Purpose:** Complete guide for setting up UptimeRobot monitors for Tickered's on-demand API system.

---

## Overview

This guide covers two types of monitoring:

1. **Operational Metrics** (`monitoring-alerts` endpoint) - Queue health, quota usage, stuck jobs
2. **System Liveness** (`health-check` endpoint) - Cron job execution monitoring

Both are critical for complete system visibility.

---

## Prerequisites

1. **UptimeRobot Account** - Sign up at https://uptimerobot.com (free tier: 50 monitors)
2. **Edge Functions Deployed:**
   - `monitoring-alerts` - For operational metrics
   - `health-check` - For system liveness
3. **API URL:** `https://api.tickered.com`
   - **Note:** Frontend is at `https://www.tickered.com`, API endpoints are at `https://api.tickered.com`

---

## Part 1: Operational Metrics Monitoring

### Endpoint: `monitoring-alerts`

Monitors queue health, quota usage, and stuck jobs.

### Step 1: Deploy Monitoring Alerts Edge Function

```bash
cd /Users/Q407910/git/tickered
supabase functions deploy monitoring-alerts
```

**Verify deployment:**
```bash
curl https://api.tickered.com/functions/v1/monitoring-alerts/all-alerts
```

**Expected response (200 OK when healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T12:00:00.000Z",
  "alerts": {
    "queue_success_rate": {
      "alert_type": "queue_success_rate",
      "status": "healthy",
      "message": "Queue success rate is 95.23%",
      "metric_value": 95.23,
      "threshold": "90%"
    },
    "quota_usage": {
      "alert_type": "quota_usage",
      "status": "healthy",
      "message": "Quota usage is 45.67%",
      "metric_value": 45.67,
      "threshold": "80%"
    },
    "stuck_jobs": {
      "alert_type": "stuck_jobs",
      "status": "healthy",
      "message": "0 stuck jobs (within threshold)",
      "metric_value": 0,
      "threshold": "10 jobs"
    }
  }
}
```

**Alert response (503 Service Unavailable when alert condition met):**
```json
{
  "status": "alert",
  "timestamp": "2025-01-21T12:00:00.000Z",
  "alerts": {
    "queue_success_rate": {
      "alert_type": "queue_success_rate",
      "status": "alert",
      "message": "Queue success rate is 85.45% (below 90% threshold)",
      "metric_value": 85.45,
      "threshold": "90%"
    }
  }
}
```

### Step 2: Create UptimeRobot Monitors for Operational Metrics

#### Monitor 1: Queue Success Rate

1. **Log in to UptimeRobot**
2. **Click "Add New Monitor"**
3. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - Queue Success Rate`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/queue-success-rate`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

4. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200` (only 200 is "UP", 503 triggers alert)
   - **Keyword Monitoring (Optional):**
     - **If present:** `"status":"healthy"` → Monitor is UP
     - **If absent:** Alert (this means unhealthy)

5. **Save Monitor**

#### Monitor 2: Quota Usage

1. **Click "Add New Monitor"**
2. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - Quota Usage`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/quota-usage`
   - **Monitoring Interval:** 15 minutes (quota changes slowly)
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

3. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200`
   - **Keyword Monitoring (Optional):** `"status":"healthy"`

4. **Save Monitor**

#### Monitor 3: Stuck Jobs

1. **Click "Add New Monitor"**
2. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - Stuck Jobs`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/stuck-jobs`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

3. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200`
   - **Keyword Monitoring (Optional):** `"status":"healthy"`

4. **Save Monitor**

#### Monitor 4: All Alerts Summary (Optional)

1. **Click "Add New Monitor"**
2. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - All Alerts Summary`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/all-alerts`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

3. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200`
   - **Keyword Monitoring (Optional):** `"status":"healthy"`

4. **Save Monitor**

---

## Part 2: System Liveness Monitoring

### Endpoint: `health-check`

Monitors cron job execution to ensure the system is alive.

### Step 1: Verify Health-Check Endpoint

**Test the endpoint:**
```bash
curl https://api.tickered.com/functions/v1/health-check
```

**Expected response (200 OK when healthy):**
```json
{
  "status": "healthy",
  "jobs": [
    {
      "jobname": "check-stale-data-v2",
      "last_run": "2025-11-21T15:00:00Z"
    },
    {
      "jobname": "invoke-processor-v2",
      "last_run": "2025-11-21T15:00:00Z"
    },
    {
      "jobname": "queue-scheduled-refreshes-v2",
      "last_run": "2025-11-21T15:00:00Z"
    },
    {
      "jobname": "maintain-queue-partitions-v2",
      "last_run": "2025-11-21T14:00:00Z"
    }
  ],
  "timestamp": "2025-11-21T15:05:00Z"
}
```

**Unhealthy response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "error": "Cron jobs are stale",
  "stale_jobs": [
    {
      "name": "check-stale-data-v2",
      "last_run": "2025-11-21T14:50:00Z",
      "time_since_run_minutes": 15
    }
  ],
  "all_jobs": [...]
}
```

### Step 2: Create UptimeRobot Monitor for System Liveness

1. **Log in to UptimeRobot**
2. **Click "Add New Monitor"**
3. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - System Health Check`
   - **URL:** `https://api.tickered.com/functions/v1/health-check`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

4. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200,201,202,204` (or leave default 200-399)
   - **Keyword Monitoring (Optional):**
     - **If present:** `"status":"healthy"` → Monitor is UP
     - **If absent:** Alert (this means unhealthy)

5. **Save Monitor**

**Note:** UptimeRobot automatically alerts on 503 by default (status codes 400+ are "DOWN"). The explicit configuration above is optional but provides extra clarity.

---

## Step 3: Configure Alert Contacts

1. **Go to "My Settings" → "Alert Contacts"**
2. **Add alert contacts:**
   - **Email** (required)
   - **SMS** (optional, requires credits)
   - **Slack** (optional, requires webhook)
   - **Push notifications** (optional, mobile app)

3. **Set alert preferences:**
   - **Alert when down:** Immediately (0 minutes)
   - **Alert when up:** Immediately (0 minutes)
   - **Alert frequency:** Every time (not just once)

---

## Step 4: Test Alerts

### Test Queue Success Rate Alert

**Temporarily create failed jobs:**
```sql
-- In Supabase SQL Editor
UPDATE api_call_queue_v2
SET status = 'failed',
    error_message = 'Test alert'
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '1 hour'
LIMIT 10;
```

**Wait 5 minutes** for UptimeRobot to check

**Verify:**
- Monitor shows "DOWN" status
- You receive an alert email/SMS
- Alert message includes queue success rate details

**Restore:**
```sql
-- Restore jobs
UPDATE api_call_queue_v2
SET status = 'completed',
    error_message = NULL
WHERE status = 'failed'
  AND error_message = 'Test alert';
```

### Test System Health Check Alert

**Temporarily disable a cron job:**
```sql
-- In Supabase SQL Editor
UPDATE cron.job
SET active = false
WHERE jobname = 'check-stale-data-v2';
```

**Wait 10+ minutes** (for the job to become stale)

**Verify:**
- Monitor shows "DOWN" status
- You receive an alert email/SMS
- Alert message includes stale job details

**Re-enable the cron job:**
```sql
UPDATE cron.job
SET active = true
WHERE jobname = 'check-stale-data-v2';
```

**Wait for next check** (5 minutes)
- Monitor should return to "UP"
- You should receive a recovery alert

---

## Monitor Configuration Summary

| Monitor | Endpoint | Interval | Threshold | Purpose |
|---------|----------|----------|-----------|---------|
| Queue Success Rate | `/monitoring-alerts/queue-success-rate` | 5 minutes | <90% | Operational metrics |
| Quota Usage | `/monitoring-alerts/quota-usage` | 15 minutes | >80% | Operational metrics |
| Stuck Jobs | `/monitoring-alerts/stuck-jobs` | 5 minutes | >10 jobs | Operational metrics |
| All Alerts | `/monitoring-alerts/all-alerts` | 5 minutes | Any alert | Operational metrics (summary) |
| System Health | `/health-check` | 5 minutes | Stale jobs | System liveness |

---

## Alert Response Procedure

### When You Receive an Alert

1. **Identify the alert type:**
   - **Queue Success Rate** → Review failed jobs in `api_call_queue_v2`
   - **Quota Usage** → Review data transfer trends in `api_data_usage_v2`
   - **Stuck Jobs** → Run `recover_stuck_jobs_v2()` function
   - **System Health** → Check cron job status in Supabase Dashboard

2. **Investigate:**
   - Check Supabase Dashboard → Logs
   - Review Edge Function logs
   - Run diagnostic queries from `OPERATIONAL_RUNBOOK.md`

3. **Resolve:**
   - Follow troubleshooting steps in `OPERATIONAL_RUNBOOK.md`
   - Run recovery procedures if needed
   - Monitor until alert clears

4. **Document:**
   - Record incident in runbook
   - Update monitoring thresholds if needed
   - Review root cause

---

## Troubleshooting

### Monitor shows "DOWN" but endpoint is accessible

- **Check:** Endpoint returns 503 (unhealthy) vs 200 (healthy)
- **Verify:** Response body contains `"status":"alert"` or `"status":"unhealthy"`
- **Action:** Check actual metric values in response

### Not receiving alerts

- **Check:** Alert contacts are configured correctly
- **Verify:** Email/SMS is correct and not in spam
- **Ensure:** Alert threshold is set to 0 minutes
- **Check:** UptimeRobot account has available credits (for SMS)

### False positives

- **Review:** Alert thresholds (may need adjustment)
- **Check:** Edge Function logs for errors
- **Verify:** Database queries are executing correctly

### Endpoint returns 500 error

- **Check:** Edge Function is deployed correctly
- **Verify:** Environment variables are set
- **Review:** Edge Function logs in Supabase Dashboard

---

## Integration Notes

**Two Complementary Monitoring Systems:**

- **`health-check`** → Monitors cron job execution (system liveness)
  - Detects if `pg_cron` is running
  - Prevents single point of failure
  - Meta-monitoring (watches the watchers)

- **`monitoring-alerts`** → Monitors queue health, quota, and stuck jobs (operational metrics)
  - Detects operational issues
  - Provides business metrics
  - Queue-specific monitoring

**Both should be monitored for complete system visibility.**

---

## Next Steps

1. ✅ Deploy Edge Functions (`monitoring-alerts`, `health-check`)
2. ✅ Create UptimeRobot monitors (5 total)
3. ✅ Configure alert contacts
4. ✅ Test alerts
5. ⏳ Document alert response procedure
6. ⏳ Add to on-call rotation
7. ⏳ Review alert thresholds monthly

---

## Related Documentation

- **Monitoring Queries:** `docs/architecture/MONITORING_QUERIES.md`
- **Operational Runbook:** `docs/architecture/OPERATIONAL_RUNBOOK.md`
- **External Heartbeat Monitor:** `docs/architecture/EXTERNAL_HEARTBEAT_MONITOR_EXPLANATION.md`
- **Edge Functions:**
  - `supabase/functions/monitoring-alerts/index.ts`
  - `supabase/functions/health-check/index.ts`
