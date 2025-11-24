# Custom ESLint Rules for TypeScript Contracts

This directory contains custom ESLint rules that enforce the Sacred Contracts defined in `docs/architecture/MASTER-ARCHITECTURE.md`.

## Rules

### 1. `enforce-contract-5-strict-schema`
**Contract #5: Strict schema parsing (Zod)**

Enforces that all functions in `supabase/functions/lib/` that use `complete_queue_job` or `fail_queue_job` must use strict Zod schema parsing.

**Why:** Prevents "Schema Drift" data corruption where APIs change field names without versioning, causing undefined values to be written as NULL.

**Checks:**
- Must import `zod` (supports both npm and Deno-style imports)
- Must have `z.object` definition (the actual schema)

**Severity:** Error

---

### 2. `enforce-contract-6a-content-length`
**Contract #6a: Content-Length quota tracking**

Enforces that all functions using `complete_queue_job` must track quota using the `Content-Length` header from the HTTP response.

**Why:** Ensures accurate quota tracking by using the actual data transfer size (what the API bills for), not `JSON.stringify().length` (which measures the parsed object, not the HTTP payload).

**Checks:**
- Must use `response.headers.get('Content-Length')` or `response.headers.get("Content-Length")`

**Severity:** Error

---

### 3. `enforce-contract-14-source-timestamp`
**Contract #14: Source timestamp checking**

Warns that functions using `complete_queue_job` should check source timestamps if `source_timestamp_column` is defined in the registry.

**Why:** Prevents "Liar API Stale Data" catastrophe where the API returns 200 OK with valid shape and sanity, but the data itself may be stale (e.g., API caching bug returns 3-day-old data). We must compare source timestamps to prevent "data laundering" where stale data is marked as fresh.

**Checks:**
- Must check source timestamp if `source_timestamp_column` is defined
- Looks for patterns like `newSourceTimestamp`, `oldSourceTimestamp`, `api_timestamp`, `accepted_date`, etc.
- Also checks for registry lookup pattern: `from('data_type_registry_v2')` with `source_timestamp_column`

**Severity:** Warning (not error, because registry lookup is dynamic)

---

## Integration

These rules are integrated into `eslint.config.mjs` and apply only to files matching:
- `supabase/functions/lib/**/*.ts`

## Usage

The rules run automatically when ESLint is executed on files in `supabase/functions/lib/`.

To test manually:
```bash
npx eslint supabase/functions/lib/fetch-fmp-quote.ts
```

## Notes

- These rules use pattern matching (text analysis) rather than AST analysis for simplicity
- They are designed to catch common violations but may have false positives/negatives
- The rules are intentionally conservative (better to warn than miss a violation)

