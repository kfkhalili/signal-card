// src/app/components/game/cards/price-card/PriceCardContent.tsx
import React from "react";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./price-card.types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ClickableDataItem } from "../../../ui/ClickableDataItem";

const formatMarketCap = (cap: number | null | undefined): string => {
  if (cap === null || cap === undefined) return "N/A";
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toString();
};

interface PriceCardContentProps {
  cardData: PriceCardData;
  isBackFace: boolean;
  onSmaClick?: PriceCardInteractionCallbacks["onPriceCardSmaClick"];
  onRangeContextClick?: PriceCardInteractionCallbacks["onPriceCardRangeContextClick"];
  onOpenPriceClick?: PriceCardInteractionCallbacks["onPriceCardOpenPriceClick"];
  onGenerateDailyPerformanceSignal?: PriceCardInteractionCallbacks["onPriceCardGenerateDailyPerformanceSignal"];
}

export const PriceCardContent = React.memo<PriceCardContentProps>(
  ({
    cardData,
    isBackFace,
    onSmaClick,
    onRangeContextClick,
    onOpenPriceClick,
    onGenerateDailyPerformanceSignal,
  }) => {
    const { faceData, backData, symbol } = cardData;

    const handleSmaInteraction = (
      e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
      smaPeriod: 50 | 200,
      smaValue: number | null | undefined
    ) => {
      if (onSmaClick && smaValue != null) {
        e.stopPropagation();
        onSmaClick(cardData, smaPeriod, smaValue);
      }
    };

    const handleRangeInteraction = (
      e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
      levelType: "High" | "Low",
      levelValue: number | null | undefined
    ) => {
      if (onRangeContextClick && levelValue != null) {
        e.stopPropagation();
        onRangeContextClick(cardData, levelType, levelValue);
      }
    };

    const handleOpenPriceInteraction = (
      e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
    ) => {
      if (onOpenPriceClick && faceData.dayOpen != null) {
        e.stopPropagation();
        onOpenPriceClick(cardData);
      }
    };

    const handleDailyPerformanceInteraction = (
      e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
    ) => {
      if (onGenerateDailyPerformanceSignal) {
        e.stopPropagation();
        onGenerateDailyPerformanceSignal(cardData);
      }
    };

    if (isBackFace) {
      // --- RENDER PRICE CARD BACK ---
      // This content is now rendered within a div with p-3 by BaseCard
      return (
        <div
          data-testid="price-card-back-content-data"
          className="pointer-events-auto"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {backData.explanation || "Market Data & Technicals"}
          </h3>
          <ShadCardContent className="space-y-2 text-sm px-0 pb-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <ClickableDataItem
                isInteractive={!!(onOpenPriceClick && faceData.dayOpen != null)}
                onClickHandler={handleOpenPriceInteraction}
                baseClassName="p-0.5 rounded-sm transition-colors relative"
                interactiveClassName="cursor-pointer hover:text-primary"
                data-testid="open-price-interactive-area"
                aria-label={
                  onOpenPriceClick && faceData.dayOpen != null
                    ? `Interact with Open Price: ${faceData.dayOpen.toFixed(2)}`
                    : undefined
                }
                data-interactive-child="true"
              >
                <span className="font-semibold">Open:</span> $
                {faceData.dayOpen?.toFixed(2) ?? "N/A"}
              </ClickableDataItem>
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
              <ClickableDataItem
                isInteractive={!!(onSmaClick && backData.sma50d != null)}
                onClickHandler={(e) =>
                  handleSmaInteraction(e, 50, backData.sma50d)
                }
                baseClassName="mt-1 p-1 rounded-md transition-colors relative"
                interactiveClassName="cursor-pointer hover:text-primary"
                data-testid="sma-50d-interactive-area"
                aria-label={
                  onSmaClick && backData.sma50d != null
                    ? `Interact with 50D SMA: ${backData.sma50d.toFixed(2)}`
                    : undefined
                }
                data-interactive-child="true"
              >
                <span className="font-semibold">50D SMA:</span> $
                {backData.sma50d?.toFixed(2) ?? "N/A"}
              </ClickableDataItem>
              <ClickableDataItem
                isInteractive={!!(onSmaClick && backData.sma200d != null)}
                onClickHandler={(e) =>
                  handleSmaInteraction(e, 200, backData.sma200d)
                }
                baseClassName="mt-1 p-1 rounded-md transition-colors relative"
                interactiveClassName="cursor-pointer hover:text-primary"
                data-testid="sma-200d-interactive-area"
                aria-label={
                  onSmaClick && backData.sma200d != null
                    ? `Interact with 200D SMA: ${backData.sma200d.toFixed(2)}`
                    : undefined
                }
                data-interactive-child="true"
              >
                <span className="font-semibold">200D SMA:</span> $
                {backData.sma200d?.toFixed(2) ?? "N/A"}
              </ClickableDataItem>
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face
      const changePositive =
        faceData.dayChange != null && faceData.dayChange >= 0;
      const baseChangeColor =
        faceData.dayChange === 0 || faceData.dayChange == null
          ? "text-muted-foreground"
          : changePositive
          ? "text-green-600"
          : "text-red-600";
      return (
        <div
          data-testid="price-card-front-content-data"
          className="pointer-events-auto"
        >
          {/* The universal header is now rendered by BaseCard.tsx */}
          {/* This ShadCardContent is for the main price display area */}
          <ShadCardContent className="px-0 pt-2 pb-0">
            {" "}
            {/* pt-2 for space from universal header */}
            <ClickableDataItem
              isInteractive={!!onGenerateDailyPerformanceSignal}
              onClickHandler={handleDailyPerformanceInteraction}
              baseClassName="group/dps rounded-md p-2 -mx-2 -my-1 mb-2" // Added mb-2 for spacing
              interactiveClassName="cursor-pointer transition-colors relative"
              data-testid="daily-performance-interactive-area"
              aria-label={
                onGenerateDailyPerformanceSignal
                  ? `Interact with daily performance: Price ${faceData.price?.toFixed(
                      2
                    )}`
                  : undefined
              }
              data-interactive-child="true"
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
                    ? `${
                        faceData.dayChange >= 0 ? "+" : ""
                      }${faceData.dayChange.toFixed(2)}`
                    : "N/A"}
                </p>
                <p className="text-lg font-semibold">
                  (
                  {faceData.changePercentage != null
                    ? `${faceData.changePercentage >= 0 ? "+" : ""}${(
                        faceData.changePercentage * 100
                      ).toFixed(2)}%`
                    : "N/A"}
                  )
                </p>
              </div>
            </ClickableDataItem>
            {/* REMOVED "Data as of:" line */}
            {/* <p className="text-xs text-muted-foreground mt-2">
              Data as of:{" "}
              {faceData.timestamp ? format(new Date(faceData.timestamp), "PP p") : "N/A"}
            </p> 
            */}
            {faceData.dayLow != null &&
              faceData.dayHigh != null &&
              faceData.price != null &&
              faceData.dayHigh > faceData.dayLow && (
                <div className="mt-3">
                  {" "}
                  {/* This mt-3 might need adjustment after removing the line above */}
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <ClickableDataItem
                      isInteractive={
                        !!(onRangeContextClick && faceData.dayLow != null)
                      }
                      onClickHandler={(e) =>
                        handleRangeInteraction(e, "Low", faceData.dayLow)
                      }
                      baseClassName="p-0.5 rounded-sm relative"
                      interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                      data-testid="day-low-interactive-area"
                      aria-label={
                        onRangeContextClick && faceData.dayLow != null
                          ? `Interact with Day Low: ${faceData.dayLow.toFixed(
                              2
                            )}`
                          : undefined
                      }
                      data-interactive-child="true"
                    >
                      L: ${faceData.dayLow.toFixed(2)}
                    </ClickableDataItem>
                    <ClickableDataItem
                      isInteractive={
                        !!(onRangeContextClick && faceData.dayHigh != null)
                      }
                      onClickHandler={(e) =>
                        handleRangeInteraction(e, "High", faceData.dayHigh)
                      }
                      baseClassName="p-0.5 rounded-sm relative"
                      interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                      data-testid="day-high-interactive-area"
                      aria-label={
                        onRangeContextClick && faceData.dayHigh != null
                          ? `Interact with Day High: ${faceData.dayHigh.toFixed(
                              2
                            )}`
                          : undefined
                      }
                      data-interactive-child="true"
                    >
                      H: ${faceData.dayHigh.toFixed(2)}
                    </ClickableDataItem>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 pointer-events-none">
                    {(() => {
                      const range = faceData.dayHigh! - faceData.dayLow!;
                      const position = faceData.price! - faceData.dayLow!;
                      const percentage = Math.max(
                        0,
                        Math.min(100, (position / range) * 100)
                      );
                      return (
                        <div
                          className={cn(
                            "h-1.5 rounded-full",
                            changePositive ? "bg-green-500" : "bg-red-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}
          </ShadCardContent>
        </div>
      );
    }
  }
);

PriceCardContent.displayName = "PriceCardContent";
