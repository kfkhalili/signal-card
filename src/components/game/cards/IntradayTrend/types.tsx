import type { BaseGameCard, CardBackData } from "../../types"; // Adjust path as needed

export interface IntradayTrendCard extends BaseGameCard {
  type: "intraday_trend";
  discoveredAt: Date;
  observedTrendDescription: string;
  // backData is inherited from BaseGameCard
}

// The React component for displaying this card (e.g., IntradayTrendSignalDisplay)
// would also go in this file.
