// src/components/game/cards/dividends-history-card/DividendsHistoryCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { DividendsHistoryCardData } from "./dividends-history-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import type { OnGenericInteraction } from "../base-card/base-card.types"; // Assuming no interactions for now
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
      <span className="text-xs font-semibold text-foreground">
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
        {isEstimate ? (
          <span className="text-[9px] text-muted-foreground"> (Est.)</span>
        ) : (
          ""
        )}
      </span>
    </div>
  );
};

interface DividendsHistoryCardContentProps {
  cardData: DividendsHistoryCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction; // Kept for future use, though not used in this version
}

export const DividendsHistoryCardContent: React.FC<DividendsHistoryCardContentProps> =
  React.memo(({ cardData, isBackFace }) => {
    const { staticData, liveData, symbol } = cardData;
    const currency = staticData.reportedCurrency;

    const latestDividend = liveData?.latestDividend || null;
    const annualDividendFigures = liveData?.annualDividendFigures || [];
    const lastFullYearDividendGrowthYoY =
      liveData?.lastFullYearDividendGrowthYoY || null;

    if (isBackFace) {
      return (
        <div
          data-testid={`dividendshistory-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
            <div className="space-y-1 pt-1.5">
              <DataRow
                label="Last Dividend"
                value={latestDividend?.amount}
                currency={currency}
                isMonetary={true}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
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
                    labelClassName="text-xs font-medium text-muted-foreground"
                    valueClassName="text-xs font-semibold text-foreground"
                    title={`Adjusted Dividend: ${latestDividend.adjAmount.toFixed(
                      4
                    )} ${currency || ""}`}
                  />
                )}
              <DataRow
                label="Ex-Date"
                value={latestDividend?.exDividendDate}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
              />
              <DataRow
                label="Payment Date"
                value={latestDividend?.paymentDate || "N/A"}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
              />
              <DataRow
                label="Declaration Date"
                value={latestDividend?.declarationDate || "N/A"}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
              />
              <DataRow
                label="Yield (at dist.)"
                value={latestDividend?.yieldAtDistribution}
                isValueAsPercentage={true}
                precision={2} // Ensure precision is passed for percentage formatting
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
                title={
                  latestDividend && latestDividend.yieldAtDistribution !== null
                    ? `Yield at distribution: ${(
                        latestDividend.yieldAtDistribution * 100
                      ).toFixed(
                        2 // Multiply by 100 for title if DataRow doesn't do it for title
                      )}%`
                    : "Yield at distribution: N/A"
                }
              />
              <DataRow
                label="Typical Frequency"
                value={staticData.typicalFrequency || "N/A"}
                isInteractive={false}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
              />
            </div>
          </ShadCardContent>
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
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1.5">
              {safeAnnualDividendFigures.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No annual dividend data to display.
                </p>
              )}
              <div className="mt-2">
                <DataRow
                  label="Growth (YoY)"
                  value={lastFullYearDividendGrowthYoY}
                  isValueAsPercentage={true}
                  precision={2}
                  labelClassName="text-sm font-medium text-muted-foreground" // Standardized
                  valueClassName="text-sm font-semibold text-foreground" // Standardized
                  title={
                    lastFullYearDividendGrowthYoY !== null
                      ? `Last full year total dividend growth YoY: ${(
                          lastFullYearDividendGrowthYoY * 100
                        ).toFixed(2)}%`
                      : "Last full year total dividend growth YoY: N/A"
                  }
                />
              </div>
            </div>
          </ShadCardContent>
        </div>
      );
    }
  });

DividendsHistoryCardContent.displayName = "DividendsHistoryCardContent";
