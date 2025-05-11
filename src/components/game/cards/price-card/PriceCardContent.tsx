// src/app/components/game/cards/price-card/PriceCardContent.tsx
import React from "react";
import {
  CardHeader,
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./price-card.types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

const formatMarketCap = (cap: number | null | undefined): string => {
  if (cap === null || cap === undefined) return "N/A";
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`; // Trillions
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`; // Billions
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`; // Millions
  return cap.toString(); // Less than a million
};

// New helper function to format volume
const formatVolume = (volume: number | null | undefined): string => {
  if (volume === null || volume === undefined) return "N/A";
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`; // Billions
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`; // Millions
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`; // Thousands
  return volume.toLocaleString(); // Show with commas if less than 1000 or as is
};

const STATIC_BACK_FACE_DESCRIPTION =
  "Share price represents the current market value of one share of company stock.";

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

    const gridCellClass = "min-w-0";

    if (isBackFace) {
      return (
        <div
          data-testid="price-card-back-content-data"
          className="pointer-events-auto">
          <CardHeader className="pt-0 pb-2 px-0">
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              {backData.description || STATIC_BACK_FACE_DESCRIPTION}
            </CardDescription>
          </CardHeader>

          <ShadCardContent className="text-sm pb-0 px-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={
                    !!(onOpenPriceClick && faceData.dayOpen != null)
                  }
                  onClickHandler={handleOpenPriceInteraction}
                  baseClassName="transition-colors w-full py-0.5"
                  interactiveClassName="cursor-pointer hover:text-primary"
                  data-testid="open-price-interactive-area"
                  aria-label={
                    onOpenPriceClick && faceData.dayOpen != null
                      ? `Interact with Open Price: ${faceData.dayOpen.toFixed(
                          2
                        )}`
                      : undefined
                  }
                  data-interactive-child="true">
                  <span className="font-semibold block">Open:</span>
                  <span>${faceData.dayOpen?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>

              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Prev Close:</span>
                <span>${faceData.previousClose?.toFixed(2) ?? "N/A"}</span>
              </div>

              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Volume:</span>
                {/* MODIFIED: Use formatVolume here */}
                <span>{formatVolume(faceData.volume)}</span>
              </div>

              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Market Cap:</span>
                <span>{formatMarketCap(backData.marketCap)}</span>
              </div>

              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={!!(onSmaClick && backData.sma50d != null)}
                  onClickHandler={(e) =>
                    handleSmaInteraction(e, 50, backData.sma50d)
                  }
                  baseClassName="transition-colors w-full py-0.5"
                  interactiveClassName="cursor-pointer hover:text-primary"
                  data-testid="sma-50d-interactive-area"
                  aria-label={
                    onSmaClick && backData.sma50d != null
                      ? `Interact with 50D SMA: ${backData.sma50d.toFixed(2)}`
                      : undefined
                  }
                  data-interactive-child="true">
                  <span className="font-semibold block">50D SMA:</span>
                  <span>${backData.sma50d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>

              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={!!(onSmaClick && backData.sma200d != null)}
                  onClickHandler={(e) =>
                    handleSmaInteraction(e, 200, backData.sma200d)
                  }
                  baseClassName="transition-colors w-full py-0.5"
                  interactiveClassName="cursor-pointer hover:text-primary"
                  data-testid="sma-200d-interactive-area"
                  aria-label={
                    onSmaClick && backData.sma200d != null
                      ? `Interact with 200D SMA: ${backData.sma200d.toFixed(2)}`
                      : undefined
                  }
                  data-interactive-child="true">
                  <span className="font-semibold block">200D SMA:</span>
                  <span>${backData.sma200d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
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

      const PriceDisplayBlock = (
        <div
          className={cn(
            "w-fit",
            onGenerateDailyPerformanceSignal && "group/textgroup cursor-pointer"
          )}
          onClick={
            onGenerateDailyPerformanceSignal
              ? handleDailyPerformanceInteraction
              : undefined
          }
          onKeyDown={
            onGenerateDailyPerformanceSignal
              ? (e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  handleDailyPerformanceInteraction(e)
              : undefined
          }
          role={onGenerateDailyPerformanceSignal ? "button" : undefined}
          tabIndex={onGenerateDailyPerformanceSignal ? 0 : undefined}
          aria-label={
            onGenerateDailyPerformanceSignal
              ? `Interact with daily performance: Price ${faceData.price?.toFixed(
                  2
                )}`
              : undefined
          }>
          <p
            className={cn(
              "text-4xl font-bold",
              onGenerateDailyPerformanceSignal &&
                "group-hover/textgroup:text-primary"
            )}>
            ${faceData.price != null ? faceData.price.toFixed(2) : "N/A"}
          </p>
          <div
            className={cn(
              "flex items-baseline space-x-2",
              baseChangeColor,
              onGenerateDailyPerformanceSignal &&
                "group-hover/textgroup:text-primary"
            )}>
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
        </div>
      );

      return (
        <div
          data-testid="price-card-front-content-data"
          className="pointer-events-auto p-3">
          <ShadCardContent className="px-0 pt-0 pb-0">
            <div
              className="rounded-md p-2 -mx-2 -my-1 mb-2"
              data-testid="daily-performance-layout-area">
              {PriceDisplayBlock}
            </div>

            {faceData.dayLow != null &&
              faceData.dayHigh != null &&
              faceData.price != null &&
              faceData.dayHigh > faceData.dayLow && (
                <div className="mt-3">
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
                      data-interactive-child="true">
                      L: ${faceData.dayLow.toFixed(2)}{" "}
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
                      data-interactive-child="true">
                      {" "}
                      H: ${faceData.dayHigh.toFixed(2)}{" "}
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
