import type { BaseGameCard, CardBackData } from "@/components/game/types";

export interface DailyPerformanceCard extends BaseGameCard {
  type: "daily_performance";
  discoveredAt: Date;
  currentPrice: number;
  previousClose: number;
  changePercentage: number;
  dayChange: number;
  // backData is inherited from BaseGameCard and should conform to CardBackData
}

// The React component for displaying this card (e.g., DailyPerformanceSignalDisplay)
// would also go in this file (or a .tsx file in this directory).
