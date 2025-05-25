// src/components/game/cards/price-card/PriceCardContent.tsx
import React from "react";
import {
  CardHeader,
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import type { PriceCardData } from "./price-card.types";
import { cn } from "../../../../lib/utils";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { RangeIndicator } from "@/components/ui/RangeIndicator";
import type {
  OnGenericInteraction,
  CardType as BaseCardType,
  InteractionPayload,
} from "../base-card/base-card.types";

const STATIC_BACK_FACE_DESCRIPTION =
  "Market Price: The value of a single unit of this asset.";

interface PriceCardContentProps {
  cardData: PriceCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: BaseCardType;
}

export const PriceCardContent = React.memo<PriceCardContentProps>(
  ({
    cardData,
    isBackFace,
    onGenericInteraction,
    sourceCardId,
    sourceCardType,
  }) => {
    const { liveData, backData } = cardData; // Destructure new data structure
    const gridCellClass = "min-w-0";

    const getClickableDataInteractionProps = (
      targetType: BaseCardType,
      ariaLabelContext: string
    ) => ({
      interactionTarget: "card" as const,
      targetType,
      sourceCardId,
      sourceCardSymbol: cardData.symbol,
      sourceCardType,
      onGenericInteraction,
      "aria-label": `Request ${targetType} card related to ${ariaLabelContext} for ${cardData.symbol}`,
      "data-interactive-child": true as const,
    });

    const createInteractionPayload = (
      targetType: BaseCardType
    ): InteractionPayload => ({
      interactionTarget: "card",
      targetType,
      sourceCardId,
      sourceCardSymbol: cardData.symbol,
      sourceCardType,
    });

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
                  isInteractive={liveData.dayOpen != null}
                  baseClassName="transition-colors w-full"
                  data-testid="open-price-interactive-area"
                  {...getClickableDataInteractionProps(
                    "profile",
                    `Open Price: ${liveData.dayOpen?.toFixed(2)}`
                  )}>
                  <span className="font-semibold block">Open</span>
                  <span>${liveData.dayOpen?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Prev Close</span>
                <span>${liveData.previousClose?.toFixed(2) ?? "N/A"}</span>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Volume</span>
                <span>{formatNumberWithAbbreviations(liveData.volume)}</span>
              </div>
              <div className={cn(gridCellClass, "py-0.5")}>
                <span className="font-semibold block">Market Cap</span>
                <span>
                  ${formatNumberWithAbbreviations(liveData.marketCap)}
                </span>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.sma50d != null}
                  baseClassName="transition-colors w-full"
                  data-testid="sma-50d-interactive-area"
                  {...getClickableDataInteractionProps(
                    "price", // Or "profile" if preferred
                    `50D SMA: ${liveData.sma50d?.toFixed(2)}`
                  )}>
                  <span className="font-semibold block">50D SMA</span>
                  <span>${liveData.sma50d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.sma200d != null}
                  baseClassName="transition-colors w-full"
                  data-testid="sma-200d-interactive-area"
                  {...getClickableDataInteractionProps(
                    "price", // Or "profile"
                    `200D SMA: ${liveData.sma200d?.toFixed(2)}`
                  )}>
                  <span className="font-semibold block">200D SMA</span>
                  <span>${liveData.sma200d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face
      const currentPrice = liveData.price;
      const dayLow = liveData.dayLow;
      const dayHigh = liveData.dayHigh;
      const yearLow = liveData.yearLow;
      const yearHigh = liveData.yearHigh;

      const PriceDisplayBlock = (
        <ClickableDataItem
          isInteractive={true}
          baseClassName={cn("w-fit group/textgroup")}
          data-testid="price-display-interactive-area"
          {...getClickableDataInteractionProps(
            "profile",
            `Current Price: ${liveData.price?.toFixed(2)}`
          )}>
          <p
            className={cn(
              "text-2xl sm:text-3xl md:text-4xl font-bold",
              "group-hover/textgroup:text-primary"
            )}
            title="Current Price">
            ${liveData.price != null ? liveData.price.toFixed(2) : "N/A"}
          </p>
          <div
            className={cn(
              "flex items-baseline space-x-1 sm:space-x-2",
              liveData.dayChange === 0 || liveData.dayChange == null
                ? "text-muted-foreground"
                : liveData.dayChange > 0
                ? "text-green-600"
                : "text-red-600",
              "group-hover/textgroup:text-primary"
            )}>
            <p
              className="text-base sm:text-lg font-semibold"
              title="Day Change">
              {liveData.dayChange != null
                ? `${
                    liveData.dayChange >= 0 ? "+" : ""
                  }${liveData.dayChange.toFixed(2)}`
                : "N/A"}
            </p>
            <p
              className="text-base sm:text-lg font-semibold"
              title="Percent Change">
              (
              {liveData.changePercentage != null
                ? `${
                    liveData.changePercentage >= 0 ? "+" : ""
                  }${liveData.changePercentage.toFixed(2)}%`
                : "N/A"}
              )
            </p>
          </div>
        </ClickableDataItem>
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

            <RangeIndicator
              containerClassName="mt-2 sm:mt-3"
              currentValue={currentPrice}
              lowValue={dayLow}
              highValue={dayHigh}
              lowLabel="Day Low"
              highLabel="Day High"
              onLowLabelClick={() =>
                onGenericInteraction(createInteractionPayload("profile"))
              }
              onHighLabelClick={() =>
                onGenericInteraction(createInteractionPayload("profile"))
              }
              lowValueForTitle={dayLow}
              highValueForTitle={dayHigh}
              barHeightClassName="h-1.5"
              labelClassName="text-xs text-muted-foreground"
            />

            <RangeIndicator
              containerClassName="mt-3 sm:mt-4"
              currentValue={currentPrice}
              lowValue={yearLow}
              highValue={yearHigh}
              lowLabel="52W Low"
              highLabel="52W High"
              onLowLabelClick={() =>
                onGenericInteraction(createInteractionPayload("profile"))
              }
              onHighLabelClick={() =>
                onGenericInteraction(createInteractionPayload("profile"))
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
