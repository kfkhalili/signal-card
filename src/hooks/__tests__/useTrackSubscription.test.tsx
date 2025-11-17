/**
 * Unit tests for useTrackSubscription hook
 * Tests React hook behavior with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackSubscription } from '../useTrackSubscription';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Mock dependencies
const mockUseAuth = vi.fn();
const mockCheckFeatureFlag = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/feature-flags', () => ({
  checkFeatureFlag: (...args: any[]) => mockCheckFeatureFlag(...args),
}));

describe('useTrackSubscription', () => {
  let mockSupabase: any;
  let mockUser: { id: string };
  let mockChannel: Partial<RealtimeChannel>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock user
    mockUser = { id: 'test-user-id' };

    // Mock channel
    mockChannel = {
      track: vi.fn().mockResolvedValue(undefined),
      untrack: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        // Simulate subscription success
        setTimeout(() => {
          callback('SUBSCRIBED');
        }, 0);
        return Promise.resolve();
      }),
    };

    // Mock Supabase client
    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn().mockResolvedValue(undefined),
      functions: {
        invoke: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    // Mock useAuth
    mockUseAuth.mockReturnValue({
      supabase: mockSupabase,
      user: mockUser,
    });

    // Mock checkFeatureFlag
    mockCheckFeatureFlag.mockResolvedValue(false); // Default: disabled
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Disabled', () => {
    it('should not track subscription when feature flag is disabled', async () => {
      mockCheckFeatureFlag.mockResolvedValue(false);

      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).not.toHaveBeenCalled();
      });

      unmount();
    });
  });

  describe('Feature Flag Enabled', () => {
    beforeEach(() => {
      mockCheckFeatureFlag.mockResolvedValue(true);
    });

    it('should create channel and track presence when enabled', async () => {
      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote', 'profile'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('symbol:AAPL', {
          config: {
            presence: {
              key: 'test-user-id',
            },
          },
        });
      });

      await waitFor(() => {
        expect(mockChannel.track).toHaveBeenCalledWith({
          symbol: 'AAPL',
          dataTypes: ['quote', 'profile'],
          userId: 'test-user-id',
          subscribedAt: expect.any(String),
        });
      });

      unmount();
    });

    it('should call track-subscription-v2 Edge Function on subscribe', async () => {
      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('track-subscription-v2', {
          body: {
            symbol: 'AAPL',
            dataTypes: ['quote'],
            priority: 0,
          },
        });
      });

      unmount();
    });

    it('should handle Edge Function errors silently', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        error: { message: 'Function failed' },
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalled();
      });

      // Should log warning but not throw
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to call track-subscription-v2'),
        expect.anything()
      );

      consoleWarnSpy.mockRestore();
      unmount();
    });

    it('should not track when symbol is empty', async () => {
      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: '',
          dataTypes: ['quote'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).not.toHaveBeenCalled();
      });

      unmount();
    });

    it('should not track when dataTypes is empty', async () => {
      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: [],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).not.toHaveBeenCalled();
      });

      unmount();
    });

    it('should not track when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        supabase: mockSupabase,
        user: null,
      } as any);

      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).not.toHaveBeenCalled();
      });

      unmount();
    });

    it('should cleanup channel on unmount', async () => {
      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote'],
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockChannel.untrack).toHaveBeenCalled();
        expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      });
    });

    it('should respect enabled prop', async () => {
      const { unmount } = renderHook(() =>
        useTrackSubscription({
          symbol: 'AAPL',
          dataTypes: ['quote'],
          enabled: false,
        })
      );

      await waitFor(() => {
        expect(mockSupabase.channel).not.toHaveBeenCalled();
      });

      unmount();
    });
  });
});

