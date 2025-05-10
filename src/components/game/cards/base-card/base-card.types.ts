/**
 * src/app/components/game/cards/base-card/base-card.types.ts
 * This file contains the base types and interfaces for the cards used in the game.
 * It defines the structure and common properties that all cards should have,
 * ensuring consistency across different card types.
 */

// Defines the possible literal types for any card in the game.
export type CardType =
  | "price" // For the main live price card
  | "daily_performance"
  | "price_vs_sma"
  | "price_range_context"
  | "intraday_trend"
  | "price_snapshot"
  | "trend"; // For a generic trend card, if used

// Base interface for the data shown on the back of any card.
// At a minimum, every card's back face should have an explanation.
export interface CardBackData {
  explanation: string;
}

// The most fundamental interface that all specific card types will extend.
export interface BaseCardData {
  id: string;
  type: CardType;
  symbol: string; // All cards will display a symbol.
  backData: CardBackData; // All cards have back data with at least an explanation.
}
