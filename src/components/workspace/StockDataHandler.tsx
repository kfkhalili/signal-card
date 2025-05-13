// src/components/workspace/StockDataHandler.tsx
"use client";

import React, { useEffect } from "react";
import {
  useStockData,
  type CombinedQuoteData,
  type MarketStatusDisplayHook,
  type ProfileDBRow,
} from "@/hooks/useStockData";

interface StockDataHandlerProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: CombinedQuoteData,
    source: "fetch" | "realtime"
  ) => void;
  onStaticProfileUpdate: (updatedProfile: ProfileDBRow) => void;
  onMarketStatusChange?: (
    symbol: string,
    status: MarketStatusDisplayHook,
    message: string | null,
    timestamp: number | null
  ) => void;
}

export const StockDataHandler: React.FC<StockDataHandlerProps> = React.memo(
  ({
    symbol,
    onQuoteReceived,
    onStaticProfileUpdate,
    onMarketStatusChange,
  }) => {
    const { marketStatus, marketStatusMessage, lastApiTimestamp } =
      useStockData({
        symbol: symbol,
        onQuoteReceived: onQuoteReceived,
        onStaticProfileUpdate: onStaticProfileUpdate,
      });

    useEffect(() => {
      if (onMarketStatusChange) {
        onMarketStatusChange(
          symbol,
          marketStatus,
          marketStatusMessage,
          lastApiTimestamp
        );
      }
    }, [
      symbol,
      marketStatus,
      marketStatusMessage,
      lastApiTimestamp,
      onMarketStatusChange,
    ]);

    return null; // This component is for side effects (data fetching) and doesn't render UI
  }
);

StockDataHandler.displayName = "StockDataHandler";
