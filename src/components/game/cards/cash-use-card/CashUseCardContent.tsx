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

  return (
    <div className="py-1 space-y-1" data-testid={dataTestId}>
      {" "}
      {/* Adjusted py */}
      <ClickableDataItem
        isInteractive={!!onMetricClick}
        onClickHandler={onMetricClick}
        title={title}
        baseClassName="flex justify-between items-baseline group/metric"
        interactiveClassName="cursor-pointer"
        aria-label={title}>
        <span
          className={cn(
            "text-sm font-medium text-muted-foreground mr-2 group-hover/metric:text-primary"
          )}>
          {label}
        </span>
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

  return (
    <div className="py-1" data-testid={dataTestId}>
      <ClickableDataItem
        isInteractive={!!onMetricClick}
        onClickHandler={onMetricClick}
        title={title}
        baseClassName="flex justify-between items-baseline group/metric"
        interactiveClassName="cursor-pointer"
        aria-label={ariaLabel}>
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
}

export const CashUseCardContent: React.FC<CashUseCardContentProps> = React.memo(
  ({ cardData, isBackFace, onGenericInteraction }) => {
    const { staticData, liveData, symbol, id, type: cardType } = cardData;
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
          data-testid={`cashuse-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
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
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-xs font-medium text-muted-foreground mr-2">
                  Debt Range:
                </span>
                <span className="text-xs font-semibold text-foreground text-right">
                  {staticData.debtRangePeriodLabel}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-xs font-medium text-muted-foreground mr-2">
                  FCF Range:
                </span>
                <span className="text-xs font-semibold text-foreground text-right">
                  {staticData.fcfRangePeriodLabel}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-xs font-medium text-muted-foreground mr-2">
                  Dividends Range:
                </span>
                <span className="text-xs font-semibold text-foreground text-right">
                  {staticData.dividendsRangePeriodLabel}
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
                } // Display year part of date
                data-testid="outstanding-shares-metric"
                onMetricClick={() =>
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "viewSharesDetail",
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                tooltip="Total shares currently held by all shareholders"
                isMonetary={false}
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
              />
            </div>
          </ShadCardContent>
        </div>
      );
    }
  }
);

CashUseCardContent.displayName = "CashUseCardContent";
