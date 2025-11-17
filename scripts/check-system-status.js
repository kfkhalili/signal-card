#!/usr/bin/env node
/**
 * System Status Checker
 * Uses Supabase MCP to check the current state of the system
 * This script can be run by the AI to understand the current state
 */

// This script will be used by the AI via Supabase MCP
// For now, it provides SQL queries that can be run via MCP

const queries = {
  checkRegistry: `
    SELECT
      data_type,
      table_name,
      timestamp_column,
      default_ttl_minutes,
      refresh_strategy,
      created_at
    FROM data_type_registry_v2
    WHERE data_type = 'profile';
  `,

  checkFeatureFlags: `
    SELECT flag_name, is_enabled
    FROM feature_flags
    WHERE flag_name IN ('use_queue_system', 'use_presence_tracking', 'migrate_profile_type');
  `,

  checkQueueStatus: `
    SELECT
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE data_type = 'profile') as profile_count
    FROM api_call_queue_v2
    GROUP BY status
    ORDER BY status;
  `,

  checkQuota: `
    SELECT
      date,
      total_bytes,
      is_quota_exceeded_v2() as quota_exceeded
    FROM api_data_usage_v2
    ORDER BY date DESC
    LIMIT 7;
  `,

  checkRecentActivity: `
    SELECT
      symbol,
      data_type,
      status,
      priority,
      created_at,
      processed_at
    FROM api_call_queue_v2
    WHERE created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 10;
  `,

  checkCronJobs: `
    SELECT
      jobname,
      schedule,
      active,
      jobid
    FROM cron.job
    WHERE jobname LIKE '%v2%'
    ORDER BY jobname;
  `,
};

console.log(JSON.stringify(queries, null, 2));

