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
  CardType,
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
      : formatNumberWithAbbreviations(value as number, 2);

  return (
    <div
      className={cn(
        "flex justify-between items-baseline py-0.5 group/datarow",
        isInteractive && onClick ? "cursor-pointer rounded px-1 -mx-1" : "",
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

    // Updated helper to use the new InteractionPayload structure
    const handleInteraction = (
      targetCardType: CardType,
      originatingElement?: string
    ): void => {
      const payload: RequestNewCardInteraction = {
        intent: "REQUEST_NEW_CARD",
        targetCardType,
        sourceCardId: id,
        sourceCardSymbol: symbol,
        sourceCardType: cardType,
        originatingElement: originatingElement || "dataRow",
      };
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

            <div className="pt-1.5 space-y-0.5 text-[10px] sm:text-xs text-muted-foreground/90 border-t mt-1.5">
              <div className="flex items-center justify-between font-medium text-foreground">
                <span>Period:</span>
                <span>{staticData.periodLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Currency:</span>
                <span>{staticData.reportedCurrency || "N/A"}</span>
              </div>
              {staticData.statementDate && (
                <div className="flex items-center justify-between">
                  <span>Statement Date:</span>
                  <span>{staticData.statementDate}</span>
                </div>
              )}
              {staticData.filingDate && (
                <div className="flex items-center justify-between">
                  <span>Filing Date:</span>
                  <span>{staticData.filingDate}</span>
                </div>
              )}
              {staticData.acceptedDate && (
                <div className="flex items-center justify-between">
                  <span>Accepted Date:</span>
                  <span>{staticData.acceptedDate.substring(0, 10)}</span>
                </div>
              )}
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face
      return (
        <div
          data-testid={`revenue-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <div className="text-center mb-1.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("profile", "periodLabelBadge")
                }
                title={`View profile for ${companyName || symbol}`}
                baseClassName="inline-block">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 py-0.5">
                  {staticData.periodLabel}
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
              onClick={() => handleInteraction("price", "revenueMetric")}
            />
            <DataRow
              label="Gross Profit"
              value={liveData.grossProfit}
              currency={currency}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="gross-profit-value-front"
              isInteractive={true}
              onClick={() => handleInteraction("price", "grossProfitMetric")}
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
                handleInteraction("price", "operatingIncomeMetric")
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
              onClick={() => handleInteraction("price", "netIncomeMetric")}
            />
            <DataRow
              label="Free Cash Flow"
              value={liveData.freeCashFlow}
              currency={currency}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="fcf-value-front"
              isInteractive={true}
              onClick={() => handleInteraction("price", "fcfMetric")}
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
