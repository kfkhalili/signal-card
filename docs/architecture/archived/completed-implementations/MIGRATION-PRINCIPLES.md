# Migration Principles

**Date:** 2025-11-19
**Purpose:** Define what should and should NOT be included in database migrations

---

## Core Principle

**Migrations should only contain infrastructure setup needed for production environments.**

Migrations facilitate the preparation of a new environment by creating all necessary infrastructure components. They should be idempotent and safe to run on a fresh database.

---

## ✅ What SHOULD Be in Migrations

### Infrastructure Components

1. **Table Creation**
   - CREATE TABLE statements
   - Column definitions, constraints, indexes
   - Partition definitions

2. **Row Level Security (RLS)**
   - ENABLE ROW LEVEL SECURITY
   - CREATE POLICY statements
   - Security policies for all tables

3. **Database Functions**
   - CREATE OR REPLACE FUNCTION
   - Helper functions, staleness checkers, queue management
   - Trigger functions

4. **Triggers**
   - CREATE TRIGGER statements
   - Auto-update timestamps, webhooks, etc.

5. **Cron Jobs**
   - cron.schedule() calls
   - Scheduled background tasks
   - Edge Function invocations

6. **Realtime Configuration**
   - ALTER PUBLICATION supabase_realtime ADD TABLE
   - Realtime enablement for tables

7. **Extensions**
   - CREATE EXTENSION statements
   - Required PostgreSQL extensions

8. **Initial Configuration Data**
   - **Feature flags** (initial flags for system configuration)
   - **Data type registry entries** (system configuration, not test data)
   - **Initial user profile setup** (trigger functions, not actual user data)

9. **Comments and Documentation**
   - COMMENT ON TABLE/COLUMN/FUNCTION
   - Documentation for future developers

---

## ❌ What Should NOT Be in Migrations

### Test Data

1. **Test Symbols**
   - ❌ INSERT INTO supported_symbols for testing (e.g., LCID, RIVN)
   - ✅ These should be added manually or via separate test setup scripts

2. **Test User Data**
   - ❌ INSERT INTO user_profiles with test users
   - ❌ INSERT INTO profiles with test company data

3. **Test Subscriptions**
   - ❌ INSERT INTO active_subscriptions_v2 for testing
   - ❌ INSERT INTO api_call_queue_v2 for testing

4. **Any Data That Varies by Environment**
   - ❌ Environment-specific configuration
   - ❌ Development-only data
   - ❌ Staging-specific test data

---

## Examples

### ✅ Good Migration (Infrastructure)

```sql
-- Create feature flags table and insert initial flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false
);

-- Initial feature flags are infrastructure (system configuration)
INSERT INTO public.feature_flags (flag_name, enabled) VALUES
  ('use_queue_system', false),
  ('use_presence_tracking', false)
ON CONFLICT (flag_name) DO NOTHING;
```

### ✅ Good Migration (Registry Configuration)

```sql
-- Populate data type registry with 'profile' configuration
INSERT INTO public.data_type_registry_v2 (
  data_type,
  table_name,
  timestamp_column,
  staleness_function,
  default_ttl_minutes,
  edge_function_name,
  refresh_strategy
) VALUES (
  'profile',
  'profiles',
  'modified_at',
  'is_profile_stale_v2',
  1440,
  'queue-processor-v2',
  'on-demand'
) ON CONFLICT (data_type) DO UPDATE SET ...;
```

### ❌ Bad Migration (Test Data)

```sql
-- ❌ DO NOT INCLUDE: Test data for testing empty card states
INSERT INTO supported_symbols (symbol, is_active, added_at)
VALUES ('LCID', true, NOW())
ON CONFLICT (symbol) DO UPDATE SET ...;
```

**Why:** This is test data, not infrastructure. Production environments shouldn't automatically have LCID or RIVN added.

---

## Migration Naming Convention

Migrations should be named descriptively to indicate their purpose:

- ✅ `create_feature_flags_table.sql` - Infrastructure
- ✅ `populate_data_type_registry_profile.sql` - Infrastructure (registry config)
- ✅ `enable_realtime_for_exchange_variants.sql` - Infrastructure
- ❌ `add_lcid_to_supported_symbols.sql` - Test data (should be removed)

---

## When to Add Test Data

Test data should be added via:

1. **Manual SQL scripts** (not migrations)
2. **Test setup scripts** (separate from migrations)
3. **Seed scripts** (for development environments only)
4. **Manual database operations** (for specific testing needs)

---

## Verification Checklist

Before committing a migration, verify:

- [ ] Does this create/modify infrastructure (tables, functions, triggers, etc.)?
- [ ] Is this needed for production to function?
- [ ] Would a fresh database need this to work?
- [ ] Is this idempotent (safe to run multiple times)?
- [ ] Does this contain test data? (If yes, remove it)

---

## Summary

**Migrations = Infrastructure Setup Only**

- ✅ Tables, RLS, functions, triggers, cron jobs, realtime, extensions
- ✅ Initial configuration (feature flags, registry entries)
- ❌ Test data (symbols, users, subscriptions)
- ❌ Environment-specific data

This ensures migrations can safely prepare any new environment (dev, staging, production) without introducing unwanted test data.

