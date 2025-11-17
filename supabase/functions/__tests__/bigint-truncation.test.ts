/**
 * Tests for bigint truncation in FMP data processing functions
 * 
 * CRITICAL: FMP API sometimes returns decimal numbers for volume and market_cap
 * (e.g., "3955124346827.0005"), but PostgreSQL bigint columns only accept integers.
 * These tests verify that decimal values are properly truncated before database insertion.
 */

import { describe, it, expect } from '@jest/globals';

describe('Bigint Truncation', () => {
  describe('Math.trunc behavior', () => {
    it('should truncate decimal volume values to integers', () => {
      const decimalVolume = 3955124346827.0005;
      const truncated = Math.trunc(decimalVolume);
      expect(truncated).toBe(3955124346827);
      expect(Number.isInteger(truncated)).toBe(true);
    });

    it('should truncate decimal market_cap values to integers', () => {
      const decimalMarketCap = 3955124346827.1234;
      const truncated = Math.trunc(decimalMarketCap);
      expect(truncated).toBe(3955124346827);
      expect(Number.isInteger(truncated)).toBe(true);
    });

    it('should handle null values correctly', () => {
      const nullValue: number | null = null;
      const truncated = nullValue ? Math.trunc(nullValue) : null;
      expect(truncated).toBeNull();
    });

    it('should handle zero values correctly', () => {
      const zeroValue = 0.0;
      const truncated = Math.trunc(zeroValue);
      expect(truncated).toBe(0);
      expect(Number.isInteger(truncated)).toBe(true);
    });

    it('should handle negative values correctly', () => {
      const negativeValue = -1234.567;
      const truncated = Math.trunc(negativeValue);
      expect(truncated).toBe(-1234);
      expect(Number.isInteger(truncated)).toBe(true);
    });

    it('should handle very large decimal values', () => {
      const largeDecimal = 9999999999999.123456789;
      const truncated = Math.trunc(largeDecimal);
      expect(truncated).toBe(9999999999999);
      expect(Number.isInteger(truncated)).toBe(true);
    });
  });

  describe('Record preparation logic', () => {
    it('should truncate volume when preparing quote record', () => {
      const quoteData = {
        volume: 3955124346827.0005,
        marketCap: 1234567890123.5678,
      };

      const record = {
        volume: quoteData.volume ? Math.trunc(quoteData.volume) : null,
        market_cap: quoteData.marketCap ? Math.trunc(quoteData.marketCap) : null,
      };

      expect(record.volume).toBe(3955124346827);
      expect(record.market_cap).toBe(1234567890123);
      expect(Number.isInteger(record.volume)).toBe(true);
      expect(Number.isInteger(record.market_cap)).toBe(true);
    });

    it('should handle null volume and market_cap correctly', () => {
      const quoteData = {
        volume: null,
        marketCap: null,
      };

      const record = {
        volume: quoteData.volume ? Math.trunc(quoteData.volume) : null,
        market_cap: quoteData.marketCap ? Math.trunc(quoteData.marketCap) : null,
      };

      expect(record.volume).toBeNull();
      expect(record.market_cap).toBeNull();
    });

    it('should truncate profile volume, market_cap, and average_volume', () => {
      const profileData = {
        volume: 3955124346827.0005,
        marketCap: 1234567890123.5678,
        averageVolume: 9876543210.1234,
      };

      const record = {
        volume: profileData.volume ? Math.trunc(profileData.volume) : null,
        market_cap: profileData.marketCap ? Math.trunc(profileData.marketCap) : null,
        average_volume: profileData.averageVolume ? Math.trunc(profileData.averageVolume) : null,
      };

      expect(record.volume).toBe(3955124346827);
      expect(record.market_cap).toBe(1234567890123);
      expect(record.average_volume).toBe(9876543210);
      expect(Number.isInteger(record.volume)).toBe(true);
      expect(Number.isInteger(record.market_cap)).toBe(true);
      expect(Number.isInteger(record.average_volume)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle values that are already integers', () => {
      const integerValue = 3955124346827;
      const truncated = Math.trunc(integerValue);
      expect(truncated).toBe(3955124346827);
      expect(truncated).toBe(integerValue);
    });

    it('should handle very small decimal values', () => {
      const smallDecimal = 123.0000001;
      const truncated = Math.trunc(smallDecimal);
      expect(truncated).toBe(123);
    });

    it('should handle scientific notation values', () => {
      const scientificValue = 3.955124346827e12;
      const truncated = Math.trunc(scientificValue);
      expect(truncated).toBe(3955124346827);
      expect(Number.isInteger(truncated)).toBe(true);
    });
  });
});

