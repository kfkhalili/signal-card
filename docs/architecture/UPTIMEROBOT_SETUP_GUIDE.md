# UptimeRobot Setup Guide for Health-Check Monitor

## Quick Setup Steps

### Step 0: Verify Endpoint is Working

**Test the endpoint:**
```bash
curl https://api.tickered.com/functions/v1/health-check
```

**Expected response (200 OK when healthy):**
```json
{
  "status": "healthy",
  "jobs": [...],
  "timestamp": "2025-11-21T15:05:00Z"
}
```

**If you get 503 (unhealthy):**
```json
{
  "status": "unhealthy",
  "error": "Cron jobs are stale",
  "stale_jobs": [...]
}
```

### Step 1: Verify Monitor Configuration

1. **Log in to UptimeRobot**
2. **Go to your monitor** for `https://api.tickered.com/functions/v1/health-check`
3. **Click "Edit Monitor"**

### Step 2: Configure HTTP Status Code Alerts

**Good News:** UptimeRobot **already alerts on 503 by default!**

- Status codes **200-399** are considered "UP" ✅
- Status codes **400+** (including 503) are considered "DOWN" ❌
- **503 will automatically trigger alerts** - no additional configuration needed!

**Optional: Explicit Configuration (For Extra Clarity)**

If you want to be explicit about which status codes are considered "UP":

1. In the monitor settings, scroll to **"Advanced Settings"**
2. Find **"Up HTTP Status Codes"** field
3. Set it to: `200,201,202,204` (only these specific codes are "UP")
   - This ensures 503 (and any other error codes) will trigger alerts
4. **Save changes**

**Note:** The default behavior (200-399 = UP) already works perfectly for our use case. You only need to change this if you want to be more restrictive.

### Step 3: Configure Alert Contacts

1. Go to **"My Settings" → "Alert Contacts"**
2. **Add your alert contacts:**
   - Email (required)
   - SMS (optional, requires credits)
   - Slack (optional, requires webhook)
   - Push notifications (optional, mobile app)
3. **Set alert threshold:**
   - **Alert when down:** Immediately (0 minutes)
   - **Alert when up:** Immediately (0 minutes)

### Step 4: Test the Alert

**Test that alerts work:**

1. **Temporarily disable a cron job** in Supabase:
   ```sql
   -- In Supabase SQL Editor
   UPDATE cron.job
   SET active = false
   WHERE jobname = 'check-stale-data';
   ```

2. **Wait 10+ minutes** (for the job to become stale)

3. **Check health-check endpoint:**
   ```bash
   curl https://api.tickered.com/functions/v1/health-check
   ```
   Should return 503 with JSON showing stale jobs

4. **Verify UptimeRobot detects it:**
   - Monitor should show "DOWN" status
   - You should receive an alert

5. **Re-enable the cron job:**
   ```sql
   UPDATE cron.job
   SET active = true
   WHERE jobname = 'check-stale-data';
   ```

6. **Wait for next check** (5 minutes)
   - Monitor should return to "UP"
   - You should receive a recovery alert

---

## Advanced: Keyword Monitoring (Optional)

For more detailed monitoring, you can use **keyword monitoring** to check the response body:

1. **In monitor settings**, enable **"Keyword Monitoring"**
2. **Set "Keyword to check for":**
   - **If present:** `"status":"healthy"`
   - **If absent:** Alert (this means unhealthy)
3. **Or check for error:**
   - **If present:** `"status":"unhealthy"` → Alert
   - **If present:** `"error"` → Alert

This provides an additional layer of checking beyond just HTTP status codes.

---

## Expected Response Formats

### Healthy Response (200 OK)
```json
{
  "status": "healthy",
  "jobs": [
    {
      "jobname": "check-stale-data",
      "last_run": "2025-11-21T15:00:00Z"
    },
    {
      "jobname": "process-queue-batch",
      "last_run": "2025-11-21T15:00:00Z"
    }
  ],
  "timestamp": "2025-11-21T15:05:00Z"
}
```

### Unhealthy Response (503 Service Unavailable)
```json
{
  "status": "unhealthy",
  "error": "Cron jobs are stale",
  "stale_jobs": [
    {
      "name": "check-stale-data",
      "last_run": "2025-11-21T14:50:00Z",
      "time_since_run_minutes": 15
    }
  ],
  "all_jobs": [...]
}
```

---

## Monitor Settings Summary

**Recommended Configuration:**
- **Monitor Type:** HTTP(s)
- **URL:** `https://api.tickered.com/functions/v1/health-check`
- **Monitoring Interval:** 5 minutes
- **Up HTTP Status Codes:** `200,201,202,204` (or leave default)
- **Alert Contacts:** Your email + SMS (if available)
- **Alert When Down:** Immediately (0 minutes)
- **Alert When Up:** Immediately (0 minutes)

---

## Troubleshooting

### Monitor shows "DOWN" but endpoint is accessible
- Check if endpoint returns 503 (unhealthy) vs 200 (healthy)
- Check response body for `"status":"unhealthy"`
- Verify cron jobs are actually running in Supabase

### Not receiving alerts
- Check "Alert Contacts" are configured
- Verify email/SMS is correct
- Check spam folder
- Ensure alert threshold is set to 0 minutes

### False positives
- Adjust expected intervals in health-check function if needed
- Check if cron jobs are actually running but health-check is misconfigured

---

## Next Steps

1. ✅ Monitor is configured
2. ✅ Alerts are set up
3. ⏳ Test alert (disable a cron job temporarily)
4. ⏳ Document alert response procedure
5. ⏳ Add to on-call runbook

