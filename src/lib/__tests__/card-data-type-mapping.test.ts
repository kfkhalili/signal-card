/**
 * Unit tests for card-data-type-mapping helper
 */

import { describe, it, expect } from '@jest/globals';
import { getDataTypesForCard, getDataTypesForCards } from '../card-data-type-mapping';
import type { CardType } from '@/components/game/cards/base-card/base-card.types';

describe('card-data-type-mapping', () => {
  describe('getDataTypesForCard', () => {
    it('should return correct data types for profile card', () => {
      const result = getDataTypesForCard('profile');
      expect(result).toEqual(['profile']);
    });

    it('should return correct data types for price card', () => {
      const result = getDataTypesForCard('price');
      expect(result).toEqual(['quote']);
    });

    it('should return correct data types for revenue card', () => {
      const result = getDataTypesForCard('revenue');
      expect(result).toEqual(['financial-statements']);
    });

    it('should return correct data types for solvency card', () => {
      const result = getDataTypesForCard('solvency');
      expect(result).toEqual(['financial-statements']);
    });

    it('should return correct data types for cashuse card', () => {
      const result = getDataTypesForCard('cashuse');
      expect(result).toEqual(['financial-statements']);
    });

    it('should return correct data types for keyratios card', () => {
      const result = getDataTypesForCard('keyratios');
      expect(result).toEqual(['ratios-ttm']);
    });

    it('should return correct data types for dividendshistory card', () => {
      const result = getDataTypesForCard('dividendshistory');
      expect(result).toEqual(['dividend-history']);
    });

    it('should return correct data types for revenuebreakdown card', () => {
      const result = getDataTypesForCard('revenuebreakdown');
      expect(result).toEqual(['revenue-product-segmentation']);
    });

    it('should return correct data types for analystgrades card', () => {
      const result = getDataTypesForCard('analystgrades');
      expect(result).toEqual(['grades-historical']);
    });

    it('should return correct data types for exchangevariants card', () => {
      const result = getDataTypesForCard('exchangevariants');
      expect(result).toEqual(['exchange-variants']);
    });

    it('should return empty array for custom card', () => {
      const result = getDataTypesForCard('custom');
      expect(result).toEqual([]);
    });

    it('should return empty array for unknown card type', () => {
      // TypeScript will prevent this, but test runtime behavior
      const result = getDataTypesForCard('unknown' as CardType);
      expect(result).toEqual([]);
    });
  });

  describe('getDataTypesForCards', () => {
    it('should return unique data types for multiple cards', () => {
      const cardTypes: CardType[] = ['profile', 'price', 'revenue'];
      const result = getDataTypesForCards(cardTypes);
      expect(result).toEqual(['profile', 'quote', 'financial-statements']);
    });

    it('should deduplicate data types', () => {
      const cardTypes: CardType[] = ['revenue', 'solvency', 'cashuse'];
      const result = getDataTypesForCards(cardTypes);
      // All three use 'financial-statements', should only appear once
      expect(result).toEqual(['financial-statements']);
    });

    it('should handle empty array', () => {
      const result = getDataTypesForCards([]);
      expect(result).toEqual([]);
    });

    it('should handle cards with no data types', () => {
      const cardTypes: CardType[] = ['custom', 'profile'];
      const result = getDataTypesForCards(cardTypes);
      expect(result).toEqual(['profile']);
    });
  });
});

