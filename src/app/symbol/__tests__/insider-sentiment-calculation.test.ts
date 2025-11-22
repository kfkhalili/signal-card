/**
 * Unit tests for insider sentiment calculation logic
 * Tests the net sentiment calculation used for dynamic styling
 */

import { describe, it, expect } from '@jest/globals';
import type { InsiderTradingStatisticsDBRow } from '@/lib/supabase/realtime-service';

describe('Insider Sentiment Calculation', () => {
  // Helper function to simulate the calculation logic from the component
  function calculateInsiderSentiment(
    statistics: InsiderTradingStatisticsDBRow[]
  ): number {
    // Calculate net buy/sell volumes from last 6 months (2 quarters)
    const last6Months = statistics.slice(0, 2);
    const totalAcquiredShares = last6Months.reduce(
      (sum, s) => sum + Number(s.total_acquired || 0),
      0
    );
    const totalDisposedShares = last6Months.reduce(
      (sum, s) => sum + Number(s.total_disposed || 0),
      0
    );

    // Calculate net insider sentiment (shares bought - shares sold)
    return totalAcquiredShares - totalDisposedShares;
  }

  describe('calculateInsiderSentiment', () => {
    it('should return positive value when more shares are bought than sold (bullish)', () => {
      const statistics: InsiderTradingStatisticsDBRow[] = [
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 4,
          total_acquired: 1000000,
          total_disposed: 500000,
          acquired_transactions: 10,
          disposed_transactions: 5,
          acquired_disposed_ratio: 2.0,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 3,
          total_acquired: 500000,
          total_disposed: 200000,
          acquired_transactions: 5,
          disposed_transactions: 2,
          acquired_disposed_ratio: 2.5,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
      ];

      const netSentiment = calculateInsiderSentiment(statistics);
      expect(netSentiment).toBe(800000); // (1000000 + 500000) - (500000 + 200000) = 800000
      expect(netSentiment).toBeGreaterThan(0); // Bullish
    });

    it('should return negative value when more shares are sold than bought (bearish)', () => {
      const statistics: InsiderTradingStatisticsDBRow[] = [
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 4,
          total_acquired: 500000,
          total_disposed: 1000000,
          acquired_transactions: 5,
          disposed_transactions: 10,
          acquired_disposed_ratio: 0.5,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 3,
          total_acquired: 200000,
          total_disposed: 500000,
          acquired_transactions: 2,
          disposed_transactions: 5,
          acquired_disposed_ratio: 0.4,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
      ];

      const netSentiment = calculateInsiderSentiment(statistics);
      expect(netSentiment).toBe(-800000); // (500000 + 200000) - (1000000 + 500000) = -800000
      expect(netSentiment).toBeLessThan(0); // Bearish
    });

    it('should return zero when shares bought equal shares sold (neutral)', () => {
      const statistics: InsiderTradingStatisticsDBRow[] = [
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 4,
          total_acquired: 500000,
          total_disposed: 500000,
          acquired_transactions: 5,
          disposed_transactions: 5,
          acquired_disposed_ratio: 1.0,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 3,
          total_acquired: 200000,
          total_disposed: 200000,
          acquired_transactions: 2,
          disposed_transactions: 2,
          acquired_disposed_ratio: 1.0,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
      ];

      const netSentiment = calculateInsiderSentiment(statistics);
      expect(netSentiment).toBe(0); // (500000 + 200000) - (500000 + 200000) = 0
    });

    it('should handle empty statistics array', () => {
      const statistics: InsiderTradingStatisticsDBRow[] = [];
      const netSentiment = calculateInsiderSentiment(statistics);
      expect(netSentiment).toBe(0);
    });

    it('should only use the first 2 quarters (last 6 months)', () => {
      const statistics: InsiderTradingStatisticsDBRow[] = [
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 4,
          total_acquired: 1000000,
          total_disposed: 500000,
          acquired_transactions: 10,
          disposed_transactions: 5,
          acquired_disposed_ratio: 2.0,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 3,
          total_acquired: 500000,
          total_disposed: 200000,
          acquired_transactions: 5,
          disposed_transactions: 2,
          acquired_disposed_ratio: 2.5,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 2,
          total_acquired: 999999,
          total_disposed: 999999,
          acquired_transactions: 10,
          disposed_transactions: 10,
          acquired_disposed_ratio: 1.0,
          average_acquired: 100000,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
      ];

      const netSentiment = calculateInsiderSentiment(statistics);
      // Should only use Q4 and Q3, ignoring Q2
      expect(netSentiment).toBe(800000); // (1000000 + 500000) - (500000 + 200000) = 800000
    });

    it('should handle null values in total_acquired and total_disposed', () => {
      const statistics: InsiderTradingStatisticsDBRow[] = [
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 4,
          total_acquired: null,
          total_disposed: 500000,
          acquired_transactions: 0,
          disposed_transactions: 5,
          acquired_disposed_ratio: 0,
          average_acquired: null,
          average_disposed: 100000,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 3,
          total_acquired: 200000,
          total_disposed: null,
          acquired_transactions: 2,
          disposed_transactions: 0,
          acquired_disposed_ratio: null,
          average_acquired: 100000,
          average_disposed: null,
          total_purchases: 0,
          total_sales: 0,
          fetched_at: new Date().toISOString(),
        },
      ];

      const netSentiment = calculateInsiderSentiment(statistics);
      // null values should be treated as 0
      expect(netSentiment).toBe(-300000); // (0 + 200000) - (500000 + 0) = -300000
    });

    it('should match real AAPL data scenario (bearish)', () => {
      // Based on verified AAPL data: Q4 2025 + Q3 2025
      const statistics: InsiderTradingStatisticsDBRow[] = [
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 4,
          total_acquired: 578243,
          total_disposed: 1113027,
          acquired_transactions: 6,
          disposed_transactions: 33,
          acquired_disposed_ratio: 0.1818,
          average_acquired: 96373.8333,
          average_disposed: 33728.0909,
          total_purchases: 0,
          total_sales: 15,
          fetched_at: new Date().toISOString(),
        },
        {
          symbol: 'AAPL',
          cik: '0000320193',
          year: 2025,
          quarter: 3,
          total_acquired: 391455,
          total_disposed: 125256,
          acquired_transactions: 6,
          disposed_transactions: 3,
          acquired_disposed_ratio: 2.0,
          average_acquired: 65242.5,
          average_disposed: 41752,
          total_purchases: 0,
          total_sales: 2,
          fetched_at: new Date().toISOString(),
        },
      ];

      const netSentiment = calculateInsiderSentiment(statistics);
      // 969698 - 1238283 = -268585 (bearish)
      expect(netSentiment).toBe(-268585);
      expect(netSentiment).toBeLessThan(0); // Should be bearish
    });
  });
});

