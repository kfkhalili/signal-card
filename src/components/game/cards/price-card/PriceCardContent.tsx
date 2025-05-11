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
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toString();
};

const formatVolume = (volume: number | null | undefined): string => {
  if (volume === null || volume === undefined) return "N/A";
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`;
  return volume.toLocaleString();
};

const STATIC_BACK_FACE_DESCRIPTION =
  "Market Price: The value of a single unit of this asset.";

interface RangeBarStyling {
  bgColorClass: string;
  animationClass?: string;
}

const getRangeBarStyling = (
  percentage: number,
  isAtHigh: boolean,
  isAtLow: boolean
): RangeBarStyling => {
  if (isAtLow && percentage < 1) return { bgColorClass: "bg-slate-600" };
  if (isAtHigh && percentage > 99)
    return { bgColorClass: "bg-emerald-500", animationClass: "animate-pulse" };
  if (percentage <= 20) return { bgColorClass: "bg-slate-500" };
  if (percentage <= 40) return { bgColorClass: "bg-cyan-600" };
  if (percentage <= 60) return { bgColorClass: "bg-teal-500" };
  if (percentage <= 80) return { bgColorClass: "bg-emerald-400" };
  return { bgColorClass: "bg-emerald-500" };
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
      levelType: "High" | "Low" | "YearHigh" | "YearLow",
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
            <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
              {backData.description || STATIC_BACK_FACE_DESCRIPTION}
            </CardDescription>
          </CardHeader>

          <ShadCardContent
            className={cn(
              "text-xs sm:text-sm md:text-base pb-0 px-0",
              "text-muted-foreground"
            )}>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-1.5">
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={
                    !!(onOpenPriceClick && faceData.dayOpen != null)
                  }
                  onClickHandler={handleOpenPriceInteraction}
                  baseClassName="transition-colors w-full"
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
                  <span className="font-semibold block">Open</span>
                  <span>${faceData.dayOpen?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Prev Close</span>
                <span>${faceData.previousClose?.toFixed(2) ?? "N/A"}</span>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Volume</span>
                <span>{formatVolume(faceData.volume)}</span>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Market Cap</span>
                <span>{formatMarketCap(backData.marketCap)}</span>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={!!(onSmaClick && backData.sma50d != null)}
                  onClickHandler={(e) =>
                    handleSmaInteraction(e, 50, backData.sma50d)
                  }
                  baseClassName="transition-colors w-full"
                  interactiveClassName="cursor-pointer hover:text-primary"
                  data-testid="sma-50d-interactive-area"
                  aria-label={
                    onSmaClick && backData.sma50d != null
                      ? `Interact with 50D SMA: ${backData.sma50d.toFixed(2)}`
                      : undefined
                  }
                  data-interactive-child="true">
                  <span className="font-semibold block">50D SMA</span>
                  <span>${backData.sma50d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={!!(onSmaClick && backData.sma200d != null)}
                  onClickHandler={(e) =>
                    handleSmaInteraction(e, 200, backData.sma200d)
                  }
                  baseClassName="transition-colors w-full"
                  interactiveClassName="cursor-pointer hover:text-primary"
                  data-testid="sma-200d-interactive-area"
                  aria-label={
                    onSmaClick && backData.sma200d != null
                      ? `Interact with 200D SMA: ${backData.sma200d.toFixed(2)}`
                      : undefined
                  }
                  data-interactive-child="true">
                  <span className="font-semibold block">200D SMA</span>
                  <span>${backData.sma200d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face
      const currentPrice = faceData.price;
      const dayLow = faceData.dayLow;
      const dayHigh = faceData.dayHigh;
      const yearLow = faceData.yearLow;
      const yearHigh = faceData.yearHigh;

      let dailyRangePercentage = 0;
      let dailyRangeStyling: RangeBarStyling = { bgColorClass: "bg-slate-300" };
      if (
        dayHigh != null &&
        dayLow != null &&
        currentPrice != null &&
        dayHigh > dayLow
      ) {
        const range = dayHigh - dayLow;
        const position = currentPrice - dayLow;
        dailyRangePercentage = Math.max(
          0,
          Math.min(100, (position / range) * 100)
        );
        dailyRangeStyling = getRangeBarStyling(
          dailyRangePercentage,
          currentPrice >= dayHigh,
          currentPrice <= dayLow
        );
      }

      let yearlyRangePercentage = 0;
      let yearlyRangeStyling: RangeBarStyling = {
        bgColorClass: "bg-slate-300",
      };
      if (
        yearHigh != null &&
        yearLow != null &&
        currentPrice != null &&
        yearHigh > yearLow
      ) {
        const range = yearHigh - yearLow;
        const position = currentPrice - yearLow;
        yearlyRangePercentage = Math.max(
          0,
          Math.min(100, (position / range) * 100)
        );
        yearlyRangeStyling = getRangeBarStyling(
          yearlyRangePercentage,
          currentPrice >= yearHigh,
          currentPrice <= yearLow
        );
      }

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
              "text-2xl sm:text-3xl md:text-4xl font-bold",
              onGenerateDailyPerformanceSignal &&
                "group-hover/textgroup:text-primary"
            )}
            title="Current Price">
            ${faceData.price != null ? faceData.price.toFixed(2) : "N/A"}
          </p>
          <div
            className={cn(
              "flex items-baseline space-x-1 sm:space-x-2",
              faceData.dayChange === 0 || faceData.dayChange == null
                ? "text-muted-foreground"
                : faceData.dayChange > 0
                ? "text-green-600"
                : "text-red-600",
              onGenerateDailyPerformanceSignal &&
                "group-hover/textgroup:text-primary"
            )}>
            <p
              className="text-base sm:text-lg font-semibold"
              title="Day Change">
              {faceData.dayChange != null
                ? `${
                    faceData.dayChange >= 0 ? "+" : ""
                  }${faceData.dayChange.toFixed(2)}`
                : "N/A"}
            </p>
            <p
              className="text-base sm:text-lg font-semibold"
              title="Percent Change">
              (
              {faceData.changePercentage != null
                ? `${
                    faceData.changePercentage >= 0 ? "+" : ""
                  }${faceData.changePercentage.toFixed(2)}%`
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

            {/* Daily Low/High Range */}
            {dayLow != null &&
              dayHigh != null &&
              currentPrice != null &&
              dayHigh > dayLow && (
                <div className="mt-2 sm:mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <ClickableDataItem
                      title={`${dayLow?.toFixed(2) ?? "N/A"}`} // Tooltip shows value
                      isInteractive={!!(onRangeContextClick && dayLow != null)}
                      onClickHandler={(e) =>
                        handleRangeInteraction(e, "Low", dayLow)
                      }
                      baseClassName="p-0.5 rounded-sm relative"
                      interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                      data-testid="day-low-interactive-area"
                      aria-label={
                        onRangeContextClick && dayLow != null
                          ? `Interact with Day Low value`
                          : undefined
                      }
                      data-interactive-child="true">
                      Day Low {/* Static text */}
                    </ClickableDataItem>
                    <ClickableDataItem
                      title={`${dayHigh?.toFixed(2) ?? "N/A"}`} // Tooltip shows value
                      isInteractive={!!(onRangeContextClick && dayHigh != null)}
                      onClickHandler={(e) =>
                        handleRangeInteraction(e, "High", dayHigh)
                      }
                      baseClassName="p-0.5 rounded-sm relative"
                      interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                      data-testid="day-high-interactive-area"
                      aria-label={
                        onRangeContextClick && dayHigh != null
                          ? `Interact with Day High value`
                          : undefined
                      }
                      data-interactive-child="true">
                      Day High {/* Static text */}
                    </ClickableDataItem>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 pointer-events-none">
                    <div
                      className={cn(
                        "h-1.5 rounded-full",
                        dailyRangeStyling.bgColorClass,
                        dailyRangeStyling.animationClass
                      )}
                      style={{ width: `${dailyRangePercentage}%` }}
                    />
                  </div>
                </div>
              )}

            {/* 52-Week Low/High Range */}
            {yearLow != null &&
              yearHigh != null &&
              currentPrice != null &&
              yearHigh > yearLow && (
                <div className="mt-3 sm:mt-4">
                  <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground/90 mb-0.5 sm:mb-1">
                    <ClickableDataItem
                      title={`${yearLow?.toFixed(2) ?? "N/A"}`} // Tooltip shows value
                      isInteractive={!!(onRangeContextClick && yearLow != null)}
                      onClickHandler={(e) =>
                        handleRangeInteraction(e, "YearLow", yearLow)
                      }
                      baseClassName="p-0.5 rounded-sm relative"
                      interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                      data-testid="year-low-interactive-area"
                      aria-label={
                        onRangeContextClick && yearLow != null
                          ? `Interact with 52-Week Low value`
                          : undefined
                      }
                      data-interactive-child="true">
                      52W Low {/* Static text */}
                    </ClickableDataItem>
                    <ClickableDataItem
                      title={`${yearHigh?.toFixed(2) ?? "N/A"}`} // Tooltip shows value
                      isInteractive={
                        !!(onRangeContextClick && yearHigh != null)
                      }
                      onClickHandler={(e) =>
                        handleRangeInteraction(e, "YearHigh", yearHigh)
                      }
                      baseClassName="p-0.5 rounded-sm relative"
                      interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                      data-testid="year-high-interactive-area"
                      aria-label={
                        onRangeContextClick && yearHigh != null
                          ? `Interact with 52-Week High value`
                          : undefined
                      }
                      data-interactive-child="true">
                      52W High {/* Static text */}
                    </ClickableDataItem>
                  </div>
                  <div className="w-full bg-muted/70 rounded-full h-1 sm:h-1.5 pointer-events-none">
                    <div
                      className={cn(
                        "h-1 sm:h-1.5 rounded-full",
                        yearlyRangeStyling.bgColorClass,
                        yearlyRangeStyling.animationClass
                      )}
                      style={{ width: `${yearlyRangePercentage}%` }}
                    />
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
