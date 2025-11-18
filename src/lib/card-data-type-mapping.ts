// src/lib/card-data-type-mapping.ts
// Maps card types to their required data types for queue system

import type { CardType } from '@/components/game/cards/base-card/base-card.types';

/**
 * Maps a card type to the data types it requires from the database
 *
 * This is used by useTrackSubscription to determine which data types
 * to track for a given card.
 *
 * CRITICAL: These data types must match the data_type values in
 * data_type_registry_v2 table.
 *
 * NOTE: This mapping is based on the database tables each card type uses:
 * - profile: profiles table (primary), live_quote_indicators (price/market cap),
 *   financial_statements (revenue), ratios_ttm (EPS, P/E, P/B)
 * - price: live_quote_indicators table
 * - revenue/solvency/cashuse: financial_statements table
 * - keyratios: ratios_ttm table
 * - dividendshistory: dividend_history table
 * - revenuebreakdown: revenue_product_segmentation table
 * - analystgrades: grades_historical table
 * - exchangevariants: exchange_variants table
 */
export function getDataTypesForCard(cardType: CardType): string[] {
  const mapping: Record<CardType, string[]> = {
    'profile': ['profile', 'quote', 'financial-statements', 'ratios-ttm'], // Profile card uses multiple tables
    'price': ['quote'], // live_quote_indicators table
    'revenue': ['financial-statements'],
    'solvency': ['financial-statements'],
    'cashuse': ['financial-statements'],
    'keyratios': ['ratios-ttm'],
    'dividendshistory': ['dividend-history'],
    'revenuebreakdown': ['revenue-product-segmentation'],
    'analystgrades': ['grades-historical'],
    'exchangevariants': ['exchange-variants'],
    'custom': [], // Custom cards don't have specific data types
  };

  return mapping[cardType] || [];
}

/**
 * Gets all unique data types for an array of cards
 */
export function getDataTypesForCards(cardTypes: CardType[]): string[] {
  const allDataTypes = cardTypes.flatMap(getDataTypesForCard);
  return Array.from(new Set(allDataTypes)); // Remove duplicates
}

