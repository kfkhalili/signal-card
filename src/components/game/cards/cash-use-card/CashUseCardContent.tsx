// src/components/game/cards/cash-use-card/CashUseCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

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
    <div className="py-1.5 space-y-1" data-testid={dataTestId}>
      <ClickableDataItem
        isInteractive={!!onMetricClick}
        onClickHandler={onMetricClick}
        title={title}
        baseClassName="flex justify-between items-baseline group/metric"
        interactiveClassName="cursor-pointer"
        aria-label={title}>
        <span
          className={cn(
            "text-sm font-medium text-foreground mr-2 group-hover/metric:text-primary"
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
        lowLabel={rangeLabel.split(" - ")[0] || "Min"} // Basic split for label
        highLabel={rangeLabel.split(" - ")[1] || "Max"}
        lowValueForTitle={minValue}
        highValueForTitle={maxValue}
        barHeightClassName="h-1"
        labelClassName="text-[10px]"
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
  currency?: string | null; // Added for consistency, though shares are not monetary
}

const SimpleMetricDisplay: React.FC<SimpleMetricDisplayProps> = ({
  label,
  value,
  dateLabel,
  "data-testid": dataTestId,
  isMonetary = false, // Default to false for shares
  onMetricClick,
  tooltip,
  currency, // Not typically used for shares but good for interface consistency
}) => {
  const displayCurrencySymbol =
    currency === "USD" ? "$" : currency || (isMonetary ? "$" : "");
  const formattedValue =
    value === null || value === undefined || Number.isNaN(value)
      ? "N/A"
      : `${
          isMonetary ? displayCurrencySymbol : ""
        }${formatNumberWithAbbreviations(value, 0)}`; // Shares usually whole numbers

  const title = tooltip
    ? `${label}: ${formattedValue} (${tooltip})`
    : `${label}: ${formattedValue}`;
  const ariaLabel = dateLabel ? `${title}, as of ${dateLabel}` : title;

  return (
    <div className="py-1.5" data-testid={dataTestId}>
      <ClickableDataItem
        isInteractive={!!onMetricClick}
        onClickHandler={onMetricClick}
        title={title}
        baseClassName="flex justify-between items-baseline group/metric"
        interactiveClassName="cursor-pointer"
        aria-label={ariaLabel}>
        <span
          className={cn(
            "text-sm font-medium text-foreground mr-2 group-hover/metric:text-primary"
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
          data-testid={`cashuse-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2.5 px-1 leading-relaxed">
              {backData.description ||
                `Cash usage details for ${companyName || symbol}.`}
            </CardDescription>
            <div className="pt-1.5 space-y-0.5 text-[10px] sm:text-xs border-t mt-1.5">
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-muted-foreground/90 mr-2">
                  Latest Statement:
                </span>
                <span className="font-medium text-foreground text-right">
                  {staticData.latestStatementDate || "N/A"} (
                  {staticData.latestStatementPeriod || "N/A"})
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-muted-foreground/90 mr-2">
                  Latest Shares Data:
                </span>
                <span className="font-medium text-foreground text-right">
                  {staticData.latestSharesFloatDate || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-muted-foreground/90 mr-2">
                  Reporting Currency:
                </span>
                <span className="font-medium text-foreground text-right">
                  {staticData.reportedCurrency || "N/A"}
                </span>
              </div>
              {/* Range labels for financial metrics */}
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-muted-foreground/90 mr-2">
                  Debt Range:
                </span>
                <span className="font-medium text-foreground text-right">
                  {staticData.debtRangePeriodLabel}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-muted-foreground/90 mr-2">
                  FCF Range:
                </span>
                <span className="font-medium text-foreground text-right">
                  {staticData.fcfRangePeriodLabel}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-muted-foreground/90 mr-2">
                  Dividends Range:
                </span>
                <span className="font-medium text-foreground text-right">
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
          <ShadCardContent className="pt-0 pb-1 px-0 space-y-1 sm:space-y-1.5 flex-grow">
            <div className="text-center mb-1.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "cashuse",
                    originatingElement: "cashUseBadge",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                title={`View profile for ${companyName || symbol}`}
                baseClassName="inline-block">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 py-0.5">
                  Cash Use
                </Badge>
              </ClickableDataItem>
            </div>
            <SimpleMetricDisplay
              label="Outstanding Shares"
              value={liveData.currentOutstandingShares}
              dateLabel={
                staticData.latestSharesFloatDate
                  ? `As of ${staticData.latestSharesFloatDate}`
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
                handleInteraction("TRIGGER_CARD_ACTION", {
                  actionName: "viewDividendHistory",
                } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
              tooltip="Total dividends paid to shareholders"
            />
          </ShadCardContent>
          <div className="px-0 pt-1 text-[10px] text-center text-muted-foreground/80">
            <p>
              {staticData.reportedCurrency
                ? `Currency: ${staticData.reportedCurrency}. `
                : ""}
              Stmt: {staticData.latestStatementDate || "N/A"}. Shares:{" "}
              {staticData.latestSharesFloatDate || "N/A"}
            </p>
          </div>
        </div>
      );
    }
  }
);

CashUseCardContent.displayName = "CashUseCardContent";
