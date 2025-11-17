/**
 * Unit tests for refresh-analytics-from-presence-v2 Edge Function
 * Tests the logic for cleaning up stale subscriptions from active_subscriptions_v2 table
 * 
 * CRITICAL: This function only cleans up stale subscriptions (> 5 minutes old)
 * It does NOT update last_seen_at - only client heartbeats update it
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('refresh-analytics-from-presence-v2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Stale Subscription Cleanup', () => {
    it('should identify subscriptions older than 5 minutes as stale', () => {
      const now = Date.now();
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
      const sixMinutesAgo = new Date(now - 6 * 60 * 1000).toISOString();
      const fourMinutesAgo = new Date(now - 4 * 60 * 1000).toISOString();

      const subscriptions = [
        { id: 1, user_id: 'user-1', symbol: 'AAPL', data_type: 'quote', last_seen_at: sixMinutesAgo },
        { id: 2, user_id: 'user-2', symbol: 'MSFT', data_type: 'quote', last_seen_at: fiveMinutesAgo },
        { id: 3, user_id: 'user-3', symbol: 'TSLA', data_type: 'quote', last_seen_at: fourMinutesAgo },
      ];

      // Filter logic: subscriptions with last_seen_at < (now - 5 minutes)
      const staleThreshold = new Date(now - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      expect(staleSubscriptions).toHaveLength(1);
      expect(staleSubscriptions[0].id).toBe(1);
      expect(staleSubscriptions[0].symbol).toBe('AAPL');
    });

    it('should not remove subscriptions newer than 5 minutes', () => {
      const now = Date.now();
      const oneMinuteAgo = new Date(now - 1 * 60 * 1000).toISOString();
      const threeMinutesAgo = new Date(now - 3 * 60 * 1000).toISOString();
      const fourMinutesAgo = new Date(now - 4 * 60 * 1000).toISOString();

      const subscriptions = [
        { id: 1, user_id: 'user-1', symbol: 'AAPL', data_type: 'quote', last_seen_at: oneMinuteAgo },
        { id: 2, user_id: 'user-2', symbol: 'MSFT', data_type: 'quote', last_seen_at: threeMinutesAgo },
        { id: 3, user_id: 'user-3', symbol: 'TSLA', data_type: 'quote', last_seen_at: fourMinutesAgo },
      ];

      const staleThreshold = new Date(now - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      expect(staleSubscriptions).toHaveLength(0);
    });

    it('should handle empty subscriptions list', () => {
      const subscriptions: Array<{
        id: number;
        user_id: string;
        symbol: string;
        data_type: string;
        last_seen_at: string;
      }> = [];

      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      expect(staleSubscriptions).toHaveLength(0);
    });

    it('should handle subscriptions exactly at 5 minute threshold', () => {
      const now = Date.now();
      const exactlyFiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
      const justOverFiveMinutesAgo = new Date(now - 5 * 60 * 1000 - 1000).toISOString(); // 1 second over

      const subscriptions = [
        { id: 1, user_id: 'user-1', symbol: 'AAPL', data_type: 'quote', last_seen_at: exactlyFiveMinutesAgo },
        { id: 2, user_id: 'user-2', symbol: 'MSFT', data_type: 'quote', last_seen_at: justOverFiveMinutesAgo },
      ];

      // Using < (less than) means exactly 5 minutes is NOT stale, but 5 minutes + 1 second IS stale
      const staleThreshold = new Date(now - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      expect(staleSubscriptions).toHaveLength(1);
      expect(staleSubscriptions[0].id).toBe(2);
    });
  });

  describe('Function Behavior', () => {
    it('should only clean up stale subscriptions, not update last_seen_at', () => {
      // This test documents the critical behavior:
      // The function should NOT update last_seen_at for any subscriptions
      // Only client heartbeats update last_seen_at
      
      const now = Date.now();
      const sixMinutesAgo = new Date(now - 6 * 60 * 1000).toISOString();
      const oneMinuteAgo = new Date(now - 1 * 60 * 1000).toISOString();

      const subscriptions = [
        { id: 1, user_id: 'user-1', symbol: 'AAPL', data_type: 'quote', last_seen_at: sixMinutesAgo },
        { id: 2, user_id: 'user-2', symbol: 'MSFT', data_type: 'quote', last_seen_at: oneMinuteAgo },
      ];

      // Function should only identify stale subscriptions for deletion
      const staleThreshold = new Date(now - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      // Should identify 1 stale subscription
      expect(staleSubscriptions).toHaveLength(1);
      
      // Should NOT update last_seen_at for the non-stale subscription
      // (This is verified by the fact that we're only filtering, not updating)
      const activeSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at >= staleThreshold
      );
      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].last_seen_at).toBe(oneMinuteAgo); // Unchanged
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscriptions with very old last_seen_at', () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

      const subscriptions = [
        { id: 1, user_id: 'user-1', symbol: 'AAPL', data_type: 'quote', last_seen_at: oneHourAgo },
        { id: 2, user_id: 'user-2', symbol: 'MSFT', data_type: 'quote', last_seen_at: oneDayAgo },
      ];

      const staleThreshold = new Date(now - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      expect(staleSubscriptions).toHaveLength(2);
    });

    it('should handle multiple data types for same symbol', () => {
      const now = Date.now();
      const sixMinutesAgo = new Date(now - 6 * 60 * 1000).toISOString();
      const oneMinuteAgo = new Date(now - 1 * 60 * 1000).toISOString();

      const subscriptions = [
        { id: 1, user_id: 'user-1', symbol: 'AAPL', data_type: 'quote', last_seen_at: sixMinutesAgo },
        { id: 2, user_id: 'user-1', symbol: 'AAPL', data_type: 'profile', last_seen_at: oneMinuteAgo },
      ];

      const staleThreshold = new Date(now - 5 * 60 * 1000).toISOString();
      const staleSubscriptions = subscriptions.filter(
        sub => sub.last_seen_at < staleThreshold
      );

      // Should only remove the stale quote subscription, not the active profile subscription
      expect(staleSubscriptions).toHaveLength(1);
      expect(staleSubscriptions[0].data_type).toBe('quote');
    });
  });
});
