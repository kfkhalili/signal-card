// src/components/game/cards/dividends-history-card/DividendsHistoryCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DividendsHistoryCardData } from "./dividends-history-card.types";
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
  title?: string;
  onClick?: () => void;
  isInteractive?: boolean;
  precision?: number;
  isValueAsPercentage?: boolean; // New prop
}

const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  currency,
  isMonetary = false,
  className,
  labelClassName,
  valueClassName,
  title,
  onClick,
  isInteractive,
  precision = 2,
  isValueAsPercentage = false, // Default to false
}) => {
  const displayCurrencySymbol =
    currency === "USD" ? "$" : currency || (isMonetary ? "$" : "");

  let formattedValue: string;
  if (value === null || value === undefined || Number.isNaN(value)) {
    formattedValue = "N/A";
  } else if (typeof value === "number") {
    if (isMonetary) {
      formattedValue = `${displayCurrencySymbol}${formatNumberWithAbbreviations(
        value,
        precision
      )}`;
    } else if (isValueAsPercentage) {
      // If value is already a direct percentage
      formattedValue = `${value.toFixed(precision)}%`;
    } else if (label.toLowerCase().includes("growth")) {
      // Growth rates are usually decimals needing *100
      formattedValue = `${(value * 100).toFixed(precision)}%`;
    } else {
      // For other numbers that are not monetary and not specific percentages
      formattedValue = value.toFixed(precision);
    }
  } else {
    formattedValue = value;
  }

  return (
    <div
      className={cn(
        "flex justify-between items-baseline py-0.5 group/datarow text-xs sm:text-sm",
        isInteractive && onClick ? "cursor-pointer rounded px-1 -mx-1" : "",
        className
      )}
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

interface HistogramBarProps {
  year: number;
  totalDividend: number;
  maxValue: number;
  currency: string | null;
}

const HistogramBar: React.FC<HistogramBarProps> = ({
  year,
  totalDividend,
  maxValue,
  currency,
}) => {
  const barHeightPercentage =
    maxValue > 0 ? (totalDividend / maxValue) * 100 : 0;
  const displayCurrencySymbol = currency === "USD" ? "$" : currency || "$";

  return (
    <div
      className="flex flex-col items-center w-1/3 px-1"
      title={`Year: ${year}\nTotal: ${displayCurrencySymbol}${totalDividend.toFixed(
        2
      )}`}>
      <span className="text-[10px] font-semibold text-foreground">
        {displayCurrencySymbol}
        {formatNumberWithAbbreviations(totalDividend, 2)}
      </span>
      <div className="w-full h-24 bg-muted rounded flex items-end">
        <div
          className="w-full bg-primary rounded-t"
          style={{ height: `${barHeightPercentage}%` }}
        />
      </div>
      <span className="text-xs mt-1 text-muted-foreground">{year}</span>
    </div>
  );
};

interface DividendsHistoryCardContentProps {
  cardData: DividendsHistoryCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const DividendsHistoryCardContent: React.FC<DividendsHistoryCardContentProps> =
  React.memo(({ cardData, isBackFace, onGenericInteraction }) => {
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

    const {
      latestDividend,
      annualTotalsLast3Years,
      lastFullYearDividendGrowthYoY,
    } = liveData;

    if (isBackFace) {
      // Content previously on the front face, now on the back (Latest Dividend Details)
      return (
        <div
          data-testid={`dividendshistory-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1 sm:space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2 px-1 leading-relaxed">
              {backData.description ||
                `Dividend payment history for ${companyName || symbol}.`}
            </CardDescription>

            <DataRow
              label="Last Dividend"
              value={latestDividend?.amount}
              currency={currency}
              isMonetary={true}
              className="mb-0.5"
              labelClassName="text-sm sm:text-base"
              valueClassName="text-sm sm:text-base"
              title={`Latest Dividend: ${
                latestDividend?.amount?.toFixed(4) || "N/A"
              } ${currency || ""}`}
            />
            {latestDividend?.adjAmount &&
              latestDividend.adjAmount !== latestDividend.amount && (
                <DataRow
                  label="Adjusted"
                  value={latestDividend.adjAmount}
                  currency={currency}
                  isMonetary={true}
                  labelClassName="text-xs"
                  valueClassName="text-xs"
                  title={`Adjusted Dividend: ${latestDividend.adjAmount.toFixed(
                    4
                  )} ${currency || ""}`}
                />
              )}
            <DataRow
              label="Ex-Date"
              value={latestDividend?.exDividendDate}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-xs sm:text-sm"
            />
            <DataRow
              label="Payment Date"
              value={latestDividend?.paymentDate || "N/A"}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-xs sm:text-sm"
            />
            <DataRow
              label="Declaration Date"
              value={latestDividend?.declarationDate || "N/A"}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-xs sm:text-sm"
            />
            <DataRow
              label="Yield (at dist.)"
              value={latestDividend?.yieldAtDistribution}
              isValueAsPercentage={true} // Correctly handle pre-formatted percentage
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-xs sm:text-sm"
              title={
                latestDividend && latestDividend.yieldAtDistribution !== null
                  ? `Yield at distribution: ${latestDividend.yieldAtDistribution.toFixed(
                      2
                    )}%` // No *100
                  : "Yield at distribution: N/A"
              }
            />
            <DataRow
              label="Typical Frequency"
              value={staticData.typicalFrequency}
              isInteractive={false}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-xs sm:text-sm"
            />
          </ShadCardContent>
          <div className="px-0 pt-1 text-[10px] text-center text-muted-foreground/80">
            <p>
              Last Div. Data:{" "}
              {liveData.lastUpdated
                ? new Date(liveData.lastUpdated).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      );
    } else {
      // Front Face (Content previously on the back, now on the front - Histogram & Growth)
      const maxAnnualTotal = Math.max(
        ...annualTotalsLast3Years.map((at) => at.totalDividend),
        0
      );
      const displayableAnnualTotals = annualTotalsLast3Years.slice().reverse();

      return (
        <div
          data-testid={`dividendshistory-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1.5 flex-grow">
            <div className="text-center mb-1.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "dividendshistory",
                    originatingElement: "dividendsHistoryBadge",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                title={`View details for ${companyName || symbol} Dividends`}
                baseClassName="inline-block">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 py-0.5">
                  Dividend History
                </Badge>
              </ClickableDataItem>
            </div>

            {displayableAnnualTotals && displayableAnnualTotals.length > 0 && (
              <div className="flex justify-around items-end h-32 sm:h-36 my-1 px-0.5">
                {displayableAnnualTotals.map((item) => (
                  <HistogramBar
                    key={item.year}
                    year={item.year}
                    totalDividend={item.totalDividend}
                    maxValue={maxAnnualTotal}
                    currency={currency}
                  />
                ))}
              </div>
            )}
            <br />
            <div className="mt-2">
              <DataRow
                label="Growth (YoY)" // Growth rates are typically decimals, so they DO need *100
                value={lastFullYearDividendGrowthYoY} // This is correctly handled by the label.toLowerCase().includes("growth") in DataRow
                labelClassName="text-xs sm:text-sm"
                valueClassName="text-xs sm:text-sm font-semibold"
                title={
                  lastFullYearDividendGrowthYoY !== null
                    ? `Last full year total dividend growth YoY: ${(
                        lastFullYearDividendGrowthYoY * 100
                      ).toFixed(2)}%`
                    : "Last full year total dividend growth YoY: N/A"
                }
              />
            </div>
          </ShadCardContent>
          <div className="px-0 pt-1 text-[10px] text-center text-muted-foreground/80 mt-auto">
            <p>
              Currency: {staticData.reportedCurrency || "N/A"}. Data as of:{" "}
              {liveData.lastUpdated
                ? new Date(liveData.lastUpdated).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      );
    }
  });

DividendsHistoryCardContent.displayName = "DividendsHistoryCardContent";
