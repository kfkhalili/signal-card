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
  RatiosTtmDBRow,
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
  onRatiosTTMUpdate?: (ratios: RatiosTtmDBRow) => void;
}

export const StockDataHandler: React.FC<StockDataHandlerProps> = ({
  symbol,
  activeCardTypes = [],
  onQuoteReceived,
  onStaticProfileUpdate,
  onMarketStatusChange,
  onFinancialStatementUpdate,
  onRatiosTTMUpdate,
}) => {
  // Only fetch financial statements if there are cards that need them
  const needsFinancialStatements = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("financial-statements");
  });

  // Check if any cards need ratios-ttm
  const needsRatiosTTM = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("ratios-ttm");
  });

  const marketStatusInfo = useStockData({
    symbol: symbol,
    onLiveQuoteUpdate: onQuoteReceived,
    onProfileUpdate: onStaticProfileUpdate,
    onFinancialStatementUpdate: needsFinancialStatements
      ? onFinancialStatementUpdate
      : undefined, // Only pass callback if needed
    onRatiosTTMUpdate: needsRatiosTTM
      ? onRatiosTTMUpdate
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
