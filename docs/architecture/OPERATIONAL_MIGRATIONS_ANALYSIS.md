# Operational Migrations Analysis

## Summary

This document identifies migrations that are **operational tasks** (one-time data inserts) rather than **core schema/function definitions** required for the system to function.

## Operational-Only Migrations

These migrations only insert data into existing tables and are not required for a vanilla environment. The system can function without them if the data is inserted through other means.

### 1. Data Type Registry Population Migrations

All of these migrations insert data types into `data_type_registry_v2`. They use `ON CONFLICT DO UPDATE`, so they're idempotent, but they're still operational tasks.

- **`20251117075000_populate_data_type_registry_profile.sql`**
  - Inserts 'profile' data type into registry
  - Operational: Initial data population

- **`20251117075002_populate_data_type_registry_quote.sql`**
  - Inserts 'quote' data type into registry
  - Operational: Initial data population

- **`20251117210000_add_financial_statements_to_registry.sql`**
  - Inserts 'financial-statements' data type into registry
  - Operational: Initial data population

- **`20251117220000_add_ratios_ttm_to_registry.sql`**
  - Inserts 'ratios-ttm' data type into registry
  - Operational: Initial data population

- **`20251117230000_add_dividend_history_to_registry.sql`**
  - Inserts 'dividend-history' data type into registry
  - Operational: Initial data population

- **`20251117240000_add_revenue_product_segmentation_to_registry.sql`**
  - Inserts 'revenue-product-segmentation' data type into registry
  - Operational: Initial data population

- **`20251117250000_add_grades_historical_to_registry.sql`**
  - Inserts 'grades-historical' data type into registry
  - Operational: Initial data population

- **`20251117260000_add_exchange_variants_to_registry.sql`**
  - Inserts 'exchange-variants' data type into registry
  - Operational: Initial data population

### 2. Feature Flags Initial Data

- **`20251117072140_create_feature_flags_table.sql`**
  - **Note:** This migration is **mixed** - it creates the table (core schema) AND inserts initial feature flags (operational)
  - Lines 42-58: Insert initial feature flags (operational task)
  - The table creation and functions are core schema, but the INSERT statements are operational

## Recommendation

### Option 1: Keep All Migrations (Current State)
- **Pros:** Complete migration history, idempotent operations
- **Cons:** Cluttered migration history with operational tasks

### Option 2: Remove Operational Migrations
- **Pros:** Clean migration history, only core schema
- **Cons:** Need to ensure data is populated through other means (e.g., application startup, separate seed script)

### Option 3: Consolidate Operational Migrations
- **Pros:** Single migration for all data type registry population
- **Cons:** Still operational, but cleaner

## Recommended Approach

**Option 3: Consolidate Operational Migrations**

1. **Create a single consolidated migration** that populates all data types in `data_type_registry_v2` in one migration
2. **Remove the individual data type registry migrations** (8 migrations)
3. **Keep the feature flags migration** but note that the INSERT is operational (or extract it to a separate operational migration)

This approach:
- Reduces migration clutter
- Maintains complete migration history
- Makes it clear which migrations are operational vs. core schema
- Still allows for idempotent operations

## Migration Count

- **Total migrations analyzed:** 60+
- **Operational-only migrations:** 8 (data type registry population)
- **Mixed migrations (schema + operational):** 1 (feature flags)
- **Core schema migrations:** All others

## Consolidation Completed

### ✅ Consolidated `fail_queue_job_v2` Function

**Original migration:** `20251117073701_create_queue_management_functions_v2.sql`
- **Deleted:** `20251120240003_consolidate_ui_job_error_handling_final.sql`
- **Deleted:** `20251121000000_fail_stale_data_errors_immediately.sql`

The function is now created in its final state with all features:
- Rate limit error handling (retry indefinitely)
- Stale data error handling (fail immediately)
- UI job max retries trigger (5 retries for priority 1000)

### ✅ Consolidated Data Type Registry Population

**New consolidated migration:** `20251117075000_populate_data_type_registry_all.sql`
- **Deleted:** `20251117075000_populate_data_type_registry_profile.sql`
- **Deleted:** `20251117075002_populate_data_type_registry_quote.sql`
- **Deleted:** `20251117210000_add_financial_statements_to_registry.sql`
- **Deleted:** `20251117220000_add_ratios_ttm_to_registry.sql`
- **Deleted:** `20251117230000_add_dividend_history_to_registry.sql`
- **Deleted:** `20251117240000_add_revenue_product_segmentation_to_registry.sql`
- **Deleted:** `20251117250000_add_grades_historical_to_registry.sql`
- **Deleted:** `20251117260000_add_exchange_variants_to_registry.sql`

All 8 data types are now inserted in a single migration:
- profile
- quote
- financial-statements
- ratios-ttm
- dividend-history
- revenue-product-segmentation
- grades-historical
- exchange-variants

## Summary

- **Total migrations consolidated:** 10
- **Functions consolidated:** 1 (`fail_queue_job_v2`)
- **Data type registry migrations:** 8 → 1
- **Result:** Cleaner migration history with functions and data in their final state from the start

