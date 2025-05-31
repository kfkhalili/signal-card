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
import { DataRow } from "@/components/ui/DataRow";

interface HistogramBarProps {
  year: number;
  totalDividend: number;
  maxValue: number;
  currency: string | null;
  isEstimate?: boolean;
}

const HistogramBar: React.FC<HistogramBarProps> = ({
  year,
  totalDividend,
  maxValue,
  currency,
  isEstimate = false,
}) => {
  const barHeightPercentage =
    maxValue > 0 ? (totalDividend / maxValue) * 100 : 0;
  const displayCurrencySymbol = currency === "USD" ? "$" : currency || "$";
  const barColor = isEstimate ? "bg-primary/50" : "bg-primary";

  return (
    <div
      className="flex flex-col items-center w-1/4 px-1"
      title={`Year: ${year}${
        isEstimate ? " (Est.)" : ""
      }\nTotal: ${displayCurrencySymbol}${totalDividend.toFixed(2)}`}>
      <span className="text-[10px] font-semibold text-foreground">
        {displayCurrencySymbol}
        {formatNumberWithAbbreviations(totalDividend, 2)}
      </span>
      <div
        className={cn(
          "w-full h-24 bg-muted rounded flex items-end",
          isEstimate ? "border-2 border-primary/50 border-dashed" : ""
        )}>
        <div
          className={cn("w-full rounded-t", barColor)}
          style={{ height: `${barHeightPercentage}%` }}
        />
      </div>
      <span className="text-xs mt-1 text-muted-foreground">
        {year}
        {isEstimate ? <span className="text-[9px]"> (Est.)</span> : ""}
      </span>
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

    // Ensure liveData and its properties are correctly accessed with defaults
    const latestDividend = liveData?.latestDividend || null;
    const annualDividendFigures = liveData?.annualDividendFigures || []; // Default to empty array
    const lastFullYearDividendGrowthYoY =
      liveData?.lastFullYearDividendGrowthYoY || null;

    if (isBackFace) {
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
              isValueAsPercentage={true}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-xs sm:text-sm"
              title={
                latestDividend && latestDividend.yieldAtDistribution !== null
                  ? `Yield at distribution: ${latestDividend.yieldAtDistribution.toFixed(
                      2
                    )}%`
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
      // Front Face: Histogram & Growth YoY
      const safeAnnualDividendFigures = Array.isArray(annualDividendFigures)
        ? annualDividendFigures
        : [];
      const maxAnnualTotal = Math.max(
        ...safeAnnualDividendFigures.map((at) => at.totalDividend),
        0
      );

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

            {safeAnnualDividendFigures.length > 0 ? (
              <>
                <h4 className="text-xs font-semibold text-center text-muted-foreground mb-1 mt-1">
                  Annual Dividends Paid
                </h4>
                <div className="flex justify-around items-end h-32 sm:h-36 my-1 px-0.5">
                  {safeAnnualDividendFigures.map((item) => (
                    <HistogramBar
                      key={item.year}
                      year={item.year}
                      totalDividend={item.totalDividend}
                      maxValue={maxAnnualTotal}
                      currency={currency}
                      isEstimate={item.isEstimate}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No annual dividend data to display.
              </p>
            )}
            <div className="mt-2">
              <DataRow
                label="Growth (YoY)"
                value={lastFullYearDividendGrowthYoY}
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
