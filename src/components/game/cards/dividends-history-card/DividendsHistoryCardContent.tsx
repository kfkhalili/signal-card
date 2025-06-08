// src/components/game/cards/dividends-history-card/DividendsHistoryCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { DividendsHistoryCardData } from "./dividends-history-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import type { OnGenericInteraction } from "../base-card/base-card.types";
import { DataRow } from "@/components/ui/DataRow";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";

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
  onGenericInteraction: OnGenericInteraction;
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const DividendsHistoryCardContent: React.FC<DividendsHistoryCardContentProps> =
  React.memo(
    ({
      cardData,
      isBackFace,
      // NEW PROPS
      isSelectionMode,
      selectedDataItems,
      onToggleItemSelection,
    }) => {
      const { staticData, liveData, symbol, id } = cardData;
      const currency = staticData.reportedCurrency;

      const latestDividend = liveData?.latestDividend || null;
      const annualDividendFigures = liveData?.annualDividendFigures || [];
      const lastFullYearDividendGrowthYoY =
        liveData?.lastFullYearDividendGrowthYoY || null;

      const isSelected = (itemId: string) =>
        selectedDataItems.some((item) => item.id === itemId);

      const onSelect = (item: Omit<SelectedDataItem, "id">) => {
        const fullItem: SelectedDataItem = {
          id: `${id}-${item.label.toLowerCase().replace(/\s|\./g, "-")}`,
          ...item,
        };
        onToggleItemSelection(fullItem);
      };

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
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-last-dividend`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Last Dividend",
                      value: latestDividend?.amount,
                      isMonetary: true,
                      currency: currency,
                    })
                  }
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
                      isSelectionMode={isSelectionMode}
                      isSelected={isSelected(`${id}-adj-dividend`)}
                      onSelect={() =>
                        onSelect({
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: "Adjusted Dividend",
                          value: latestDividend.adjAmount,
                          isMonetary: true,
                          currency: currency,
                        })
                      }
                    />
                  )}
                <DataRow
                  label="Ex-Date"
                  value={latestDividend?.exDividendDate}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-ex-date`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Ex-Date",
                      value: latestDividend?.exDividendDate || "N/A",
                    })
                  }
                />
                <DataRow
                  label="Payment Date"
                  value={latestDividend?.paymentDate || "N/A"}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-payment-date`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Payment Date",
                      value: latestDividend?.paymentDate || "N/A",
                    })
                  }
                />
                <DataRow
                  label="Declaration Date"
                  value={latestDividend?.declarationDate || "N/A"}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-declaration-date`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Declaration Date",
                      value: latestDividend?.declarationDate || "N/A",
                    })
                  }
                />
                <DataRow
                  label="Yield (at dist.)"
                  value={latestDividend?.yieldAtDistribution}
                  isValueAsPercentage={true}
                  precision={2}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  title={
                    latestDividend &&
                    latestDividend.yieldAtDistribution !== null
                      ? `Yield at distribution: ${(
                          latestDividend.yieldAtDistribution * 100
                        ).toFixed(2)}%`
                      : "Yield at distribution: N/A"
                  }
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-yield-at-dist`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Yield (at dist.)",
                      value: latestDividend?.yieldAtDistribution,
                      isValueAsPercentage: true,
                    })
                  }
                />
                <DataRow
                  label="Typical Frequency"
                  value={staticData.typicalFrequency || "N/A"}
                  isInteractive={false}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-frequency`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Frequency",
                      value: staticData.typicalFrequency || "N/A",
                    })
                  }
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
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    title={
                      lastFullYearDividendGrowthYoY !== null
                        ? `Last full year total dividend growth YoY: ${(
                            lastFullYearDividendGrowthYoY * 100
                          ).toFixed(2)}%`
                        : "Last full year total dividend growth YoY: N/A"
                    }
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-growth-yoy`)}
                    onSelect={() =>
                      onSelect({
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Dividend Growth (YoY)",
                        value: lastFullYearDividendGrowthYoY,
                        isValueAsPercentage: true,
                      })
                    }
                  />
                </div>
              </div>
            </ShadCardContent>
          </div>
        );
      }
    }
  );

DividendsHistoryCardContent.displayName = "DividendsHistoryCardContent";
