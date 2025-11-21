# Migration Automation & Monitoring

**Last Updated:** 2025-11-17

## Overview

This document describes the automated scripts and tools for monitoring and validating the migration process. All scripts are designed to be runnable by CI/CD or manually.

## Available Scripts

### Validation Scripts

#### `npm run migration:validate`
**Purpose:** Validates that the system is ready for migration

**Checks:**
- Registry entry exists
- Feature flag is disabled (safe state)
- Queue table exists
- Staleness functions exist
- Queue functions exist
- Edge Functions exist
- Library functions exist
- Cron jobs exist

**Usage:**
```bash
npm run migration:validate
```

**Exit Codes:**
- `0` - System is ready
- `1` - System is NOT ready (errors found)

---

#### `npm run migration:verify`
**Purpose:** Verifies the registry entry for a specific data type

**Usage:**
```bash
npm run migration:verify
```

**Output:** Shows the complete registry entry configuration

---

### Testing Scripts

#### `npm run migration:test`
**Purpose:** Tests the end-to-end flow (with feature flag disabled)

**Tests:**
1. Registry entry exists
2. Feature flag is disabled
3. Queue table is accessible
4. Staleness check function works
5. Queue function works
6. Batch function works

**Usage:**
```bash
npm run migration:test
```

---

#### `npm run test:migration`
**Purpose:** Runs all migration-related tests

**Tests:**
1. Readiness validation
2. Registry verification
3. End-to-end flow
4. Unit tests

**Usage:**
```bash
npm run test:migration
```

---

### Monitoring Scripts

#### `npm run migration:status`
**Purpose:** Provides a comprehensive status report

**Shows:**
- Feature flag status
- Registry status
- Queue status
- Quota status
- Cron job status
- Recent queue activity

**Usage:**
```bash
npm run migration:status
```

---

#### `npm run migration:monitor`
**Purpose:** Continuous real-time monitoring (refreshes every 5 seconds)

**Shows:**
- Queue status (live)
- Recent activity (last minute)
- Quota status

**Usage:**
```bash
npm run migration:monitor
# Or with custom interval:
npm run migration:monitor 10  # Refresh every 10 seconds
```

**Stop:** Press `Ctrl+C`

---

#### `npm run migration:metrics`
**Purpose:** Get detailed metrics about the migration

**Shows:**
- Queue metrics (by status)
- Profile-specific metrics
- Quota metrics (last 30 days)
- Success rate (last 24 hours)
- Processing time statistics

**Usage:**
```bash
npm run migration:metrics
```

---

## Automated Workflow

### Pre-Migration Checklist

Run these commands before enabling the feature flag:

```bash
# 1. Validate system readiness
npm run migration:validate

# 2. Verify registry entry
npm run migration:verify

# 3. Test end-to-end flow
npm run migration:test

# 4. Run all tests
npm run test:migration
```

**All must pass before proceeding!**

---

### During Migration

Once the feature flag is enabled:

```bash
# Monitor in real-time
npm run migration:monitor

# Or check status periodically
npm run migration:status

# Get detailed metrics
npm run migration:metrics
```

---

### Post-Migration Validation

After 24-48 hours of monitoring:

```bash
# Check overall status
npm run migration:status

# Get detailed metrics
npm run migration:metrics

# Verify no regressions
npm run test:migration
```

---

## SQL Queries (Manual)

If Supabase CLI is not available, use these SQL queries via Supabase MCP or dashboard:

### Check Registry Entry
```sql
SELECT * FROM data_type_registry_v2 WHERE data_type = 'profile';
```

### Check Feature Flag
```sql
SELECT flag_name, is_enabled FROM feature_flags WHERE flag_name = 'use_queue_system';
```

### Check Queue Status
```sql
SELECT status, COUNT(*) FROM api_call_queue_v2 GROUP BY status;
```

### Check Profile Jobs
```sql
SELECT
  symbol,
  status,
  priority,
  created_at,
  processed_at
FROM api_call_queue_v2
WHERE data_type = 'profile'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Quota
```sql
SELECT
  date,
  total_bytes,
  is_quota_exceeded_v2() as quota_exceeded
FROM api_data_usage_v2
ORDER BY date DESC
LIMIT 7;
```

### Check Success Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate_percent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) as total_count
FROM api_call_queue_v2
WHERE data_type = 'profile'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Migration Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run migration:validate
      - run: npm run migration:test
      - run: npm run test:migration
```

---

## Troubleshooting

### Scripts Fail with "Supabase CLI not found"

**Solution:** Scripts will fall back to showing SQL queries. Use Supabase MCP tools or run queries manually in the dashboard.

### Registry Entry Not Found

**Solution:** Run the migration:
```bash
supabase migration up
# Or apply the specific migration
```

### Feature Flag Check Fails

**Solution:** Verify the feature_flags table exists:
```sql
SELECT * FROM feature_flags;
```

### Queue Table Not Found

**Solution:** Verify Phase 1 migrations have been applied:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'api_call_queue_v2'
);
```

---

## Next Steps

1. Run `npm run migration:validate` to check readiness
2. Run `npm run migration:test` to verify end-to-end flow
3. Enable feature flag when ready
4. Use `npm run migration:monitor` to watch progress
5. Use `npm run migration:metrics` to track performance

