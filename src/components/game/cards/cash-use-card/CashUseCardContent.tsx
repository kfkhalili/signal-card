// src/components/game/cards/cash-use-card/CashUseCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { CashUseCardData } from "./cash-use-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { RangeIndicator } from "@/components/ui/RangeIndicator";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  TriggerCardActionInteraction,
} from "../base-card/base-card.types";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import {
  CheckboxCheckedIcon,
  CheckboxUncheckedIcon,
} from "@/components/ui/CheckboxIcons";

// MetricDisplay is for items WITH a RangeIndicator (financials)
interface MetricDisplayWithRangeProps {
  label: string;
  currentValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  currency?: string | null;
  rangeLabel: string;
  "data-testid"?: string;
  isMonetary?: boolean;
  onMetricClick?: () => void;
  tooltip?: string;
  // NEW PROPS
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const MetricDisplayWithRange: React.FC<MetricDisplayWithRangeProps> = ({
  label,
  currentValue,
  minValue,
  maxValue,
  currency,
  rangeLabel,
  "data-testid": dataTestId,
  isMonetary = true,
  onMetricClick,
  tooltip,
  // NEW PROPS
  isSelectionMode,
  isSelected,
  onSelect,
}) => {
  const displayCurrencySymbol =
    currency === "USD" ? "$" : currency || (isMonetary ? "$" : "");
  const formattedValue =
    currentValue === null ||
    currentValue === undefined ||
    Number.isNaN(currentValue)
      ? "N/A"
      : `${
          isMonetary ? displayCurrencySymbol : ""
        }${formatNumberWithAbbreviations(currentValue, 2)}`;

  const title = tooltip
    ? `${label}: ${formattedValue} (${tooltip})`
    : `${label}: ${formattedValue}`;

  const effectiveClickHandler = isSelectionMode ? onSelect : onMetricClick;
  const isClickable = isSelectionMode || !!onMetricClick;

  return (
    <div className="py-1 space-y-1" data-testid={dataTestId}>
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
      <RangeIndicator
        currentValue={currentValue}
        lowValue={minValue}
        highValue={maxValue}
        lowLabel={rangeLabel.split(" - ")[0] || "Min"}
        highLabel={rangeLabel.split(" - ")[1] || "Max"}
        lowValueForTitle={minValue}
        highValueForTitle={maxValue}
        barHeightClassName="h-1.5"
        labelClassName="text-xs text-muted-foreground"
      />
    </div>
  );
};

// SimpleMetricDisplay is for items WITHOUT a RangeIndicator (shares)
interface SimpleMetricDisplayProps {
  label: string;
  value: number | null;
  dateLabel?: string | null;
  "data-testid"?: string;
  isMonetary?: boolean;
  onMetricClick?: () => void;
  tooltip?: string;
  currency?: string | null;
  // NEW PROPS
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const SimpleMetricDisplay: React.FC<SimpleMetricDisplayProps> = ({
  label,
  value,
  dateLabel,
  "data-testid": dataTestId,
  isMonetary = false,
  onMetricClick,
  tooltip,
  currency,
  // NEW PROPS
  isSelectionMode,
  isSelected,
  onSelect,
}) => {
  const displayCurrencySymbol =
    currency === "USD" ? "$" : currency || (isMonetary ? "$" : "");
  const formattedValue =
    value === null || value === undefined || Number.isNaN(value)
      ? "N/A"
      : `${
          isMonetary ? displayCurrencySymbol : ""
        }${formatNumberWithAbbreviations(value, 0)}`;

  const title = tooltip
    ? `${label}: ${formattedValue} (${tooltip})`
    : `${label}: ${formattedValue}`;
  const ariaLabel = dateLabel ? `${title}, as of ${dateLabel}` : title;

  const effectiveClickHandler = isSelectionMode ? onSelect : onMetricClick;
  const isClickable = isSelectionMode || !!onMetricClick;

  return (
    <div className="py-1" data-testid={dataTestId}>
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
        aria-label={ariaLabel}>
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
            {dateLabel && (
              <span className="text-xs text-muted-foreground ml-1">
                ({dateLabel})
              </span>
            )}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-semibold text-foreground group-hover/metric:text-primary"
          )}>
          {formattedValue}
        </span>
      </ClickableDataItem>
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
            {/* Back face content can be made selectable too if needed */}
            <div className="space-y-0.5 pt-1.5">
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-xs font-medium text-muted-foreground mr-2">
                  Latest Statement:
                </span>
                <span className="text-xs font-semibold text-foreground text-right">
                  {staticData.latestStatementDate || "N/A"} (
                  {staticData.latestStatementPeriod || "N/A"})
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-xs font-medium text-muted-foreground mr-2">
                  Latest Shares Data:
                </span>
                <span className="text-xs font-semibold text-foreground text-right">
                  {staticData.latestSharesFloatDate || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-xs font-medium text-muted-foreground mr-2">
                  Reporting Currency:
                </span>
                <span className="text-xs font-semibold text-foreground text-right">
                  {staticData.reportedCurrency || "N/A"}
                </span>
              </div>
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
              <SimpleMetricDisplay
                label="Outstanding Shares"
                value={liveData.currentOutstandingShares}
                dateLabel={
                  staticData.latestSharesFloatDate
                    ? staticData.latestSharesFloatDate.substring(0, 4)
                    : null
                }
                data-testid="outstanding-shares-metric"
                onMetricClick={() =>
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "viewSharesDetail",
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                tooltip="Total shares currently held by all shareholders"
                isMonetary={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected(`${id}-outstanding-shares`)}
                onSelect={() =>
                  onSelect({
                    sourceCardId: id,
                    sourceCardSymbol: symbol,
                    label: "Outstanding Shares",
                    value: liveData.currentOutstandingShares,
                  })
                }
              />
              <MetricDisplayWithRange
                label="Total Debt"
                currentValue={liveData.currentTotalDebt}
                minValue={liveData.totalDebt_5y_min}
                maxValue={liveData.totalDebt_5y_max}
                currency={currency}
                rangeLabel={staticData.debtRangePeriodLabel}
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
              />
              <MetricDisplayWithRange
                label="Free Cash Flow"
                currentValue={liveData.currentFreeCashFlow}
                minValue={liveData.freeCashFlow_5y_min}
                maxValue={liveData.freeCashFlow_5y_max}
                currency={currency}
                rangeLabel={staticData.fcfRangePeriodLabel}
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
              />
              <MetricDisplayWithRange
                label="Net Dividends Paid"
                currentValue={liveData.currentNetDividendsPaid}
                minValue={liveData.netDividendsPaid_5y_min}
                maxValue={liveData.netDividendsPaid_5y_max}
                currency={currency}
                rangeLabel={staticData.dividendsRangePeriodLabel}
                data-testid="net-dividends-metric"
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
              />
            </div>
          </ShadCardContent>
        </div>
      );
    }
  }
);

CashUseCardContent.displayName = "CashUseCardContent";
