// src/components/game/cards/solvency-card/SolvencyCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type { SolvencyCardData } from "./solvency-card.types";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  TriggerCardActionInteraction,
} from "../base-card/base-card.types";
import { DataRow } from "@/components/ui/DataRow";
import { formatFinancialValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface SolvencyCardContentProps {
  cardData: SolvencyCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const SolvencyCardContent: React.FC<SolvencyCardContentProps> =
  React.memo(
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
        if (isSelectionMode) return; // Disable other interactions in selection mode
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
            data-testid={`solvency-card-back-${symbol}`}
            className="pointer-events-auto flex flex-col h-full">
            <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
              <div className="pt-1.5 space-y-0.5">
                <DataRow
                  label="Period:"
                  value={staticData.periodLabel}
                  isInteractive={isSelectionMode || !!staticData.periodLabel}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "solvency",
                      originatingElement: "periodLabelBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
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
                    isInteractive={
                      isSelectionMode || !!staticData.reportedCurrency
                    }
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewCurrencyDetails",
                        actionData: { currency: staticData.reportedCurrency },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
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
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "solvency",
                        originatingElement: "statementDateBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
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
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewFilingDetails",
                        actionData: { filingDate: staticData.filingDate },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
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
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewAcceptanceDetails",
                        actionData: { acceptedDate: staticData.acceptedDate },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
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
            data-testid={`solvency-card-front-${symbol}`}
            className="pointer-events-auto flex flex-col h-full justify-between">
            <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
              <div className="space-y-1.5">
                {liveData.totalAssets != null && (
                  <DataRow
                    label="Total Assets"
                    value={formatFinancialValue(
                      liveData.totalAssets,
                      currencyCode,
                      2,
                      exchangeRates
                    )}
                    className="mb-0.5"
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-xl font-bold sm:text-2xl text-foreground"
                    data-testid="total-assets-value-front"
                    isInteractive={true}
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewAssetBreakdown",
                        actionData: {
                          metric: "totalAssets",
                          value: liveData.totalAssets,
                        },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-total-assets`)}
                    onSelect={() =>
                      onSelect({
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Total Assets",
                        value: liveData.totalAssets,
                        isMonetary: true,
                        currency: currencyCode,
                      })
                    }
                  />
                )}
                {liveData.cashAndShortTermInvestments != null && (
                  <DataRow
                    label="Cash"
                    value={formatFinancialValue(
                      liveData.cashAndShortTermInvestments,
                      currencyCode,
                      2,
                      exchangeRates
                    )}
                    tooltip="includes short-term investments"
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    data-testid="cash-value-front"
                    isInteractive={true}
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewCashPositionDetails",
                        actionData: {
                          metric: "cashAndShortTermInvestments",
                          value: liveData.cashAndShortTermInvestments,
                        },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-cash`)}
                    onSelect={() =>
                      onSelect({
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Cash",
                        value: liveData.cashAndShortTermInvestments,
                        isMonetary: true,
                        currency: currencyCode,
                      })
                    }
                  />
                )}
                {liveData.totalCurrentLiabilities != null && (
                  <DataRow
                    label="Liabilities"
                    value={formatFinancialValue(
                      liveData.totalCurrentLiabilities,
                      currencyCode,
                      2,
                      exchangeRates
                    )}
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    data-testid="current-liabilities-value-front"
                    isInteractive={true}
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewLiabilityBreakdown",
                        actionData: {
                          metric: "totalCurrentLiabilities",
                          value: liveData.totalCurrentLiabilities,
                        },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-liabilities`)}
                    onSelect={() =>
                      onSelect({
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Liabilities",
                        value: liveData.totalCurrentLiabilities,
                        isMonetary: true,
                        currency: currencyCode,
                      })
                    }
                  />
                )}
                {liveData.shortTermDebt != null && (
                  <DataRow
                    label="Short-Term Debt"
                    value={formatFinancialValue(
                      liveData.shortTermDebt,
                      currencyCode,
                      2,
                      exchangeRates
                    )}
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    data-testid="short-term-debt-value-front"
                    isInteractive={true}
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewDebtDetails",
                        actionData: {
                          metric: "shortTermDebt",
                          value: liveData.shortTermDebt,
                        },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-short-term-debt`)}
                    onSelect={() =>
                      onSelect({
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Short-Term Debt",
                        value: liveData.shortTermDebt,
                        isMonetary: true,
                        currency: currencyCode,
                      })
                    }
                  />
                )}
                {liveData.longTermDebt != null && (
                  <DataRow
                    label="Long-Term Debt"
                    value={formatFinancialValue(
                      liveData.longTermDebt,
                      currencyCode,
                      2,
                      exchangeRates
                    )}
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    data-testid="long-term-debt-value-front"
                    isInteractive={true}
                    onClick={() =>
                      handleInteraction("TRIGGER_CARD_ACTION", {
                        actionName: "viewDebtDetails",
                        actionData: {
                          metric: "longTermDebt",
                          value: liveData.longTermDebt,
                        },
                      } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-long-term-debt`)}
                    onSelect={() =>
                      onSelect({
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Long-Term Debt",
                        value: liveData.longTermDebt,
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
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "fcfMetricSolvency",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
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

SolvencyCardContent.displayName = "SolvencyCardContent";
