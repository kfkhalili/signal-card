# AI Automation Guide

**Last Updated:** 2025-11-17

## Overview

This guide explains how the AI can automatically check status, apply migrations, and monitor progress using Supabase MCP tools and automated scripts.

## Quick Status Check

The AI can check the current system status using:

```bash
npm run migration:status
```

Or use Supabase MCP directly:
- `mcp_supabase-tickered_execute_sql` - Run SQL queries
- `mcp_supabase-tickered_list_tables` - List all tables
- `mcp_supabase-tickered_apply_migration` - Apply migrations

## Key Status Queries

### 1. Check Registry Entry
```sql
SELECT * FROM data_type_registry_v2 WHERE data_type = 'profile';
```

### 2. Check Feature Flags
```sql
SELECT flag_name, is_enabled FROM feature_flags WHERE flag_name = 'use_queue_system';
```

### 3. Check Queue Status
```sql
SELECT status, COUNT(*) FROM api_call_queue_v2 GROUP BY status;
```

### 4. Check Quota
```sql
SELECT date, total_bytes, is_quota_exceeded_v2() as quota_exceeded 
FROM api_data_usage_v2 
ORDER BY date DESC LIMIT 7;
```

### 5. Check Recent Activity
```sql
SELECT symbol, data_type, status, created_at 
FROM api_call_queue_v2 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 10;
```

## Applying Migrations

The AI can apply migrations using Supabase MCP:

1. Read the migration file
2. Use `mcp_supabase-tickered_apply_migration` with:
   - `name`: Migration name (e.g., "create_data_type_registry_v2")
   - `query`: Full SQL content from the migration file

Example:
```typescript
mcp_supabase-tickered_apply_migration({
  name: "create_data_type_registry_v2",
  query: "CREATE TABLE IF NOT EXISTS ..."
})
```

## Automated Validation

The AI can run validation checks:

```bash
npm run migration:validate
```

This checks:
- ✅ Registry entry exists
- ✅ Feature flag is disabled (safe)
- ✅ Queue table exists
- ✅ Functions exist
- ✅ Edge Functions exist
- ✅ Cron jobs exist

## Monitoring Progress

### Real-time Monitoring
```bash
npm run migration:monitor
```

### Get Metrics
```bash
npm run migration:metrics
```

### Check Status
```bash
npm run migration:status
```

## Migration Order

When applying migrations, follow this order:

1. **Phase 0: Safety Infrastructure**
   - `create_feature_flags_table`
   - `create_health_check_function`
   - `create_baseline_metrics_table`

2. **Phase 1: Foundation**
   - `create_data_type_registry_v2`
   - `create_is_valid_identifier_function`
   - `create_active_subscriptions_v2`
   - `create_api_call_queue_v2`
   - `create_api_data_usage_v2`
   - `create_staleness_functions_v2`

3. **Phase 2: Queue System**
   - `create_quota_functions_v2`
   - `create_queue_management_functions_v2`
   - `create_recovery_functions_v2`
   - `create_queue_helpers_v2`
   - `create_processor_invoker_v2`
   - `create_partition_maintenance_v2`

4. **Phase 3: Staleness System**
   - `create_staleness_check_functions_v2`
   - `create_background_staleness_checker_v2`
   - `create_scheduled_refreshes_v2`
   - `create_analytics_refresh_v2`

5. **Phase 4: Cron Jobs**
   - `create_cron_jobs_v2`
   - `create_edge_function_invoker_v2`

6. **Phase 5: Migration**
   - `populate_data_type_registry_profile`

## AI Workflow

### Initial Status Check
1. Use `mcp_supabase-tickered_list_tables` to see what exists
2. Use `mcp_supabase-tickered_execute_sql` to check registry
3. Use `mcp_supabase-tickered_execute_sql` to check feature flags

### Apply Missing Migrations
1. Read migration file
2. Use `mcp_supabase-tickered_apply_migration` to apply
3. Verify with status check

### Validate System
1. Run `npm run migration:validate`
2. Check output for errors
3. Fix any issues found

### Test End-to-End
1. Run `npm run migration:test`
2. Verify all tests pass
3. Check queue status

### Monitor Migration
1. Enable feature flag (when ready)
2. Run `npm run migration:monitor` in background
3. Check metrics periodically with `npm run migration:metrics`

## Error Handling

If migrations fail:
1. Check error message
2. Verify prerequisites (e.g., functions that must exist first)
3. Apply migrations in correct order
4. Re-run validation

If status checks fail:
1. Verify Supabase MCP connection
2. Check table names are correct
3. Verify migrations were applied
4. Check RLS policies

## Next Steps for AI

1. **Check Current State:**
   - List tables to see what exists
   - Check registry entry
   - Check feature flags

2. **Apply Missing Migrations:**
   - Read migration files
   - Apply via MCP
   - Verify each one

3. **Validate System:**
   - Run validation script
   - Fix any issues

4. **Test:**
   - Run end-to-end tests
   - Verify queue functions work

5. **Monitor:**
   - Set up monitoring
   - Track metrics
   - Watch for errors

