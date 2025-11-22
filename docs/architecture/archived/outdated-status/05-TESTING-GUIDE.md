# Testing Guide for Queue System

**Last Updated:** 2025-11-17

## Overview

This guide explains how to run automated tests for the new backend-controlled refresh system (queue system). All tests are designed to be runnable by CI/CD or manually.

## Test Structure

### 1. Unit Tests (Jest)

Located in:
- `src/lib/__tests__/` - Library function tests
- `src/hooks/__tests__/` - React hook tests
- `supabase/functions/__tests__/` - Edge Function tests

**Run all unit tests:**
```bash
npm test
```

**Run specific test file:**
```bash
npm test -- src/lib/__tests__/card-data-type-mapping.test.ts
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

### 2. Queue System Tests (Automated Script)

**Run all queue system tests:**
```bash
npm run test:queue-system
```

This script runs:
1. Card data type mapping tests
2. Feature flags integration tests
3. useTrackSubscription hook tests
4. SQL integration tests (if Supabase is available)

### 3. End-to-End Tests (Playwright)

Located in: `e2e/`

**Run E2E tests:**
```bash
npm run test:e2e
```

## Test Files

### Frontend Tests

#### `src/lib/__tests__/card-data-type-mapping.test.ts`
Tests the mapping between card types and data types.

**What it tests:**
- Correct data type mapping for each card type
- Deduplication of data types for multiple cards
- Edge cases (empty arrays, unknown types)

**Run:**
```bash
npm test -- src/lib/__tests__/card-data-type-mapping.test.ts
```

#### `src/lib/__tests__/feature-flags-integration.test.ts`
Tests the feature flag checking system.

**What it tests:**
- Feature flag enabled/disabled states
- Error handling (database errors, network errors)
- Unavailable Supabase client handling
- Non-existent flags

**Run:**
```bash
npm test -- src/lib/__tests__/feature-flags-integration.test.ts
```

#### `src/hooks/__tests__/useTrackSubscription.test.tsx`
Tests the `useTrackSubscription` React hook.

**What it tests:**
- Feature flag gating
- Realtime Presence channel creation
- Edge Function invocation
- Error handling (silent failures)
- Cleanup on unmount
- Edge cases (empty symbol, no data types, unauthenticated)

**Run:**
```bash
npm test -- src/hooks/__tests__/useTrackSubscription.test.tsx
```

### Backend Tests

#### SQL Integration Tests

Located in: `supabase/migrations/__tests__/`

**Note:** SQL tests require a Supabase connection. They can be run via:
1. Supabase CLI: `supabase db test`
2. Supabase MCP (if configured)
3. Manual execution in Supabase dashboard

**Existing SQL tests:**
- `phase1_foundation.test.sql` - Tests Phase 1 foundation components

### Edge Function Tests

#### `supabase/functions/__tests__/health-check.test.ts`
Tests the health-check Edge Function.

**Run:**
```bash
npm test -- supabase/functions/__tests__/health-check.test.ts
```

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Test Queue System

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:queue-system
      - run: npm run typecheck
      - run: npm run lint:check
```

## Manual Testing Checklist

For manual testing (when feature flag is enabled):

1. **Feature Flag Check**
   - [ ] Verify `use_queue_system` flag is `false` by default
   - [ ] Enable flag in database
   - [ ] Verify frontend respects flag

2. **Subscription Tracking**
   - [ ] Add a card to workspace
   - [ ] Verify Realtime Presence channel is created
   - [ ] Check browser console for subscription logs
   - [ ] Verify `active_subscriptions_v2` table is updated (via `refresh-analytics-from-presence-v2`)

3. **Staleness Check**
   - [ ] Verify background staleness checker runs every minute
   - [ ] Check `api_call_queue_v2` table for queued jobs
   - [ ] Verify jobs are processed by `queue-processor-v2`

4. **Data Refresh**
   - [ ] Verify stale data triggers refresh
   - [ ] Check database for updated `fetched_at` timestamps
   - [ ] Verify frontend receives updated data via Realtime

## Test Coverage Goals

- **Unit Tests:** 80%+ coverage for new code
- **Integration Tests:** All critical paths covered
- **E2E Tests:** Core user flows tested

## Troubleshooting

### Tests Failing

1. **Check Jest configuration:**
   ```bash
   npm test -- --showConfig
   ```

2. **Clear Jest cache:**
   ```bash
   npm test -- --clearCache
   ```

3. **Run tests with verbose output:**
   ```bash
   npm test -- --verbose
   ```

### Mock Issues

If mocks aren't working:
1. Check that `vi.mock()` is called before imports
2. Verify mock functions are reset in `beforeEach`
3. Check that async mocks return Promises

### React Hook Testing Issues

If hook tests fail:
1. Ensure `@testing-library/react` is installed
2. Use `renderHook` from `@testing-library/react`
3. Wrap hooks in a test component if needed

## Next Steps

1. Add E2E tests for full user flow (card add → subscription → refresh)
2. Add SQL integration tests for all queue functions
3. Add performance tests for high-load scenarios
4. Set up CI/CD pipeline with automated test runs

