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
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { getDataTypesForCard } from "@/lib/card-data-type-mapping";

interface StockDataHandlerProps {
  symbol: string;
  activeCardTypes?: CardType[]; // Cards for this symbol that are currently active
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
  activeCardTypes = [],
  onQuoteReceived,
  onStaticProfileUpdate,
  onMarketStatusChange,
  onFinancialStatementUpdate,
}) => {
  // Only fetch financial statements if there are cards that need them
  const needsFinancialStatements = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("financial-statements");
  });

  const marketStatusInfo = useStockData({
    symbol: symbol,
    onLiveQuoteUpdate: onQuoteReceived,
    onProfileUpdate: onStaticProfileUpdate,
    onFinancialStatementUpdate: needsFinancialStatements
      ? onFinancialStatementUpdate
      : undefined, // Only pass callback if needed
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
