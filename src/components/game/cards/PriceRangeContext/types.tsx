import type { BaseGameCard, CardBackData } from "../../types"; // Adjust path as needed

export interface PriceRangeContextSignal extends BaseGameCard {
  type: "price_range_context";
  discoveredAt: Date;
  currentPrice: number;
  dayHigh: number | null;
  dayLow: number | null;
  // backData is inherited from BaseGameCard
}

// The React component for displaying this card (e.g., PriceRangeContextSignalDisplay)
// would also go in this file.
