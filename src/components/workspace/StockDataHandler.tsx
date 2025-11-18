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
  DividendHistoryDBRow,
  RevenueProductSegmentationDBRow,
  GradesHistoricalDBRow,
  ExchangeVariantsDBRow,
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
  onDividendHistoryUpdate?: (dividend: DividendHistoryDBRow) => void;
  onRevenueSegmentationUpdate?: (segmentation: RevenueProductSegmentationDBRow) => void;
  onGradesHistoricalUpdate?: (grades: GradesHistoricalDBRow) => void;
  onExchangeVariantsUpdate?: (variant: ExchangeVariantsDBRow) => void;
}

export const StockDataHandler: React.FC<StockDataHandlerProps> = ({
  symbol,
  activeCardTypes = [],
  onQuoteReceived,
  onStaticProfileUpdate,
  onMarketStatusChange,
  onFinancialStatementUpdate,
  onRatiosTTMUpdate,
  onDividendHistoryUpdate,
  onRevenueSegmentationUpdate,
  onGradesHistoricalUpdate,
  onExchangeVariantsUpdate,
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

  // Check if any cards need dividend-history
  const needsDividendHistory = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("dividend-history");
  });

  // Check if any cards need revenue-product-segmentation
  const needsRevenueSegmentation = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("revenue-product-segmentation");
  });

  // Check if any cards need grades-historical
  const needsGradesHistorical = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("grades-historical");
  });

  // Check if any cards need exchange-variants
  const needsExchangeVariants = activeCardTypes.some((cardType) => {
    const dataTypes = getDataTypesForCard(cardType);
    return dataTypes.includes("exchange-variants");
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
    onDividendHistoryUpdate: needsDividendHistory
      ? onDividendHistoryUpdate
      : undefined,
    onRevenueSegmentationUpdate: needsRevenueSegmentation
      ? onRevenueSegmentationUpdate
      : undefined,
    onGradesHistoricalUpdate: needsGradesHistorical
      ? onGradesHistoricalUpdate
      : undefined,
    onExchangeVariantsUpdate: needsExchangeVariants
      ? onExchangeVariantsUpdate
      : undefined,
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
