# Testing Workflow for Refactoring

## Quick Start

This guide shows you how to safely refactor code by writing tests first.

## Step-by-Step Process

### 1. Choose a File to Refactor

**Note:** All initial refactoring tasks from `CODEBASE-ISSUES.md` have been completed. Use this workflow for future refactoring work.

Example files that were refactored (now complete):
- ✅ `src/lib/feature-flags.ts` (Completed)
- ✅ `src/hooks/useStockData.ts` (Completed)
- ✅ `src/lib/supabase/realtime-service.ts` (Completed)

### 2. Create Test File

```bash
# For feature-flags.ts
touch src/lib/__tests__/feature-flags.refactor.test.ts

# For useStockData.ts
touch src/hooks/__tests__/useStockData.refactor.test.tsx
```

### 3. Write Tests for CURRENT Behavior

**Important**: Write tests that capture how the code works NOW, not how you want it to work.

Example:
```typescript
// Test current behavior (returns boolean)
it('should return false when client unavailable', async () => {
  const result = await checkFeatureFlag('test');
  expect(result).toBe(false); // Current: boolean
});
```

### 4. Run Tests - Should Pass

```bash
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts
```

✅ All tests should pass with current code.

### 5. Refactor the Code

Now refactor to use Result/Option types:

```typescript
// Before: return boolean
export async function checkFeatureFlag(flagName: string): Promise<boolean> {
  // ...
}

// After: return Result
export async function checkFeatureFlag(flagName: string): Promise<Result<boolean, Error>> {
  // ...
}
```

### 6. Update Tests to Match New Behavior

```typescript
// Update test to use Result assertions
it('should return Ok(false) when client unavailable', async () => {
  const result = await checkFeatureFlag('test');
  expect(result.isOk()).toBe(true);
  if (result.isOk()) {
    expect(result.value).toBe(false);
  }
});
```

### 7. Run Tests Again - Should Still Pass

```bash
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts
```

✅ All tests should pass with refactored code.

### 8. Run Full Test Suite

```bash
npm test
```

✅ No regressions in other tests.

### 9. Manual Testing

```bash
npm run dev
```

Visit the app and manually verify the feature still works.

### 10. Commit

```bash
git add .
git commit -m "refactor(feature-flags): convert to Result types

- Convert checkFeatureFlag to return Result<boolean, Error>
- Add comprehensive tests
- Maintain backward compatibility"
```

## Example: Complete Refactoring Session

### Target: `src/lib/feature-flags.ts`

```bash
# 1. Create test file
touch src/lib/__tests__/feature-flags.refactor.test.ts

# 2. Copy example test from REFACTORING-TEST-STRATEGY.md
# (or use the provided example test file)

# 3. Run tests - should pass
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts

# 4. Refactor feature-flags.ts
# (Edit the file to use Result types)

# 5. Update tests to use Result assertions
# (Edit the test file)

# 6. Run tests - should still pass
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts

# 7. Run full suite
npm test

# 8. Check coverage
npm run test:coverage

# 9. Manual test
npm run dev
# Visit page that uses feature flags

# 10. Commit
git add .
git commit -m "refactor: convert feature-flags to Result types"
```

## Test Commands Reference

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/__tests__/feature-flags.refactor.test.ts

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Troubleshooting

### Tests Fail After Refactoring

1. **Check the error message** - What specifically failed?
2. **Compare before/after** - Did behavior change unintentionally?
3. **Check mocks** - Are mocks set up correctly?
4. **Verify imports** - Are Result/Option types imported?

### Tests Pass But App Breaks

1. **Check integration** - Are all call sites updated?
2. **Type checking** - Run `npm run typecheck`
3. **Manual testing** - Test in browser
4. **Check console** - Any runtime errors?

### Can't Write Tests

1. **Start simple** - Test one function at a time
2. **Use examples** - Copy from provided test files
3. **Mock dependencies** - Mock Supabase, contexts, etc.
4. **Ask for help** - Review with team

## Best Practices

1. ✅ **One file at a time** - Don't refactor multiple files simultaneously
2. ✅ **Small changes** - Make incremental improvements
3. ✅ **Test first** - Write tests before refactoring
4. ✅ **Run tests often** - After each small change
5. ✅ **Keep tests passing** - Never commit failing tests
6. ✅ **Update call sites** - Update all places that use refactored code
7. ✅ **Type check** - Run `npm run typecheck` before committing

## Next Steps (For Future Refactoring)

**Note:** All initial refactoring tasks are complete. Use this workflow for future refactoring work.

1. Identify files that need refactoring
2. Start with simpler files first
3. Follow the workflow above
4. Move to next file when current one is complete

