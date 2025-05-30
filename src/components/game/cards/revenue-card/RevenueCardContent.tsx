// src/components/game/cards/revenue-card/RevenueCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RevenueCardData } from "./revenue-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
} from "../base-card/base-card.types";

interface DataRowProps {
  label: string;
  value: string | number | null | undefined;
  currency?: string | null;
  isMonetary?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  "data-testid"?: string;
  title?: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  currency,
  isMonetary = true,
  className,
  labelClassName,
  valueClassName,
  "data-testid": dataTestId,
  title,
  onClick,
  isInteractive,
}) => {
  const displayCurrencySymbol = currency === "USD" ? "$" : currency || "$";

  const formattedValue =
    value === null || value === undefined || Number.isNaN(value)
      ? "N/A"
      : isMonetary
      ? `${displayCurrencySymbol}${formatNumberWithAbbreviations(
          value as number,
          2
        )}`
      : typeof value === "string"
      ? value
      : formatNumberWithAbbreviations(value as number, 2);

  return (
    <div
      className={cn(
        "flex justify-between items-baseline py-0.5 group/datarow",
        isInteractive && onClick ? "cursor-pointer rounded px-1 -mx-1" : "", // Removed hover:bg-muted/50 dark:hover:bg-muted/20
        className
      )}
      data-testid={dataTestId}
      title={title || `${label}: ${value ?? "N/A"}`}
      onClick={isInteractive && onClick ? onClick : undefined}
      onKeyDown={
        isInteractive && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={isInteractive && onClick ? "button" : undefined}
      tabIndex={isInteractive && onClick ? 0 : undefined}>
      <span
        className={cn(
          "text-muted-foreground mr-2",
          isInteractive && onClick
            ? "group-hover/datarow:text-primary transition-colors"
            : "",
          labelClassName
        )}>
        {label}
      </span>
      <span
        className={cn(
          "font-semibold text-foreground text-right",
          isInteractive && onClick
            ? "group-hover/datarow:text-primary transition-colors"
            : "",
          valueClassName
        )}>
        {formattedValue}
      </span>
    </div>
  );
};

interface RevenueCardContentProps {
  cardData: RevenueCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const RevenueCardContent: React.FC<RevenueCardContentProps> = React.memo(
  ({ cardData, isBackFace, onGenericInteraction }) => {
    const {
      staticData,
      liveData,
      symbol,
      companyName,
      backData,
      id,
      type: cardType,
    } = cardData;
    const currency = staticData.reportedCurrency;

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
        sourceCardType: cardType,
        ...details,
      } as InteractionPayload;
      onGenericInteraction(payload);
    };

    if (isBackFace) {
      return (
        <div
          data-testid={`revenue-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1 sm:space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2.5 px-1 leading-relaxed">
              {backData.description ||
                `Financial highlights for ${companyName || symbol}.`}
            </CardDescription>

            <div className="pt-1.5 space-y-0.5 text-[10px] sm:text-xs border-t mt-1.5">
              <DataRow
                label="Period:"
                value={staticData.periodLabel}
                isMonetary={false}
                isInteractive={!!staticData.periodLabel}
                onClick={() => {
                  if (staticData.periodLabel) {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "periodLabelBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-muted-foreground/90"
                valueClassName="text-foreground font-medium"
              />
              <DataRow
                label="Currency:"
                value={staticData.reportedCurrency || "N/A"}
                isMonetary={false}
                isInteractive={!!staticData.reportedCurrency}
                onClick={() => {
                  if (staticData.reportedCurrency) {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "currencyValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-muted-foreground/90"
                valueClassName="text-foreground"
              />
              {staticData.statementDate && (
                <DataRow
                  label="Statement Date:"
                  value={staticData.statementDate}
                  isMonetary={false}
                  isInteractive={true}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "statementDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  labelClassName="text-muted-foreground/90"
                  valueClassName="text-foreground"
                />
              )}
              {staticData.filingDate && (
                <DataRow
                  label="Filing Date:"
                  value={staticData.filingDate}
                  isMonetary={false}
                  isInteractive={true}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "filingDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  labelClassName="text-muted-foreground/90"
                  valueClassName="text-foreground"
                />
              )}
              {staticData.acceptedDate && (
                <DataRow
                  label="Accepted Date:"
                  value={staticData.acceptedDate.substring(0, 10)}
                  isMonetary={false}
                  isInteractive={true}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "acceptedDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  labelClassName="text-muted-foreground/90"
                  valueClassName="text-foreground"
                />
              )}
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face (remains unchanged)
      return (
        <div
          data-testid={`revenue-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <div className="text-center mb-1.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "revenue",
                    originatingElement: "revenueBadge",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                title={"Revenue Card"}
                baseClassName="inline-block">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 py-0.5">
                  Revenue
                </Badge>
              </ClickableDataItem>
            </div>

            <DataRow
              label="Revenue"
              value={liveData.revenue}
              currency={currency}
              className="mb-1"
              labelClassName="text-base sm:text-lg md:text-xl"
              valueClassName="text-base sm:text-lg md:text-xl"
              data-testid="revenue-value-front"
              isInteractive={true}
              onClick={() =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: "price",
                  originatingElement: "revenueMetric",
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
            />
            <DataRow
              label="Gross Profit"
              value={liveData.grossProfit}
              currency={currency}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="gross-profit-value-front"
              isInteractive={true}
              onClick={() =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: "price",
                  originatingElement: "grossProfitMetric",
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
            />
            <DataRow
              label="Operating Income"
              value={liveData.operatingIncome}
              currency={currency}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="operating-income-value-front"
              isInteractive={true}
              onClick={() =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: "price",
                  originatingElement: "operatingIncomeMetric",
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
            />
            <DataRow
              label="Net Income"
              value={liveData.netIncome}
              currency={currency}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="net-income-value-front"
              isInteractive={true}
              onClick={() =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: "price",
                  originatingElement: "netIncomeMetric",
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
            />
            <DataRow
              label="Free Cash Flow"
              value={liveData.freeCashFlow}
              currency={currency}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="fcf-value-front"
              isInteractive={true}
              onClick={() =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: "price",
                  originatingElement: "fcfMetric",
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
            />
          </ShadCardContent>
          <div className="px-0 pt-1 text-[10px] text-center text-muted-foreground/80">
            <p>
              Currency: {staticData.reportedCurrency || "N/A"}. Statement:{" "}
              {staticData.statementDate} ({staticData.statementPeriod})
            </p>
          </div>
        </div>
      );
    }
  }
);

RevenueCardContent.displayName = "RevenueCardContent";
