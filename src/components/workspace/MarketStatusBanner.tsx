// src/components/workspace/MarketStatusBanner.tsx
import { useMemo, type FC } from "react";
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

interface GroupedStatus {
  symbols: string[];
  statusInfo: MarketStatusUpdate;
  exchangeName: string;
}

const MarketStatusBanner: FC<MarketStatusBannerProps> = ({
  uniqueSymbolsInWorkspace,
  marketStatuses,
  isAddingCardInProgress,
}) => {
  const groupedStatuses = useMemo(() => {
    const groups: Record<string, GroupedStatus> = {};
    if (uniqueSymbolsInWorkspace.length === 0) {
      return [];
    }

    uniqueSymbolsInWorkspace.forEach((symbol) => {
      const statusInfo = marketStatuses[symbol];
      if (statusInfo) {
        const key = `${statusInfo.exchangeCode || "unknown"}-${
          statusInfo.status
        }`;
        if (!groups[key]) {
          groups[key] = {
            symbols: [],
            statusInfo,
            exchangeName:
              statusInfo.exchangeName || statusInfo.exchangeCode || "Unknown",
          };
        }
        groups[key].symbols.push(symbol);
      }
    });

    return Object.values(groups);
  }, [uniqueSymbolsInWorkspace, marketStatuses]);

  if (uniqueSymbolsInWorkspace.length === 0) {
    return null;
  }

  const allSymbolsAccountedFor =
    uniqueSymbolsInWorkspace.length === Object.keys(marketStatuses).length;

  return (
    <div className="px-2 sm:px-4 text-center py-2 bg-card border text-card-foreground rounded-md text-xs sm:text-sm shadow max-h-48 overflow-y-auto">
      <h3 className="font-semibold mb-1 text-sm">Market Status:</h3>

      {groupedStatuses.map((group) => {
        const { symbols, statusInfo, exchangeName } = group;
        const { status, openingTime, closingTime, timezone } = statusInfo;
        const localOpeningTime = formatMarketTime(openingTime, timezone);
        const localClosingTime = formatMarketTime(closingTime, timezone);

        return (
          <div key={`${exchangeName}-${status}`} className="text-xs mb-0.5">
            <strong>{symbols.join(", ")}:</strong>
            <span>
              {` ${exchangeName} - ${status}`}
              {localOpeningTime && localClosingTime && (
                <span className="ml-1 text-muted-foreground">
                  ({localOpeningTime} - {localClosingTime})
                </span>
              )}
            </span>
          </div>
        );
      })}

      {!allSymbolsAccountedFor && !isAddingCardInProgress && (
        <p className="text-xs text-muted-foreground mt-1">
          Initializing data streams for some symbols...
        </p>
      )}
    </div>
  );
};

export default MarketStatusBanner;
