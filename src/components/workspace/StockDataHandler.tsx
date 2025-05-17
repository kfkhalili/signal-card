// src/components/workspace/StockDataHandler.tsx
"use client";

import React, { useEffect } from "react";
import {
  useStockData,
  type DerivedMarketStatus,
  type ProfileDBRow,
} from "@/hooks/useStockData";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";
import type { ExchangeMarketStatusRecord } from "@/types/market.types";

interface StockDataHandlerProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: LiveQuoteIndicatorDBRow,
    source: "fetch" | "realtime"
  ) => void;
  onStaticProfileUpdate: (updatedProfile: ProfileDBRow) => void;
  onMarketStatusChange?: (
    symbol: string,
    status: DerivedMarketStatus,
    message: string | null
  ) => void;
}

export const StockDataHandler: React.FC<StockDataHandlerProps> = ({
  symbol,
  onQuoteReceived,
  onStaticProfileUpdate,
  onMarketStatusChange,
}) => {
  // if (process.env.NODE_ENV === 'development') {
  //   console.log(`[StockDataHandler ${symbol}] Rendering. Type of onQuoteReceived prop: ${typeof onQuoteReceived}`);
  // }

  const { derivedMarketStatus, marketStatusMessage } = useStockData({
    symbol: symbol,
    onLiveQuoteUpdate: onQuoteReceived,
    onProfileUpdate: onStaticProfileUpdate,
  });

  useEffect(() => {
    if (onMarketStatusChange) {
      onMarketStatusChange(symbol, derivedMarketStatus, marketStatusMessage);
    }
  }, [symbol, derivedMarketStatus, marketStatusMessage, onMarketStatusChange]);

  return null;
};
