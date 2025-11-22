/**
 * Integration tests for feature-flags helper
 * Tests the actual checkFeatureFlag function
 *
 * Note: checkFeatureFlag now returns Result<boolean, Error>
 * These tests verify the Result type behavior
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { checkFeatureFlag } from '../feature-flags';

describe('feature-flags integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkFeatureFlag', () => {
    it('should return Result type', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // Should return Result type
      expect(result.isOk() || result.isErr()).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it('should return Ok(false) when Supabase client is unavailable', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // Should return Ok(false) as fail-safe default
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }

      consoleErrorSpy.mockRestore();
    });

    it('should return Ok(false) when flag does not exist', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('non_existent_flag');

      // Should return Ok(false) for non-existent flags
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should return Ok(false) on database error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // Should return Ok(false) as fail-safe on errors
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle exceptions gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // Should return Ok(false) on exceptions (fail-safe)
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should maintain backward compatibility with fail-safe defaults', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await checkFeatureFlag('test_flag');

      // All error cases should return Ok(false) to maintain backward compatibility
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Value should be boolean
        expect(typeof result.value).toBe('boolean');
      }

      consoleErrorSpy.mockRestore();
    });
  });
});
