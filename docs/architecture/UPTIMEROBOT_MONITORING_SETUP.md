# UptimeRobot Monitoring Setup Guide

**Purpose:** Set up UptimeRobot monitors for the on-demand API system alerts.

---

## Overview

This guide sets up UptimeRobot monitors for three critical alerts:
1. **Queue Success Rate** - Alerts if success rate <90%
2. **Quota Usage** - Alerts if quota usage >80%
3. **Stuck Jobs** - Alerts if stuck jobs >10

Each monitor checks the `monitoring-alerts` Edge Function endpoint and triggers alerts when conditions are met.

---

## Prerequisites

1. **UptimeRobot Account** - Sign up at https://uptimerobot.com (free tier: 50 monitors)
2. **Edge Function Deployed** - `monitoring-alerts` function must be deployed
3. **API URL** - Your API URL: `https://api.tickered.com`

---

## Step 1: Deploy Monitoring Alerts Edge Function

**Deploy the Edge Function:**

```bash
cd /Users/Q407910/git/tickered
supabase functions deploy monitoring-alerts
```

**Get Your Supabase Anon Key:**
1. Go to Supabase Dashboard → Your Project → Settings → API
2. Copy the **anon/public** key
3. You'll need this for UptimeRobot configuration

**Verify deployment (with auth):**

```bash
curl -H "apikey: [YOUR_ANON_KEY]" \
  https://api.tickered.com/functions/v1/monitoring-alerts/all-alerts
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

---

## Step 2: Create UptimeRobot Monitors

### Monitor 1: Queue Success Rate

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

4. **CRITICAL: Add Authorization Header**
   - **HTTP Method:** GET
   - **HTTP Headers:** Click "Add Header"
   - **Header Name:** `apikey`
   - **Header Value:** `[YOUR_SUPABASE_ANON_KEY]` (get from Supabase Dashboard → Settings → API)
   - **Alternative:** Use `Authorization` header with value `Bearer [YOUR_SUPABASE_ANON_KEY]`

5. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200` (only 200 is "UP", 503 triggers alert)
   - **Keyword Monitoring (Optional):**
     - **If present:** `"status":"healthy"` → Monitor is UP
     - **If absent:** Alert (this means unhealthy)

6. **Save Monitor**

### Monitor 2: Quota Usage

1. **Click "Add New Monitor"**
2. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - Quota Usage`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/quota-usage`
   - **Monitoring Interval:** 15 minutes (quota changes slowly)
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

3. **CRITICAL: Add Authorization Header**
   - **HTTP Headers:** Click "Add Header"
   - **Header Name:** `apikey`
   - **Header Value:** `[YOUR_SUPABASE_ANON_KEY]`

4. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200`
   - **Keyword Monitoring (Optional):** `"status":"healthy"`

5. **Save Monitor**

### Monitor 3: Stuck Jobs

1. **Click "Add New Monitor"**
2. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - Stuck Jobs`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/stuck-jobs`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

3. **CRITICAL: Add Authorization Header**
   - **HTTP Headers:** Click "Add Header"
   - **Header Name:** `apikey`
   - **Header Value:** `[YOUR_SUPABASE_ANON_KEY]`

4. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200`
   - **Keyword Monitoring (Optional):** `"status":"healthy"`

5. **Save Monitor**

### Monitor 4: All Alerts (Optional - Summary)

1. **Click "Add New Monitor"**
2. **Configure:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Tickered - All Alerts Summary`
   - **URL:** `https://api.tickered.com/functions/v1/monitoring-alerts/all-alerts`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Select your alert contacts
   - **Alert When Down:** Immediately (0 minutes)
   - **Alert When Up:** Immediately (0 minutes)

3. **CRITICAL: Add Authorization Header**
   - **HTTP Headers:** Click "Add Header"
   - **Header Name:** `apikey`
   - **Header Value:** `[YOUR_SUPABASE_ANON_KEY]`

4. **Advanced Settings:**
   - **Up HTTP Status Codes:** `200`
   - **Keyword Monitoring (Optional):** `"status":"healthy"`

5. **Save Monitor**

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

### Test Quota Usage Alert

**Note:** Quota usage is calculated from rolling 30-day window. To test, you'd need to artificially inflate usage, which is not recommended. Instead, monitor the endpoint manually:

```bash
curl https://api.tickered.com/functions/v1/monitoring-alerts/quota-usage
```

If quota is >80%, it will return 503.

### Test Stuck Jobs Alert

**Temporarily create stuck jobs:**
```sql
-- In Supabase SQL Editor
UPDATE api_call_queue_v2
SET status = 'processing',
    processed_at = NOW() - INTERVAL '15 minutes'
WHERE status = 'pending'
LIMIT 15;
```

**Wait 5 minutes** for UptimeRobot to check

**Verify:**
- Monitor shows "DOWN" status
- You receive an alert email/SMS
- Alert message includes stuck jobs count

**Restore:**
```sql
-- Restore jobs
UPDATE api_call_queue_v2
SET status = 'pending',
    processed_at = NULL
WHERE status = 'processing'
  AND processed_at < NOW() - INTERVAL '10 minutes';
```

---

## Monitor Configuration Summary

| Monitor | URL Endpoint | Interval | Threshold |
|---------|-------------|----------|-----------|
| Queue Success Rate | `/monitoring-alerts/queue-success-rate` | 5 minutes | <90% |
| Quota Usage | `/monitoring-alerts/quota-usage` | 15 minutes | >80% |
| Stuck Jobs | `/monitoring-alerts/stuck-jobs` | 5 minutes | >10 jobs |
| All Alerts | `/monitoring-alerts/all-alerts` | 5 minutes | Any alert |

---

## Alert Response Procedure

### When You Receive an Alert

1. **Check the alert type:**
   - Queue Success Rate → Review failed jobs
   - Quota Usage → Review data transfer trends
   - Stuck Jobs → Run recovery function

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
- **Verify:** Response body contains `"status":"alert"`
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

## Integration with Existing Health Check

**Note:** You already have a `health-check` endpoint for cron job monitoring. The `monitoring-alerts` endpoint is complementary:

- **`health-check`** → Monitors cron job execution (system liveness)
- **`monitoring-alerts`** → Monitors queue health, quota, and stuck jobs (operational metrics)

Both should be monitored for complete system visibility.

---

## Next Steps

1. ✅ Deploy `monitoring-alerts` Edge Function
2. ✅ Create UptimeRobot monitors
3. ✅ Configure alert contacts
4. ✅ Test alerts
5. ⏳ Document alert response procedure
6. ⏳ Add to on-call rotation
7. ⏳ Review alert thresholds monthly

---

## Related Documentation

- **Monitoring Queries:** `docs/architecture/MONITORING_QUERIES.md`
- **Operational Runbook:** `docs/architecture/OPERATIONAL_RUNBOOK.md`
- **Health Check Setup:** `docs/architecture/UPTIMEROBOT_SETUP_GUIDE.md`
- **Edge Function:** `supabase/functions/monitoring-alerts/index.ts`

