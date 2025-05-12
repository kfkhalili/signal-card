// src/components/game/cards/price-card/PriceCardContent.tsx
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
import { cn } from "../../../../lib/utils";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
// Import the new RangeIndicator component
import { RangeIndicator } from "@/components/ui/RangeIndicator";

const STATIC_BACK_FACE_DESCRIPTION =
  "Market Price: The value of a single unit of this asset.";

// RangeBarStyling interface and getRangeBarStyling function REMOVED

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
    const { faceData, backData } = cardData;
    const gridCellClass = "min-w-0";

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

    // Updated to be passed to RangeIndicator
    const handleRangeLabelClick =
      (
        levelType: "High" | "Low" | "YearHigh" | "YearLow",
        levelValue: number | null | undefined
      ) =>
      (
        event:
          | React.MouseEvent<HTMLDivElement>
          | React.KeyboardEvent<HTMLDivElement>
      ) => {
        if (onRangeContextClick && levelValue != null) {
          event.stopPropagation();
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
                <span>{formatNumberWithAbbreviations(faceData.volume)}</span>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Market Cap</span>
                <span>
                  ${formatNumberWithAbbreviations(backData.marketCap)}
                </span>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={!!(onSmaClick && backData.sma50d != null)}
                  onClickHandler={(e) =>
                    handleSmaInteraction(e, 50, backData.sma50d)
                  }
                  baseClassName="transition-colors w-full"
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
      // Day and Year range values remain needed here for the logic
      const dayLow = faceData.dayLow;
      const dayHigh = faceData.dayHigh;
      const yearLow = faceData.yearLow;
      const yearHigh = faceData.yearHigh;

      const PriceDisplayBlock = (
        <div
          className={cn(
            "w-fit",
            onGenerateDailyPerformanceSignal && "group/textgroup"
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
          }
          data-interactive-child={!!onGenerateDailyPerformanceSignal}>
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
          className="pointer-events-auto">
          <ShadCardContent className="px-0 pt-0 pb-0">
            <div
              className="rounded-md p-2 -mx-2 -my-1 mb-2"
              data-testid="daily-performance-layout-area">
              {PriceDisplayBlock}
            </div>

            {/* Daily Range Indicator */}
            <RangeIndicator
              containerClassName="mt-2 sm:mt-3"
              currentValue={currentPrice}
              lowValue={dayLow}
              highValue={dayHigh}
              lowLabel="Day Low"
              highLabel="Day High"
              onLowLabelClick={
                onRangeContextClick && dayLow != null
                  ? handleRangeLabelClick("Low", dayLow)
                  : undefined
              }
              onHighLabelClick={
                onRangeContextClick && dayHigh != null
                  ? handleRangeLabelClick("High", dayHigh)
                  : undefined
              }
              lowValueForTitle={dayLow}
              highValueForTitle={dayHigh}
              barHeightClassName="h-1.5"
              labelClassName="text-xs text-muted-foreground"
            />

            {/* Yearly Range Indicator */}
            <RangeIndicator
              containerClassName="mt-3 sm:mt-4"
              currentValue={currentPrice}
              lowValue={yearLow}
              highValue={yearHigh}
              lowLabel="52W Low"
              highLabel="52W High"
              onLowLabelClick={
                onRangeContextClick && yearLow != null
                  ? handleRangeLabelClick("YearLow", yearLow)
                  : undefined
              }
              onHighLabelClick={
                onRangeContextClick && yearHigh != null
                  ? handleRangeLabelClick("YearHigh", yearHigh)
                  : undefined
              }
              lowValueForTitle={yearLow}
              highValueForTitle={yearHigh}
              barHeightClassName="h-1 sm:h-1.5"
              labelClassName="text-[10px] sm:text-xs text-muted-foreground/90"
            />
          </ShadCardContent>
        </div>
      );
    }
  }
);

PriceCardContent.displayName = "PriceCardContent";
