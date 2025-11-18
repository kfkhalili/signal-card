// src/components/game/cards/revenue-card/RevenueCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { RevenueCardData } from "./revenue-card.types";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
} from "../base-card/base-card.types";
import { DataRow } from "@/components/ui/DataRow";
import { formatFinancialValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface RevenueCardContentProps {
  cardData: RevenueCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const RevenueCardContent: React.FC<RevenueCardContentProps> = React.memo(
  ({
    cardData,
    isBackFace,
    onGenericInteraction,
    // NEW PROPS
    isSelectionMode,
    selectedDataItems,
    onToggleItemSelection,
  }) => {
    const { staticData, liveData, symbol, id, type: cardType } = cardData;
    const currencyCode = staticData.reportedCurrency;
    const exchangeRates = useExchangeRate();

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
          data-testid={`revenue-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
            <div className="pt-1.5 space-y-0.5">
              <DataRow
                label="Period:"
                value={staticData.periodLabel}
                isInteractive={isSelectionMode || !!staticData.periodLabel}
                onClick={() => {
                  if (staticData.periodLabel && !isSelectionMode) {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "periodLabelBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
                isSelectionMode={isSelectionMode}
                isSelected={isSelected(`${id}-period`)}
                onSelect={() =>
                  onSelect({
                    sourceCardId: id,
                    sourceCardSymbol: symbol,
                    label: "Period",
                    value: staticData.periodLabel,
                  })
                }
              />
              {staticData.reportedCurrency && (
                <DataRow
                  label="Currency:"
                  value={staticData.reportedCurrency}
                  isInteractive={isSelectionMode || !!staticData.reportedCurrency}
                  onClick={() => {
                    if (staticData.reportedCurrency && !isSelectionMode) {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "currencyValueBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-currency`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Currency",
                      value: staticData.reportedCurrency,
                    })
                  }
                />
              )}
              {staticData.statementDate && (
                <DataRow
                  label="Statement Date:"
                  value={staticData.statementDate}
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "statementDateBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-statement-date`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Statement Date",
                      value: staticData.statementDate,
                    })
                  }
                />
              )}
              {staticData.filingDate && (
                <DataRow
                  label="Filing Date:"
                  value={staticData.filingDate}
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "filingDateBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-filing-date`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Filing Date",
                      value: staticData.filingDate,
                    })
                  }
                />
              )}
              {staticData.acceptedDate && (
                <DataRow
                  label="Accepted Date:"
                  value={staticData.acceptedDate.substring(0, 10)}
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "acceptedDateBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-accepted-date`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Accepted Date",
                      value: staticData.acceptedDate?.substring(0, 10),
                    })
                  }
                />
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
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1.5">
              {liveData.revenue != null && (
                <DataRow
                  label="Revenue"
                  value={formatFinancialValue(
                    liveData.revenue,
                    currencyCode,
                    2,
                    exchangeRates
                  )}
                  className="mb-1"
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-xl font-bold sm:text-2xl text-foreground"
                  data-testid="revenue-value-front"
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "revenueMetric",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-revenue`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Revenue",
                      value: liveData.revenue,
                      isMonetary: true,
                      currency: currencyCode,
                    })
                  }
                />
              )}
              {liveData.grossProfit != null && (
                <DataRow
                  label="Gross Profit"
                  value={formatFinancialValue(
                    liveData.grossProfit,
                    currencyCode,
                    2,
                    exchangeRates
                  )}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-sm font-semibold text-foreground"
                  data-testid="gross-profit-value-front"
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "grossProfitMetric",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-gross-profit`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Gross Profit",
                      value: liveData.grossProfit,
                      isMonetary: true,
                      currency: currencyCode,
                    })
                  }
                />
              )}
              {liveData.operatingIncome != null && (
                <DataRow
                  label="Operating Income"
                  value={formatFinancialValue(
                    liveData.operatingIncome,
                    currencyCode,
                    2,
                    exchangeRates
                  )}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-sm font-semibold text-foreground"
                  data-testid="operating-income-value-front"
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "operatingIncomeMetric",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-operating-income`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Operating Income",
                      value: liveData.operatingIncome,
                      isMonetary: true,
                      currency: currencyCode,
                    })
                  }
                />
              )}
              {liveData.netIncome != null && (
                <DataRow
                  label="Net Income"
                  value={formatFinancialValue(
                    liveData.netIncome,
                    currencyCode,
                    2,
                    exchangeRates
                  )}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-sm font-semibold text-foreground"
                  data-testid="net-income-value-front"
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "netIncomeMetric",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-net-income`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Net Income",
                      value: liveData.netIncome,
                      isMonetary: true,
                      currency: currencyCode,
                    })
                  }
                />
              )}
              {liveData.freeCashFlow != null && (
                <DataRow
                  label="Free Cash Flow"
                  value={formatFinancialValue(
                    liveData.freeCashFlow,
                    currencyCode,
                    2,
                    exchangeRates
                  )}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-sm font-semibold text-foreground"
                  data-testid="fcf-value-front"
                  isInteractive={true}
                  onClick={() => {
                    if (!isSelectionMode)
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "fcfMetric",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected(`${id}-free-cash-flow`)}
                  onSelect={() =>
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Free Cash Flow",
                      value: liveData.freeCashFlow,
                      isMonetary: true,
                      currency: currencyCode,
                    })
                  }
                />
              )}
            </div>
          </ShadCardContent>
        </div>
      );
    }
  }
);

RevenueCardContent.displayName = "RevenueCardContent";
