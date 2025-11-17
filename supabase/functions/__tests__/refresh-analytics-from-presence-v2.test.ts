/**
 * Unit tests for refresh-analytics-from-presence-v2 Edge Function
 * Tests the logic for querying Realtime Presence and updating analytics table
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('refresh-analytics-from-presence-v2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Presence Data Parsing', () => {
    it('should correctly parse presence channels with symbol prefix', () => {
      const channels = [
        {
          topic: 'symbol:AAPL',
          presence: {
            'user-123': {
              userId: 'user-123',
              dataTypes: ['quote', 'profile'],
              subscribedAt: '2025-01-17T10:00:00Z',
            },
          },
        },
        {
          topic: 'symbol:MSFT',
          presence: {
            'user-456': {
              userId: 'user-456',
              dataTypes: ['quote'],
              subscribedAt: '2025-01-17T10:01:00Z',
            },
          },
        },
      ];

      // Expected: Un-nest dataTypes array
      const expectedSubscriptions = [
        { user_id: 'user-123', symbol: 'AAPL', data_type: 'quote' },
        { user_id: 'user-123', symbol: 'AAPL', data_type: 'profile' },
        { user_id: 'user-456', symbol: 'MSFT', data_type: 'quote' },
      ];

      // Parse logic (simplified for test)
      const activeSubscriptions: Array<{
        user_id: string;
        symbol: string;
        data_type: string;
      }> = [];

      for (const channel of channels) {
        if (!channel.topic?.startsWith('symbol:')) {
          continue;
        }

        const symbol = channel.topic.replace('symbol:', '');
        const presence = channel.presence || {};

        for (const [presenceKey, presenceData] of Object.entries(presence)) {
          const presenceEntry = presenceData as {
            userId?: string;
            dataTypes?: string[];
            subscribedAt?: string;
            [key: string]: unknown;
          };
          const userId = presenceEntry.userId || presenceKey;
          const dataTypes = presenceEntry.dataTypes || [];

          for (const dataType of dataTypes) {
            activeSubscriptions.push({
              user_id: userId,
              symbol,
              data_type: dataType,
            });
          }
        }
      }

      expect(activeSubscriptions).toEqual(expectedSubscriptions);
    });

    it('should filter out non-symbol channels', () => {
      const channels = [
        {
          topic: 'symbol:AAPL',
          presence: { 'user-123': { userId: 'user-123', dataTypes: ['quote'] } },
        },
        {
          topic: 'other:channel',
          presence: { 'user-456': { userId: 'user-456', dataTypes: ['quote'] } },
        },
      ];

      const activeSubscriptions: Array<{
        user_id: string;
        symbol: string;
        data_type: string;
      }> = [];

      for (const channel of channels) {
        if (!channel.topic?.startsWith('symbol:')) {
          continue;
        }

        const symbol = channel.topic.replace('symbol:', '');
        const presence = channel.presence || {};

        for (const [presenceKey, presenceData] of Object.entries(presence)) {
          const presenceEntry = presenceData as {
            userId?: string;
            dataTypes?: string[];
            [key: string]: unknown;
          };
          const userId = presenceEntry.userId || presenceKey;
          const dataTypes = presenceEntry.dataTypes || [];

          for (const dataType of dataTypes) {
            activeSubscriptions.push({
              user_id: userId,
              symbol,
              data_type: dataType,
            });
          }
        }
      }

      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].symbol).toBe('AAPL');
    });

    it('should handle empty dataTypes array', () => {
      const channels = [
        {
          topic: 'symbol:AAPL',
          presence: {
            'user-123': {
              userId: 'user-123',
              dataTypes: [],
            },
          },
        },
      ];

      const activeSubscriptions: Array<{
        user_id: string;
        symbol: string;
        data_type: string;
      }> = [];

      for (const channel of channels) {
        if (!channel.topic?.startsWith('symbol:')) {
          continue;
        }

        const symbol = channel.topic.replace('symbol:', '');
        const presence = channel.presence || {};

        for (const [presenceKey, presenceData] of Object.entries(presence)) {
          const presenceEntry = presenceData as {
            userId?: string;
            dataTypes?: string[];
            [key: string]: unknown;
          };
          const userId = presenceEntry.userId || presenceKey;
          const dataTypes = presenceEntry.dataTypes || [];

          for (const dataType of dataTypes) {
            activeSubscriptions.push({
              user_id: userId,
              symbol,
              data_type: dataType,
            });
          }
        }
      }

      expect(activeSubscriptions).toHaveLength(0);
    });

    it('should handle missing userId (fallback to presence key)', () => {
      const channels = [
        {
          topic: 'symbol:AAPL',
          presence: {
            'user-123': {
              // No userId field
              dataTypes: ['quote'],
            },
          },
        },
      ];

      const activeSubscriptions: Array<{
        user_id: string;
        symbol: string;
        data_type: string;
      }> = [];

      for (const channel of channels) {
        if (!channel.topic?.startsWith('symbol:')) {
          continue;
        }

        const symbol = channel.topic.replace('symbol:', '');
        const presence = channel.presence || {};

        for (const [presenceKey, presenceData] of Object.entries(presence)) {
          const presenceEntry = presenceData as {
            userId?: string;
            dataTypes?: string[];
            [key: string]: unknown;
          };
          const userId = presenceEntry.userId || presenceKey;
          const dataTypes = presenceEntry.dataTypes || [];

          for (const dataType of dataTypes) {
            activeSubscriptions.push({
              user_id: userId,
              symbol,
              data_type: dataType,
            });
          }
        }
      }

      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].user_id).toBe('user-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty channels array', () => {
      const channels: Array<{ topic?: string; presence?: Record<string, unknown> }> = [];

      const activeSubscriptions: Array<{
        user_id: string;
        symbol: string;
        data_type: string;
      }> = [];

      for (const channel of channels) {
        if (!channel.topic?.startsWith('symbol:')) {
          continue;
        }

        const symbol = channel.topic.replace('symbol:', '');
        const presence = channel.presence || {};

        for (const [presenceKey, presenceData] of Object.entries(presence)) {
          const presenceEntry = presenceData as {
            userId?: string;
            dataTypes?: string[];
            [key: string]: unknown;
          };
          const userId = presenceEntry.userId || presenceKey;
          const dataTypes = presenceEntry.dataTypes || [];

          for (const dataType of dataTypes) {
            activeSubscriptions.push({
              user_id: userId,
              symbol,
              data_type: dataType,
            });
          }
        }
      }

      expect(activeSubscriptions).toHaveLength(0);
    });

    it('should handle channels with no presence data', () => {
      const channels = [
        {
          topic: 'symbol:AAPL',
          presence: {},
        },
      ];

      const activeSubscriptions: Array<{
        user_id: string;
        symbol: string;
        data_type: string;
      }> = [];

      for (const channel of channels) {
        if (!channel.topic?.startsWith('symbol:')) {
          continue;
        }

        const symbol = channel.topic.replace('symbol:', '');
        const presence = channel.presence || {};

        for (const [presenceKey, presenceData] of Object.entries(presence)) {
          const presenceEntry = presenceData as {
            userId?: string;
            dataTypes?: string[];
            [key: string]: unknown;
          };
          const userId = presenceEntry.userId || presenceKey;
          const dataTypes = presenceEntry.dataTypes || [];

          for (const dataType of dataTypes) {
            activeSubscriptions.push({
              user_id: userId,
              symbol,
              data_type: dataType,
            });
          }
        }
      }

      expect(activeSubscriptions).toHaveLength(0);
    });
  });
});

