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
  sourceCardSymbol: string; // Should be the symbol of the current card
  sourceCardType: BaseCardType; // Should be "price" for this component
}

export const PriceCardContent = React.memo<PriceCardContentProps>(
  ({
    cardData,
    isBackFace,
    onGenericInteraction,
    sourceCardId,
    sourceCardType, // This is "price"
  }) => {
    const { faceData, backData } = cardData;
    const gridCellClass = "min-w-0";

    // Helper to create ClickableDataItem props, ensuring symbol is from cardData
    const getClickableDataInteractionProps = (
      targetType: BaseCardType,
      ariaLabelContext: string
    ) => ({
      interactionTarget: "card" as const,
      targetType,
      sourceCardId,
      sourceCardSymbol: cardData.symbol, // Explicitly use cardData.symbol for clarity
      sourceCardType, // This will be "price"
      onGenericInteraction,
      "aria-label": `Request ${targetType} card related to ${ariaLabelContext} for ${cardData.symbol}`,
      "data-interactive-child": true as const,
    });

    // Helper to construct payload for direct onGenericInteraction calls
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
                  isInteractive={faceData.dayOpen != null}
                  baseClassName="transition-colors w-full"
                  data-testid="open-price-interactive-area"
                  {...getClickableDataInteractionProps(
                    "profile",
                    `Open Price: ${faceData.dayOpen?.toFixed(2)}`
                  )}>
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
                  isInteractive={backData.sma50d != null}
                  baseClassName="transition-colors w-full"
                  data-testid="sma-50d-interactive-area"
                  {...getClickableDataInteractionProps(
                    "price",
                    `50D SMA: ${backData.sma50d?.toFixed(2)}`
                  )}>
                  <span className="font-semibold block">50D SMA</span>
                  <span>${backData.sma50d?.toFixed(2) ?? "N/A"}</span>
                </ClickableDataItem>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={backData.sma200d != null}
                  baseClassName="transition-colors w-full"
                  data-testid="sma-200d-interactive-area"
                  {...getClickableDataInteractionProps(
                    "price",
                    `200D SMA: ${backData.sma200d?.toFixed(2)}`
                  )}>
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

      const PriceDisplayBlock = (
        <ClickableDataItem
          isInteractive={true}
          baseClassName={cn("w-fit group/textgroup")}
          data-testid="price-display-interactive-area"
          {...getClickableDataInteractionProps(
            "profile",
            `Current Price: ${faceData.price?.toFixed(2)}`
          )}>
          <p
            className={cn(
              "text-2xl sm:text-3xl md:text-4xl font-bold",
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
