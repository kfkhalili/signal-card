// src/components/game/cards/price-card/PriceCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { PriceCardData } from "./price-card.types";
import { cn } from "@/lib/utils";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { RangeIndicator } from "@/components/ui/RangeIndicator";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  TriggerCardActionInteraction,
} from "../base-card/base-card.types";

interface PriceCardContentProps {
  cardData: PriceCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const PriceCardContent = React.memo<PriceCardContentProps>(
  ({ cardData, isBackFace, onGenericInteraction }) => {
    const { liveData, symbol, id, type } = cardData;
    const gridCellClass = "min-w-0";

    const handleInteraction = (
      intent: InteractionPayload["intent"],
      details: Omit<
        InteractionPayload,
        "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType"
      >
    ) => {
      const payload: InteractionPayload = {
        intent,
        sourceCardId: id,
        sourceCardSymbol: symbol,
        sourceCardType: type,
        ...details,
      } as InteractionPayload;
      onGenericInteraction(payload);
    };

    if (isBackFace) {
      return (
        <div
          data-testid="price-card-back-content-data"
          className="pointer-events-auto">
          <ShadCardContent className={cn("p-0 text-xs")}>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-1.5">
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.dayOpen != null}
                  onClickHandler={() => {
                    if (liveData.dayOpen != null) {
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "openPriceClick",
                        actionData: { value: liveData.dayOpen },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  baseClassName="transition-colors w-full"
                  data-testid="open-price-interactive-area"
                  title={`Open: ${liveData.dayOpen?.toFixed(2)}`}>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Open
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    ${liveData.dayOpen?.toFixed(2) ?? "N/A"}
                  </span>
                </ClickableDataItem>
              </div>

              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.previousClose != null}
                  onClickHandler={() => {
                    if (liveData.previousClose != null) {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "previousCloseValue",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  baseClassName="transition-colors w-full"
                  data-testid="previous-close-interactive-area"
                  title={`Previous Close: ${liveData.previousClose?.toFixed(
                    2
                  )}`}>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Prev Close
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    ${liveData.previousClose?.toFixed(2) ?? "N/A"}
                  </span>
                </ClickableDataItem>
              </div>

              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.volume != null}
                  onClickHandler={() => {
                    if (liveData.volume != null) {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "volumeValue",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  baseClassName="transition-colors w-full"
                  data-testid="volume-interactive-area"
                  title={`Volume: ${formatNumberWithAbbreviations(
                    liveData.volume
                  )}`}>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Volume
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {formatNumberWithAbbreviations(liveData.volume)}
                  </span>
                </ClickableDataItem>
              </div>

              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.marketCap != null}
                  onClickHandler={() => {
                    if (liveData.marketCap != null) {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "marketCapValue",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  baseClassName="transition-colors w-full"
                  data-testid="market-cap-interactive-area"
                  title={`Market Cap: $${formatNumberWithAbbreviations(
                    liveData.marketCap
                  )}`}>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Market Cap
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    ${formatNumberWithAbbreviations(liveData.marketCap)}
                  </span>
                </ClickableDataItem>
              </div>

              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.sma50d != null}
                  onClickHandler={() => {
                    if (liveData.sma50d != null) {
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "smaClick",
                        actionData: { period: 50, value: liveData.sma50d },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  baseClassName="transition-colors w-full"
                  data-testid="sma-50d-interactive-area"
                  title={`50D SMA: ${liveData.sma50d?.toFixed(2)}`}>
                  <span className="text-xs font-medium text-muted-foreground block">
                    50D SMA
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    ${liveData.sma50d?.toFixed(2) ?? "N/A"}
                  </span>
                </ClickableDataItem>
              </div>
              <div className={cn(gridCellClass)}>
                <ClickableDataItem
                  isInteractive={liveData.sma200d != null}
                  onClickHandler={() => {
                    if (liveData.sma200d != null) {
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "smaClick",
                        actionData: { period: 200, value: liveData.sma200d },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  baseClassName="transition-colors w-full"
                  data-testid="sma-200d-interactive-area"
                  title={`200D SMA: ${liveData.sma200d?.toFixed(2)}`}>
                  <span className="text-xs font-medium text-muted-foreground block">
                    200D SMA
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    ${liveData.sma200d?.toFixed(2) ?? "N/A"}
                  </span>
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
          onClickHandler={() =>
            handleInteraction("REQUEST_NEW_CARD", {
              targetCardType: "profile",
              originatingElement: "currentPrice",
            } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
          }
          title={`Current Price: ${liveData.price?.toFixed(2)}`}>
          <p
            className={cn(
              "text-xl font-bold sm:text-2xl",
              "group-hover/textgroup:text-primary"
            )}>
            ${liveData.price != null ? liveData.price.toFixed(2) : "N/A"}
          </p>
          <div
            className={cn(
              "flex items-baseline space-x-1 sm:space-x-2",
              liveData.dayChange === 0 || liveData.dayChange == null
                ? "text-muted-foreground"
                : liveData.dayChange > 0
                ? "text-green-600 dark:text-green-500"
                : "text-red-600 dark:text-red-500",
              "group-hover/textgroup:text-primary"
            )}>
            <p className="text-base font-semibold" title="Day Change">
              {liveData.dayChange != null
                ? `${
                    liveData.dayChange >= 0 ? "+" : ""
                  }${liveData.dayChange.toFixed(2)}`
                : "N/A"}
            </p>
            <p className="text-base font-semibold" title="Percent Change">
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
          <ShadCardContent className="p-0">
            <div
              className="rounded-md p-1 mb-2"
              data-testid="daily-performance-layout-area"
              onClick={() =>
                handleInteraction("TRIGGER_CARD_ACTION", {
                  actionName: "generateDailyPerformanceSignal",
                } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "generateDailyPerformanceSignal",
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }
              }}
              style={{ cursor: "pointer" }}>
              {PriceDisplayBlock}
            </div>

            <RangeIndicator
              containerClassName="mt-2 sm:mt-3"
              currentValue={currentPrice}
              lowValue={dayLow}
              highValue={dayHigh}
              lowLabel="Day Low"
              highLabel="Day High"
              onLowLabelClick={() => {
                if (dayLow !== null && dayLow !== undefined) {
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "rangeContextClick",
                    actionData: { levelType: "DayLow", value: dayLow },
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }
              }}
              onHighLabelClick={() => {
                if (dayHigh !== null && dayHigh !== undefined) {
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "rangeContextClick",
                    actionData: { levelType: "DayHigh", value: dayHigh },
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }
              }}
              lowValueForTitle={dayLow}
              highValueForTitle={dayHigh}
              labelClassName="text-xs text-muted-foreground"
              barHeightClassName="h-1.5"
            />

            <RangeIndicator
              containerClassName="mt-3 sm:mt-4"
              currentValue={currentPrice}
              lowValue={yearLow}
              highValue={yearHigh}
              lowLabel="52W Low"
              highLabel="52W High"
              onLowLabelClick={() => {
                if (yearLow !== null && yearLow !== undefined) {
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "rangeContextClick",
                    actionData: { levelType: "YearLow", value: yearLow },
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }
              }}
              onHighLabelClick={() => {
                if (yearHigh !== null && yearHigh !== undefined) {
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "rangeContextClick",
                    actionData: { levelType: "YearHigh", value: yearHigh },
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }
              }}
              lowValueForTitle={yearLow}
              highValueForTitle={yearHigh}
              labelClassName="text-xs text-muted-foreground"
              barHeightClassName="h-1.5"
            />
          </ShadCardContent>
        </div>
      );
    }
  }
);

PriceCardContent.displayName = "PriceCardContent";
