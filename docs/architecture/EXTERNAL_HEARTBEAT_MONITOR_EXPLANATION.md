# External Heartbeat Monitor: Explanation & Setup Guide

**Status:** Infrastructure exists, external monitor not configured
**Priority:** Medium (system is operational, but lacks external monitoring)

---

## What Is It?

The **External Heartbeat Monitor** is a "meta-monitoring" system that watches the watchers. It's an external service (outside of Supabase) that periodically checks if the critical `pg_cron` jobs are still running.

---

## Why Is It Critical?

### The Problem: Single Point of Failure

The entire on-demand API system is **100% dependent on `pg_cron`**:

- **Background staleness checker** runs via `pg_cron` (every minute)
- **Queue processor invoker** runs via `pg_cron` (every minute)
- **Analytics refresh** runs via `pg_cron` (every minute)
- **Scheduled refreshes** run via `pg_cron` (every minute)

**If `pg_cron` fails, hangs, or is misconfigured:**
- ❌ No staleness checks happen
- ❌ No jobs get processed
- ❌ No data refreshes occur
- ❌ **The entire system is dead**

### The Critical Gap: No Internal Alerts

When `pg_cron` fails:
- No functions are running
- No `RAISE WARNING` messages are generated
- No exceptions are thrown
- **No internal alerts fire**

The system can be **100% dead for hours or days** before anyone notices.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│  External Monitor Service               │
│  (UptimeRobot / GitHub Actions / etc.) │
│  - Runs every 5 minutes                │
│  - Pings health-check endpoint         │
└──────────────┬──────────────────────────┘
               │
               │ HTTP GET
               ▼
┌─────────────────────────────────────────┐
│  Health-Check Edge Function             │
│  /functions/v1/health-check             │
│  - Queries pg_cron job execution        │
│  - Returns 200 (healthy) or 503 (stale)│
└──────────────┬──────────────────────────┘
               │
               │ RPC Call
               ▼
┌─────────────────────────────────────────┐
│  check_cron_job_health() SQL Function   │
│  - Queries pg_cron.job_run_details      │
│  - Returns last_run time for each job    │
└─────────────────────────────────────────┘
```

### Current Status

✅ **Health-Check Edge Function:** Exists at `supabase/functions/health-check/index.ts`
✅ **SQL Function:** `check_cron_job_health()` exists and works
❌ **External Monitor:** Not configured (this is what needs to be done)

---

## What Needs to Be Done

### Option 1: UptimeRobot (Recommended - Easiest)

1. **Sign up for UptimeRobot** (free tier supports 50 monitors)
2. **Create HTTP(s) Monitor:**
   - **URL:** `https://[your-project].supabase.co/functions/v1/health-check`
   - **Interval:** 5 minutes
   - **Alert Contacts:** Your email/SMS/Slack
3. **Configure Alert:**
   - If status code = `503` → Trigger P0 alert
   - Alert message should include which cron jobs are stale

### Option 2: GitHub Actions (Free, but requires repo)

1. **Create workflow file:** `.github/workflows/cron-health-check.yml`
2. **Schedule:** Runs every 5 minutes via `cron: '*/5 * * * *'`
3. **Action:** HTTP GET to health-check endpoint
4. **Alert:** If 503, send email/Slack notification

### Option 3: AWS Lambda (Requires AWS account)

1. **Create Lambda function** that pings health-check endpoint
2. **Create CloudWatch Events rule** to trigger every 5 minutes
3. **Configure SNS topic** for alerts if 503 returned

---

## Health-Check Endpoint Details

### Endpoint
```
GET https://[your-project].supabase.co/functions/v1/health-check
```

### Response Format

**Healthy (200 OK):**
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

**Unhealthy (503 Service Unavailable):**
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

### Expected Intervals

The health-check function checks if jobs have run within these intervals:

- **`process-queue-batch`:** 2 minutes (runs every 1 min, allows 1 min buffer)
- **`check-stale-data`:** 10 minutes (runs every 5 min, allows 5 min buffer)
- **`scheduled-refreshes`:** 5 minutes (runs every 1 min, allows 4 min buffer)
- **`refresh-analytics-table`:** 20 minutes (runs every 15 min, allows 5 min buffer)
- **`maintain-queue-partitions`:** 1 week (runs weekly, allows 1 day buffer)

If a job hasn't run within its expected interval, it's considered "stale" and the endpoint returns 503.

---

## Alert Configuration

### Critical Alerts (P0)

When health-check returns `503`:
- **Immediate notification** to on-call engineer
- **Alert must include:**
  - Which cron jobs are stale
  - How long since last run
  - Link to Supabase dashboard for investigation

### Example Alert Message

```
🚨 CRITICAL: On-Demand API System Health Check Failed

The health-check endpoint returned 503 (Service Unavailable).

Stale Jobs:
- check-stale-data: Last run 15 minutes ago (expected: < 10 minutes)
- process-queue-batch: Last run 8 minutes ago (expected: < 2 minutes)

Action Required:
1. Check Supabase dashboard for pg_cron job status
2. Verify database connection and permissions
3. Check for database locks or stuck queries
4. Restart pg_cron if necessary

Health Check URL: https://[project].supabase.co/functions/v1/health-check
```

---

## Why This Is Different from Internal Monitoring

### Internal Monitoring (Already Exists)
- Monitors **job execution** (did the job succeed/fail?)
- Monitors **queue health** (are jobs processing?)
- Monitors **API rate limits** (are we exceeding limits?)

### External Monitoring (Missing)
- Monitors **system liveness** (is pg_cron even running?)
- Detects **complete system failure** (pg_cron hung/failed)
- Provides **meta-monitoring** (watches the watchers)

**Key Difference:** If `pg_cron` fails, internal monitoring can't run (no functions execute). External monitoring runs independently and can detect this.

---

## Implementation Checklist

- [ ] Choose external monitoring service (UptimeRobot recommended)
- [ ] Create monitor pointing to health-check endpoint
- [ ] Configure 5-minute check interval
- [ ] Set up alert contacts (email/SMS/Slack)
- [ ] Test alert by temporarily disabling a cron job
- [ ] Document alert response procedure
- [ ] Add alert contact info to on-call rotation

---

## Cost

- **UptimeRobot:** Free tier (50 monitors, 5-minute intervals)
- **GitHub Actions:** Free for public repos, 2000 minutes/month for private
- **AWS Lambda:** ~$0.20/month (very cheap, 5-minute intervals)

---

## Next Steps

1. **Immediate:** Set up UptimeRobot monitor (takes 5 minutes)
2. **Short-term:** Test alert by manually disabling a cron job
3. **Long-term:** Add to on-call runbook and alert escalation procedures

---

## Related Documentation

- **Master Architecture:** Section on External Heartbeat Monitor (lines 2267-2362)
- **Health-Check Function:** `supabase/functions/health-check/index.ts`
- **SQL Function:** `supabase/migrations/20251117072141_create_health_check_function.sql`

