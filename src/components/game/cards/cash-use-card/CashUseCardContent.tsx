// src/components/game/cards/cash-use-card/CashUseCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { CashUseCardData, AnnualDataPoint } from "./cash-use-card.types";
import { cn } from "@/lib/utils";
import { formatFinancialValue } from "@/lib/formatters";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { LineChartComponent } from "@/components/ui/LineChart";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
} from "../base-card/base-card.types";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import {
  CheckboxCheckedIcon,
  CheckboxUncheckedIcon,
} from "@/components/ui/CheckboxIcons";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface MetricDisplayWithChartProps {
  label: string;
  currentValue: number | null;
  annualData: readonly AnnualDataPoint[];
  currency?: string | null;
  "data-testid"?: string;
  isMonetary?: boolean;
  onMetricClick?: () => void;
  tooltip?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  exchangeRates: Record<string, number>;
}

const MetricDisplayWithChart: React.FC<MetricDisplayWithChartProps> = ({
  label,
  currentValue,
  annualData,
  currency,
  "data-testid": dataTestId,
  isMonetary = true,
  onMetricClick,
  tooltip,
  isSelectionMode,
  isSelected,
  onSelect,
  exchangeRates,
}) => {
  // Don't render if value is null/undefined and no annual data
  if (
    (currentValue === null ||
      currentValue === undefined ||
      Number.isNaN(currentValue)) &&
    (!annualData || annualData.length === 0)
  ) {
    return null;
  }

  const formattedValue =
    currentValue === null ||
    currentValue === undefined ||
    Number.isNaN(currentValue)
      ? "N/A"
      : formatFinancialValue(currentValue, currency, 2, exchangeRates);

  const title = tooltip
    ? `${label}: ${formattedValue} (${tooltip})`
    : `${label}: ${formattedValue}`;

  const effectiveClickHandler = isSelectionMode ? onSelect : onMetricClick;
  const isClickable = isSelectionMode || !!onMetricClick;

  const chartData = annualData.map((d) => ({
    name: d.year.toString(),
    value: d.value,
  }));

  return (
    <div className="py-1 space-y-2" data-testid={dataTestId}>
      <ClickableDataItem
        isInteractive={isClickable}
        onClickHandler={effectiveClickHandler}
        title={title}
        baseClassName={cn(
          "flex justify-between items-baseline group/metric p-1 rounded-md transition-colors",
          isSelectionMode && "hover:bg-primary/10",
          isSelected && "bg-primary/20"
        )}
        interactiveClassName="cursor-pointer"
        aria-label={title}>
        <div className="flex items-center">
          {isSelectionMode && (
            <div className="mr-2 shrink-0">
              {isSelected ? (
                <CheckboxCheckedIcon className="text-primary" />
              ) : (
                <CheckboxUncheckedIcon className="text-muted-foreground" />
              )}
            </div>
          )}
          <span
            className={cn(
              "text-sm font-medium text-muted-foreground mr-2 group-hover/metric:text-primary"
            )}>
            {label}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-semibold text-foreground group-hover/metric:text-primary"
          )}>
          {formattedValue}
        </span>
      </ClickableDataItem>
      <LineChartComponent
        key={`${label}-${chartData.length}-${chartData.map(d => d.value).join('-')}`}
        data={chartData}
        xAxisKey="name"
        yAxisKey="value"
        currencySymbol={isMonetary ? "$" : ""}
      />
    </div>
  );
};

interface CashUseCardContentProps {
  cardData: CashUseCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const CashUseCardContent: React.FC<CashUseCardContentProps> = React.memo(
  ({
    cardData,
    isBackFace,
    onGenericInteraction,
    isSelectionMode,
    selectedDataItems,
    onToggleItemSelection,
  }) => {
    const { staticData, liveData, symbol, id, type: cardType } = cardData;
    const currency = staticData.reportedCurrency;
    const exchangeRates = useExchangeRate();

    const handleInteraction = (
      intent: InteractionPayload["intent"],
      details: Omit<
        InteractionPayload,
        "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType"
      >
    ) => {
      if (isSelectionMode) return;
      const payload: InteractionPayload = {
        intent,
        sourceCardId: id,
        sourceCardSymbol: symbol,
        sourceCardType: cardType,
        ...details,
      } as InteractionPayload;
      onGenericInteraction(payload);
    };

    const isSelected = (itemId: string) =>
      selectedDataItems.some((item) => item.id === itemId);

    const onSelect = (item: Omit<SelectedDataItem, "id">) => {
      const fullItem: SelectedDataItem = {
        id: `${id}-${item.label.toLowerCase().replace(/\s/g, "-")}`,
        ...item,
      };
      onToggleItemSelection(fullItem);
    };

    if (isBackFace) {
      return (
        <div
          data-testid={`cashuse-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
            <div className="pt-1.5 space-y-2">
              {liveData.weightedAverageShsOut ||
              liveData.outstandingShares_annual_data?.some(
                (d) => d.value !== 0
              ) ? (
                <MetricDisplayWithChart
                  label="Basic Average Shares"
                  currentValue={liveData.weightedAverageShsOut}
                  annualData={liveData.outstandingShares_annual_data}
                  isMonetary={false}
                  data-testid="outstanding-shares-metric-back"
                  tooltip="Number of shares"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-avg-shares-out`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Basic Avg. Shares",
                      value: liveData.weightedAverageShsOut,
                    })
                  }
                  exchangeRates={exchangeRates}
                />
              ) : null}

