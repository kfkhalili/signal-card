// src/components/workspace/StockDataHandler.tsx
"use client";

import React, { useEffect } from "react";
import {
  useStockData,
  type MarketStatusUpdate,
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
    statusInfo: MarketStatusUpdate
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
  const marketStatusInfo = useStockData({
    symbol: symbol,
    onLiveQuoteUpdate: onQuoteReceived,
    onProfileUpdate: onStaticProfileUpdate,
    onFinancialStatementUpdate: onFinancialStatementUpdate,
  });

  const {
    status,
    message,
    openingTime,
    closingTime,
    timezone,
    exchangeName,
    exchangeCode,
  } = marketStatusInfo;

  useEffect(() => {
    if (onMarketStatusChange) {
      onMarketStatusChange(symbol, {
        status,
        message,
        openingTime,
        closingTime,
        timezone,
        exchangeName,
        exchangeCode,
      });
    }
  }, [
    symbol,
    status,
    message,
    openingTime,
    closingTime,
    timezone,
    exchangeName,
    exchangeCode,
    onMarketStatusChange,
  ]);

  return null;
};
