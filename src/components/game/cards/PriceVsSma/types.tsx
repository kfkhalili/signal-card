import type { BaseGameCard, CardBackData } from "../../types"; // Adjust path as needed

export interface PriceVsSmaSignal extends BaseGameCard {
  type: "price_vs_sma";
  discoveredAt: Date;
  currentPrice: number;
  smaValue: number;
  smaPeriod: 20 | 50 | 100 | 200;
  priceRelation: "above" | "below" | "at";
  // backData is inherited from BaseGameCard
}

// The React component for displaying this card (e.g., PriceVsSmaSignalDisplay)
// would also go in this file.