              {liveData.currentNetDividendsPaid ||
              liveData.netDividendsPaid_annual_data?.some(
                (d) => d.value !== 0
              ) ? (
                <MetricDisplayWithChart
                  label="Net Dividends Paid"
                  currentValue={liveData.currentNetDividendsPaid}
                  annualData={liveData.netDividendsPaid_annual_data}
                  currency={currency}
                  data-testid="net-dividends-metric-back"
                  onMetricClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "dividendshistory",
                      originatingElement: "netDividendsMetric",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  tooltip="Total dividends paid to shareholders"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-net-dividends-paid`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Net Dividends Paid",
                      value: liveData.currentNetDividendsPaid,
                      isMonetary: true,
                      currency: currency,
                    })
                  }
                  exchangeRates={exchangeRates}
                />
              ) : null}
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face
      return (
        <div
          data-testid={`cashuse-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1 sm:space-y-1.5">
              {liveData.currentTotalDebt ||
              liveData.totalDebt_annual_data?.some((d) => d.value !== 0) ? (
                <MetricDisplayWithChart
                  label="Total Debt"
                  currentValue={liveData.currentTotalDebt}
                  annualData={liveData.totalDebt_annual_data}
                  currency={currency}
                  data-testid="total-debt-metric"
                  onMetricClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "solvency",
                      originatingElement: "totalDebtMetric",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  tooltip="Sum of all short-term and long-term debt"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-total-debt`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Total Debt",
                      value: liveData.currentTotalDebt,
                      isMonetary: true,
                      currency: currency,
                    })
                  }
                  exchangeRates={exchangeRates}
                />
              ) : null}
              {liveData.currentFreeCashFlow !== null ||
              liveData.freeCashFlow_annual_data?.some((d) => d.value !== 0) ? (
                <MetricDisplayWithChart
                  label="Free Cash Flow"
                  currentValue={liveData.currentFreeCashFlow}
                  annualData={liveData.freeCashFlow_annual_data}
                  currency={currency}
                  data-testid="fcf-metric"
                  onMetricClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "fcfMetric",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  tooltip="Cash flow available after capital expenditures"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-free-cash-flow`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Free Cash Flow",
                      value: liveData.currentFreeCashFlow,
                      isMonetary: true,
                      currency: currency,
                    })
                  }
                  exchangeRates={exchangeRates}
                />
              ) : null}
            </div>
          </ShadCardContent>
        </div>
      );
    }
  },
  (prevProps, nextProps) => {
    // Custom comparison to ensure re-render when card data changes
    // Compare key fields that affect rendering
    return (
      prevProps.cardData.id === nextProps.cardData.id &&
      prevProps.cardData.liveData.currentTotalDebt === nextProps.cardData.liveData.currentTotalDebt &&
      prevProps.cardData.liveData.currentFreeCashFlow === nextProps.cardData.liveData.currentFreeCashFlow &&
      prevProps.cardData.liveData.weightedAverageShsOut === nextProps.cardData.liveData.weightedAverageShsOut &&
      prevProps.cardData.liveData.currentNetDividendsPaid === nextProps.cardData.liveData.currentNetDividendsPaid &&
      JSON.stringify(prevProps.cardData.liveData.totalDebt_annual_data) === JSON.stringify(nextProps.cardData.liveData.totalDebt_annual_data) &&
      JSON.stringify(prevProps.cardData.liveData.freeCashFlow_annual_data) === JSON.stringify(nextProps.cardData.liveData.freeCashFlow_annual_data) &&
      JSON.stringify(prevProps.cardData.liveData.outstandingShares_annual_data) === JSON.stringify(nextProps.cardData.liveData.outstandingShares_annual_data) &&
      JSON.stringify(prevProps.cardData.liveData.netDividendsPaid_annual_data) === JSON.stringify(nextProps.cardData.liveData.netDividendsPaid_annual_data) &&
      prevProps.isBackFace === nextProps.isBackFace &&
      prevProps.isSelectionMode === nextProps.isSelectionMode &&
      prevProps.selectedDataItems.length === nextProps.selectedDataItems.length
    );
  }
);

CashUseCardContent.displayName = "CashUseCardContent";
