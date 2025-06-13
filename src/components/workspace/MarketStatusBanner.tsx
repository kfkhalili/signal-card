// src/components/workspace/MarketStatusBanner.tsx
import React from "react";
import type { MarketStatusUpdate } from "@/hooks/useStockData";

type MarketStatus = Record<string, MarketStatusUpdate>;

export interface MarketStatusBannerProps {
  uniqueSymbolsInWorkspace: string[];
  marketStatuses: MarketStatus;
  isAddingCardInProgress: boolean;
}

const formatMarketTime = (
  time: string | null,
  timeZone: string | null
): string | null => {
  if (!time || !timeZone) return null;

  try {
    const now = new Date();
    // Get date parts (Y, M, D) in the target timezone to correctly handle date boundaries
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .reduce((acc, part) => {
        if (part.type !== "literal") {
          acc[part.type as "year" | "month" | "day"] = part.value;
        }
        return acc;
      }, {} as Record<"year" | "month" | "day", string>);

    // Get the timezone offset string, e.g., "GMT-4" or "GMT+5:30"
    const offsetPart = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName");

    if (!offsetPart) return time;

    // Convert "GMT-4" or "GMT+5:30" to a standard offset format like "-04:00" or "+05:30"
    let offset = offsetPart.value.replace("GMT", "");
    if (!offset.includes(":")) {
      offset = `${offset}:00`;
    }
    const offsetParts = offset.split(":");
    const hourPart = offsetParts[0];
    const minutePart = offsetParts[1] || "00";
    const sign = hourPart.startsWith("-") ? "-" : "+";
    const formattedHour =
      sign + Math.abs(parseInt(hourPart)).toString().padStart(2, "0");
    const finalOffset = `${formattedHour}:${minutePart}`;

    const isoString = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${time}:00${finalOffset}`;

    const date = new Date(isoString);

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (error) {
    console.error(`Error formatting time: ${time} in ${timeZone}`, error);
    return time;
  }
};

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
    if (!statusInfo) {
      return null;
    }

    const { status, openingTime, closingTime, timezone } = statusInfo;
    const localOpeningTime = formatMarketTime(openingTime, timezone);
    const localClosingTime = formatMarketTime(closingTime, timezone);

    return (
      <div key={`status-${symbol}`} className="text-xs mb-0.5">
        <strong>{symbol}:</strong>
        <span>
          {` ${status}`}
          {localOpeningTime && localClosingTime && (
            <span className="ml-1 text-muted-foreground">
              ({localOpeningTime} - {localClosingTime})
            </span>
          )}
        </span>
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
