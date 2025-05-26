import React from "react";
import type { DerivedMarketStatus } from "@/hooks/useStockData";

interface MarketStatusInfo {
  status: DerivedMarketStatus;
  message: string | null;
}

type MarketStatus = Record<string, MarketStatusInfo>;

export interface MarketStatusBannerProps {
  uniqueSymbolsInWorkspace: string[];
  marketStatuses: MarketStatus;
  isAddingCardInProgress: boolean;
}

const MarketStatusBanner: React.FC<MarketStatusBannerProps> = ({
  uniqueSymbolsInWorkspace,
  marketStatuses,
  isAddingCardInProgress,
}) => {
  if (uniqueSymbolsInWorkspace.length === 0) {
    return null;
  }

  const renderStatusForSymbol = (symbol: string): JSX.Element | null => {
    const statusInfo = marketStatuses[symbol];

    if (!statusInfo && !isAddingCardInProgress) {
      return (
        <p key={`status-${symbol}`} className="text-xs text-muted-foreground">
          {symbol}: Initializing stream...
        </p>
      );
    }
    if (!statusInfo && isAddingCardInProgress) {
      return null;
    }
    if (!statusInfo) {
      return null;
    }

    return (
      <div key={`status-${symbol}`} className="text-xs mb-0.5">
        <strong>{symbol}:</strong> {statusInfo.status}
        {statusInfo.message && (
          <span className="italic text-muted-foreground">
            ` ({String(statusInfo.message)})`
          </span>
        )}
      </div>
    );
  };

  const allStatusesInitialized = uniqueSymbolsInWorkspace.every(
    (s) => marketStatuses[s]
  );

  return (
    <div className="px-2 sm:px-4 text-center py-2 bg-card border text-card-foreground rounded-md text-xs sm:text-sm shadow max-h-48 overflow-y-auto">
      <h3 className="font-semibold mb-1 text-sm">Market Status:</h3>
      {uniqueSymbolsInWorkspace.map(renderStatusForSymbol)}
      {Object.keys(marketStatuses).length === 0 &&
        uniqueSymbolsInWorkspace.length > 0 &&
        !isAddingCardInProgress &&
        !allStatusesInitialized && (
          <p className="text-xs text-muted-foreground">
            Awaiting data streams for active symbols...
          </p>
        )}
    </div>
  );
};

export default MarketStatusBanner;
