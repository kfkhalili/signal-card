# Refactoring Test Strategy

## Overview

This document outlines the testing strategy to protect the codebase during refactoring to comply with cursor rules. We'll use **Test-Driven Refactoring (TDR)** - writing tests first to capture current behavior, then refactoring with confidence.

## Testing Philosophy

1. **Write tests BEFORE refactoring** - Capture current behavior
2. **Run tests after each change** - Ensure nothing breaks
3. **Incremental changes** - One file/function at a time
4. **Regression protection** - Tests prevent future breaks

## Test Infrastructure

Your project already has:
- ✅ **Jest** for unit tests (`npm test`)
- ✅ **Playwright** for E2E tests (`npm run test:e2e`)
- ✅ **Test coverage** reporting (`npm run test:coverage`)
- ✅ **Watch mode** for development (`npm run test:watch`)

## Testing Strategy by Refactoring Type

### 1. Converting `useState<... | null>` to `Option<T>`

#### Test Strategy:
- Test that state transitions work correctly
- Test that Option.none() renders correctly
- Test that Option.some(value) renders correctly
- Test edge cases (empty states, loading states)

#### Example Test Template:
```typescript
// src/hooks/__tests__/useStockData.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useStockData } from '../useStockData';
import { Option } from 'effect';

describe('useStockData with Option types', () => {
  it('should initialize with Option.none() for market status', () => {
    const { result } = renderHook(() => useStockData({ symbol: 'AAPL' }));

    // Before: expect(result.current.marketStatusMessage).toBeNull();
    // After:
    expect(Option.isNone(result.current.marketStatusMessage)).toBe(true);
  });

  it('should update to Option.some() when data arrives', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useStockData({ symbol: 'AAPL' })
    );

    // Simulate data arrival
    await waitForNextUpdate();

    // After refactoring:
    expect(Option.isSome(result.current.marketStatusMessage)).toBe(true);
    if (Option.isSome(result.current.marketStatusMessage)) {
      expect(result.current.marketStatusMessage.value).toBeTruthy();
    }
  });
});
```

### 2. Converting Supabase Queries to Result Types

#### Test Strategy:
- Test successful queries return `Ok(value)`
- Test error cases return `Err(error)`
- Test that error handling works correctly
- Mock Supabase client responses

#### Example Test Template:
```typescript
// src/lib/__tests__/feature-flags.test.ts
import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { checkFeatureFlag } from '../feature-flags';
import { fromPromise } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = (shouldError = false) => {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            if (shouldError) {
              return { data: null, error: { message: 'Database error' } };
            }
            return { data: { enabled: true }, error: null };
          }),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
};

describe('checkFeatureFlag with Result types', () => {
  it('should return Ok(true) when flag is enabled', async () => {
    // After refactoring, this should return Result<boolean, Error>
    const result = await checkFeatureFlag('test_flag');

    // Before: expect(result).toBe(true);
    // After:
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(true);
    }
  });

  it('should return Err when query fails', async () => {
    // Mock error case
    const result = await checkFeatureFlag('test_flag');

    // After refactoring:
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('error');
    }
  });
});
```

### 3. Converting `.catch()` to Result Types

#### Test Strategy:
- Test that errors are properly converted to Result
- Test that cleanup still happens on errors
- Test that multiple error scenarios are handled

#### Example Test Template:
```typescript
// src/lib/__tests__/realtime-service.test.ts
import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { subscribeToLiveQuoteUpdates } from '../supabase/realtime-service';
import { fromPromise } from 'neverthrow';

describe('realtime-service with Result types', () => {
  it('should handle channel removal errors with Result', async () => {
    const mockSupabase = {
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn((callback) => {
            callback('SUBSCRIBED');
            return { unsubscribe: vi.fn() };
          }),
        })),
        topic: 'test-channel',
      })),
      removeChannel: vi.fn(() => Promise.reject(new Error('Remove failed'))),
    };

    const unsubscribe = subscribeToLiveQuoteUpdates(
      'AAPL',
      vi.fn(),
      vi.fn()
    );

    // After refactoring, cleanup should use Result
    // Test that cleanup doesn't throw
    expect(() => unsubscribe()).not.toThrow();

    // Verify removeChannel was called (even if it fails)
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});
```

### 4. Converting `throw` to Result Types

#### Test Strategy:
- Test that functions return Result instead of throwing
- Test error cases return Err
- Test success cases return Ok

#### Example Test Template:
```typescript
// src/stores/__tests__/compassStore.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { useLeaderboardStore } from '../compassStore';
import { fromPromise } from 'neverthrow';

describe('compassStore with Result types', () => {
  it('should return Result instead of throwing', async () => {
    const store = useLeaderboardStore.getState();
    const mockSupabase = {
      rpc: vi.fn(async () => ({
        data: [{ symbol: 'AAPL', rank: 1, composite_score: 0.9 }],
        error: null,
      })),
    };

    // After refactoring, fetchLeaderboard should return Promise<Result<void, Error>>
    const result = await store.actions.fetchLeaderboard(mockSupabase);

    // Before: expect(() => ...).not.toThrow();
    // After:
    expect(result.isOk()).toBe(true);
  });

  it('should return Err when RPC fails', async () => {
    const store = useLeaderboardStore.getState();
    const mockSupabase = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'RPC failed' },
      })),
    };

    const result = await store.actions.fetchLeaderboard(mockSupabase);

    // After refactoring:
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('RPC failed');
    }
  });
});
```

