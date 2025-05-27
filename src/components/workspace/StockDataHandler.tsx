// src/components/workspace/StockDataHandler.tsx
"use client";

import React, { useEffect } from "react";
import {
  useStockData,
  type DerivedMarketStatus,
  type ProfileDBRow,
} from "@/hooks/useStockData";
import type {
  LiveQuoteIndicatorDBRow,
  FinancialStatementDBRow,
} from "@/lib/supabase/realtime-service";

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
  onFinancialStatementUpdate: (statement: FinancialStatementDBRow) => void;
}

export const StockDataHandler: React.FC<StockDataHandlerProps> = ({
  symbol,
  onQuoteReceived,
  onStaticProfileUpdate,
  onMarketStatusChange,
  onFinancialStatementUpdate,
}) => {
  const { derivedMarketStatus, marketStatusMessage } = useStockData({
    symbol: symbol,
    onLiveQuoteUpdate: onQuoteReceived,
    onProfileUpdate: onStaticProfileUpdate,
    onFinancialStatementUpdate: onFinancialStatementUpdate,
  });

  useEffect(() => {
    if (onMarketStatusChange) {
      onMarketStatusChange(symbol, derivedMarketStatus, marketStatusMessage);
    }
  }, [symbol, derivedMarketStatus, marketStatusMessage, onMarketStatusChange]);

  return null;
};
