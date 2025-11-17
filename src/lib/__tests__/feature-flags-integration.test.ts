/**
 * Integration tests for feature-flags helper
 * Tests the actual checkFeatureFlag function with mocked Supabase client
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { checkFeatureFlag } from '../feature-flags';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

// Mock createSupabaseBrowserClient
// Mock createSupabaseBrowserClient
const mockCreateSupabaseBrowserClient = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: mockCreateSupabaseBrowserClient,
}));

describe('feature-flags integration', () => {
  let mockSupabase: Partial<SupabaseClient<Database>>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn(),
          }),
        }),
      }),
    };

    // Mock the createSupabaseBrowserClient function
    mockCreateSupabaseBrowserClient.mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkFeatureFlag', () => {
    it('should return true when flag is enabled', async () => {
      // Mock successful response with enabled flag
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { is_enabled: true },
        error: null,
      });

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await checkFeatureFlag('use_queue_system');
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('feature_flags');
    });

    it('should return false when flag is disabled', async () => {
      // Mock successful response with disabled flag
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { is_enabled: false },
        error: null,
      });

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await checkFeatureFlag('use_queue_system');
      expect(result).toBe(false);
    });

    it('should return false when flag does not exist', async () => {
      // Mock response with null data (flag doesn't exist)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await checkFeatureFlag('non_existent_flag');
      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      // Mock error response
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await checkFeatureFlag('use_queue_system');
      expect(result).toBe(false); // Fail-safe: default to disabled
    });

    it('should return false when Supabase client is unavailable', async () => {
      // Mock unavailable client
      mockCreateSupabaseBrowserClient.mockReturnValue(null);

      const result = await checkFeatureFlag('use_queue_system');
      expect(result).toBe(false); // Fail-safe: default to disabled
    });

    it('should handle exceptions gracefully', async () => {
      // Mock exception
      const mockMaybeSingle = vi.fn().mockRejectedValue(new Error('Network error'));

      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await checkFeatureFlag('use_queue_system');
      expect(result).toBe(false); // Fail-safe: default to disabled
    });
  });
});