## Test Execution Workflow

### Step 1: Create Baseline Tests
```bash
# Run existing tests to establish baseline
npm test

# Check current coverage
npm run test:coverage
```

### Step 2: Write Tests for Target File
```bash
# Create test file for the file you're about to refactor
touch src/lib/__tests__/feature-flags.test.ts

# Write tests that capture CURRENT behavior
# (These tests should pass with current implementation)
```

### Step 3: Refactor Incrementally
```bash
# Make small changes, run tests after each change
npm test -- --watch src/lib/__tests__/feature-flags.test.ts
```

### Step 4: Verify All Tests Pass
```bash
# Run full test suite
npm test

# Check coverage hasn't decreased
npm run test:coverage
```

## Test File Organization

### Structure:
```
src/
├── lib/
│   ├── feature-flags.ts          # Source file
│   └── __tests__/
│       └── feature-flags.test.ts # Tests for feature-flags.ts
├── hooks/
│   ├── useStockData.ts           # Source file
│   └── __tests__/
│       └── useStockData.test.tsx # Tests for useStockData.ts
```

## Mocking Strategy

### Mock Supabase Client:
```typescript
// src/lib/__tests__/mocks/supabase.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export function createMockSupabaseClient(
  responses: Record<string, any> = {}
): Partial<SupabaseClient<Database>> {
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          maybeSingle: async () => responses[`${table}.${column}=${value}`] || {
            data: null,
            error: null,
          },
          single: async () => responses[`${table}.${column}=${value}`] || {
            data: null,
            error: null,
          },
        }),
      }),
    }),
    rpc: async (functionName: string, args?: any) => {
      const key = `rpc.${functionName}`;
      return responses[key] || { data: null, error: null };
    },
  } as any;
}
```

## Integration Tests

### Test Real Supabase Queries (Optional):
```typescript
// src/lib/__tests__/feature-flags.integration.test.ts
import { describe, it, expect } from '@jest/globals';
import { checkFeatureFlag } from '../feature-flags';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

describe('checkFeatureFlag Integration', () => {
  it('should work with real Supabase client', async () => {
    // Only run if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return; // Skip if not configured
    }

    const result = await checkFeatureFlag('use_queue_system');

    // After refactoring:
    expect(result.isOk() || result.isErr()).toBe(true);
  });
});
```

## E2E Tests for Critical Flows

### Test User-Facing Behavior:
```typescript
// e2e/workspace-flow.spec.ts
import { test, expect } from '@playwright/test';

test('workspace should load and display cards', async ({ page }) => {
  await page.goto('/workspace');

  // Test that cards render (regardless of internal implementation)
  await expect(page.locator('[data-testid="card"]')).toBeVisible();

  // Test that adding a card works
  await page.click('[data-testid="add-card-button"]');
  await page.fill('[data-testid="symbol-input"]', 'AAPL');
  await page.click('[data-testid="add-profile-card"]');

  // Verify card appears
  await expect(page.locator('[data-testid="card-AAPL"]')).toBeVisible();
});
```

## Test Checklist for Each Refactoring

- [ ] Write tests for current behavior (should pass)
- [ ] Refactor code to use Result/Option types
- [ ] Update tests to use Result/Option assertions
- [ ] Run tests - all should pass
- [ ] Run full test suite - no regressions
- [ ] Check test coverage - should maintain or improve
- [ ] Run E2E tests - user flows should work
- [ ] Manual testing - verify in browser

## Running Tests

### During Development:
```bash
# Watch mode - runs tests on file changes
npm run test:watch

# Run specific test file
npm test -- src/lib/__tests__/feature-flags.test.ts

# Run tests matching pattern
npm test -- feature-flags
```

### Before Committing:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Continuous Integration

### Pre-commit Hook (Recommended):
Add to `.husky/pre-commit`:
```bash
#!/bin/sh
npm test
npm run typecheck
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for refactored code
- **Integration Tests**: All critical paths
- **E2E Tests**: Core user flows

## Next Steps

1. **Create test files** for high-priority refactoring targets
2. **Write baseline tests** that capture current behavior
3. **Refactor incrementally** - one file at a time
4. **Run tests after each change** - ensure nothing breaks
5. **Update tests** to use Result/Option assertions
6. **Verify coverage** - maintain or improve

## Example: Complete Refactoring Workflow

### 1. Target: `src/lib/feature-flags.ts`

```bash
# Step 1: Create test file
touch src/lib/__tests__/feature-flags.refactor.test.ts

# Step 2: Write tests for current behavior
# (See example above)

# Step 3: Run tests - should pass with current code
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts

# Step 4: Refactor feature-flags.ts to use Result types

# Step 5: Update tests to use Result assertions

# Step 6: Run tests - should still pass
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts

# Step 7: Run full suite - no regressions
npm test

# Step 8: Manual test in browser
npm run dev
# Visit page that uses feature flags, verify it works
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [Effect Documentation](https://effect.website/docs/guides/essentials/option)

