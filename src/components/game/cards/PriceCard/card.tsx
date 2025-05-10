import React from "react";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { PriceCard, PriceCardFaceData } from "../index"; // Assuming types are in ../../types
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PriceCardDisplayProps {
  card: PriceCard;
  isBack: boolean;
  onSmaClick?: (
    smaPeriod: 50 | 200,
    smaValue: number,
    faceData: PriceCardFaceData
  ) => void;
  onRangeContextClick?: (
    levelType: "High" | "Low",
    levelValue: number,
    faceData: PriceCardFaceData
  ) => void;
  onOpenPriceClick?: (faceData: PriceCardFaceData) => void;
  onGenerateDailyPerformanceSignal?: (faceData: PriceCardFaceData) => void;
}

const formatMarketCap = (cap: number | null | undefined): string => {
  if (cap === null || cap === undefined) return "N/A";
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toString();
};

export const PriceCardDisplay: React.FC<PriceCardDisplayProps> = ({
  card,
  isBack,
  onSmaClick,
  onRangeContextClick,
  onOpenPriceClick,
  onGenerateDailyPerformanceSignal,
}) => {
  const faceData = card.faceData;
  const backData = card.backData;

  const handleSmaInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    smaPeriod: 50 | 200,
    smaValue: number | null | undefined
  ) => {
    if (onSmaClick && smaValue != null) {
      e.stopPropagation();
      onSmaClick(smaPeriod, smaValue, faceData);
    }
  };

  const handleRangeInteraction = (
    e: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>,
    levelType: "High" | "Low",
    levelValue: number | null | undefined
  ) => {
    if (onRangeContextClick && levelValue != null) {
      e.stopPropagation();
      onRangeContextClick(levelType, levelValue, faceData);
    }
  };

  const handleOpenPriceInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (onOpenPriceClick && faceData.dayOpen != null) {
      e.stopPropagation();
      onOpenPriceClick(faceData);
    }
  };

  const handleDailyPerformanceInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (onGenerateDailyPerformanceSignal) {
      e.stopPropagation();
      onGenerateDailyPerformanceSignal(faceData);
    }
  };

  if (isBack) {
    return (
      <div
        data-testid="card-face-back-content"
        className="pointer-events-auto h-full overflow-y-auto"
      >
        <CardHeader>
          <CardTitle className="text-lg">{card.symbol} - Details</CardTitle>
          <CardDescription>
            {backData.explanation || "Market Data & Technicals"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div
              data-testid="open-price-interactive-area"
              data-interactive-child="true"
              className={cn(
                "p-0.5 rounded-sm transition-colors relative z-10 pointer-events-auto",
                onOpenPriceClick && faceData.dayOpen != null
                  ? "cursor-pointer hover:bg-muted/30 hover:text-primary"
                  : ""
              )}
              onClick={handleOpenPriceInteraction}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleOpenPriceInteraction(e);
                }
              }}
              role={
                onOpenPriceClick && faceData.dayOpen != null
                  ? "button"
                  : undefined
              }
              tabIndex={
                onOpenPriceClick && faceData.dayOpen != null ? 0 : undefined
              }
            >
              <span className="font-semibold">Open:</span> $
              {faceData.dayOpen?.toFixed(2) ?? "N/A"}
            </div>
            <p>
              <span className="font-semibold">Prev Close:</span> $
              {faceData.previousClose?.toFixed(2) ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold">Day High:</span> $
              {faceData.dayHigh?.toFixed(2) ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold">Day Low:</span> $
              {faceData.dayLow?.toFixed(2) ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold">Volume:</span>
              {faceData.volume?.toLocaleString() ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold">Market Cap:</span>
              {formatMarketCap(backData.marketCap)}
            </p>
            <div
              data-testid="sma-50d-interactive-area"
              data-interactive-child="true"
              className={cn(
                "mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto",
                onSmaClick && backData.sma50d != null
                  ? "cursor-pointer hover:bg-muted/30 hover:text-primary"
                  : ""
              )}
              onClick={(e) => {
                if (backData.sma50d != null)
                  handleSmaInteraction(e, 50, backData.sma50d);
              }}
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  backData.sma50d != null
                ) {
                  handleSmaInteraction(e, 50, backData.sma50d);
                }
              }}
              role={
                onSmaClick && backData.sma50d != null ? "button" : undefined
              }
              tabIndex={onSmaClick && backData.sma50d != null ? 0 : undefined}
            >
              <span className="font-semibold">50D SMA:</span>
              {backData.sma50d?.toFixed(2) ?? "N/A"}
            </div>
            <div
              data-testid="sma-200d-interactive-area"
              data-interactive-child="true"
              className={cn(
                "mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto",
                onSmaClick && backData.sma200d != null
                  ? "cursor-pointer hover:bg-muted/30 hover:text-primary"
                  : ""
              )}
              onClick={(e) => {
                if (backData.sma200d != null)
                  handleSmaInteraction(e, 200, backData.sma200d);
              }}
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  backData.sma200d != null
                ) {
                  handleSmaInteraction(e, 200, backData.sma200d);
                }
              }}
              role={
                onSmaClick && backData.sma200d != null ? "button" : undefined
              }
              tabIndex={onSmaClick && backData.sma200d != null ? 0 : undefined}
            >
              <span className="font-semibold">200D SMA:</span>
              {backData.sma200d?.toFixed(2) ?? "N/A"}
            </div>
          </div>
        </CardContent>
      </div>
    );
  } else {
    // --- RENDER LIVE PRICE CARD FRONT ---
    const changePositive =
      faceData.dayChange != null && faceData.dayChange >= 0;
    const baseChangeColor =
      faceData.dayChange === 0
        ? "text-muted-foreground"
        : changePositive
        ? "text-green-600"
        : "text-red-600";
    return (
      <div
        data-testid="card-face-front-content"
        className="pointer-events-auto h-full overflow-y-auto"
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{card.symbol}</CardTitle>
              <CardDescription>Live Quote</CardDescription>
            </div>
            <p className="text-xs text-muted-foreground">
              {faceData.timestamp
                ? format(new Date(faceData.timestamp), "p")
                : "N/A"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div
            data-testid="daily-performance-interactive-area"
            data-interactive-child="true"
            className={cn(
              "group/dps rounded-md p-2 -mx-2 -my-1 mb-1",
              onGenerateDailyPerformanceSignal
                ? "cursor-pointer hover:bg-muted/30 transition-colors pointer-events-auto relative z-10"
                : ""
            )}
            onClick={handleDailyPerformanceInteraction}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleDailyPerformanceInteraction(e);
              }
            }}
            role={onGenerateDailyPerformanceSignal ? "button" : undefined}
            tabIndex={onGenerateDailyPerformanceSignal ? 0 : undefined}
          >
            <p
              className={cn(
                "text-4xl font-bold",
                onGenerateDailyPerformanceSignal &&
                  "group-hover/dps:text-primary"
              )}
            >
              ${faceData.price != null ? faceData.price.toFixed(2) : "N/A"}
            </p>
            <div
              className={cn(
                "flex items-baseline space-x-2",
                baseChangeColor,
                onGenerateDailyPerformanceSignal &&
                  "group-hover/dps:text-primary"
              )}
            >
              <p className="text-lg font-semibold">
                {faceData.dayChange != null
                  ? `${changePositive ? "+" : ""}${faceData.dayChange.toFixed(
                      2
                    )}`
                  : "N/A"}
              </p>
              <p className="text-lg font-semibold">
                (
                {faceData.changePercentage != null
                  ? `${changePositive ? "+" : ""}${(
                      faceData.changePercentage * 100
                    ).toFixed(2)}%`
                  : "N/A"}
                )
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Data as of:{" "}
            {faceData.timestamp
              ? format(new Date(faceData.timestamp), "PP p")
              : "N/A"}
          </p>
          {faceData.dayLow != null &&
            faceData.dayHigh != null &&
            faceData.price != null &&
            faceData.dayHigh > faceData.dayLow && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span
                    data-testid="day-low-interactive-area"
                    data-interactive-child="true"
                    className={cn(
                      "p-0.5 rounded-sm pointer-events-auto relative z-10",
                      onRangeContextClick
                        ? "cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors"
                        : ""
                    )}
                    onClick={(e) => {
                      if (faceData.dayLow != null)
                        handleRangeInteraction(e, "Low", faceData.dayLow);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        faceData.dayLow != null
                      )
                        handleRangeInteraction(e, "Low", faceData.dayLow);
                    }}
                    role={
                      onRangeContextClick && faceData.dayLow != null
                        ? "button"
                        : undefined
                    }
                    tabIndex={
                      onRangeContextClick && faceData.dayLow != null
                        ? 0
                        : undefined
                    }
                  >
                    L: ${faceData.dayLow.toFixed(2)}
                  </span>
                  <span
                    data-testid="day-high-interactive-area"
                    data-interactive-child="true"
                    className={cn(
                      "p-0.5 rounded-sm pointer-events-auto relative z-10",
                      onRangeContextClick
                        ? "cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors"
                        : ""
                    )}
                    onClick={(e) => {
                      if (faceData.dayHigh != null)
                        handleRangeInteraction(e, "High", faceData.dayHigh);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        faceData.dayHigh != null
                      )
                        handleRangeInteraction(e, "High", faceData.dayHigh);
                    }}
                    role={
                      onRangeContextClick && faceData.dayHigh != null
                        ? "button"
                        : undefined
                    }
                    tabIndex={
                      onRangeContextClick && faceData.dayHigh != null
                        ? 0
                        : undefined
                    }
                  >
                    H: ${faceData.dayHigh.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 pointer-events-none">
                  {(() => {
                    const percentage = Math.max(
                      0,
                      Math.min(
                        100,
                        ((faceData.price - faceData.dayLow) /
                          (faceData.dayHigh - faceData.dayLow)) *
                          100
                      )
                    );
                    return (
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          changePositive ? "bg-green-500" : "bg-red-500",
                          `w-[${percentage}%]`
                        )}
                      />
                    );
                  })()}
                </div>
              </div>
            )}
        </CardContent>
      </div>
    );
  }
};
