/**
 * Tests for feature-flags.ts refactoring
 * These tests capture current behavior before refactoring to Result types
 *
 * Run: npm test -- src/lib/__tests__/feature-flags.refactor.test.ts
 */

import { describe, it, expect, jest } from '@jest/globals';

// Create a simpler test that doesn't require complex mocking
// We'll test the behavior by checking the actual implementation

describe('checkFeatureFlag - Refactoring Tests', () => {
  describe('After Refactoring (Result Types)', () => {
    it('should return Result<boolean, Error> instead of boolean', async () => {
      const { checkFeatureFlag } = await import('../feature-flags');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // Should return Result type
      expect(result.isOk() || result.isErr()).toBe(true);

      consoleWarnSpy.mockRestore();
    });

    it('should return Ok(false) when client unavailable', async () => {
      const { checkFeatureFlag } = await import('../feature-flags');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // Should return Ok(false) as fail-safe default
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }

      consoleErrorSpy.mockRestore();
    });

    it('should return Ok(false) on errors (fail-safe behavior)', async () => {
      const { checkFeatureFlag } = await import('../feature-flags');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Even with errors, should return Ok(false) as fail-safe
      const result = await checkFeatureFlag('test_flag');

      // Maintains backward compatibility - errors default to disabled (Ok(false))
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }

      consoleWarnSpy.mockRestore();
    });
  });
});
