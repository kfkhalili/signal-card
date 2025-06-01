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

interface SolvencyCardContentProps {
  cardData: SolvencyCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const SolvencyCardContent: React.FC<SolvencyCardContentProps> =
  React.memo(({ cardData, isBackFace, onGenericInteraction }) => {
    const { staticData, liveData, symbol, id, type: cardType } = cardData;
    const currencyCode = staticData.reportedCurrency;

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
          data-testid={`solvency-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
            <div className="pt-1.5 space-y-0.5 border-t ">
              <DataRow
                label="Period:"
                value={staticData.periodLabel}
                isInteractive={!!staticData.periodLabel}
                onClick={() => {
                  if (staticData.periodLabel) {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "solvency",
                      originatingElement: "periodLabelBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
              />
              <DataRow
                label="Currency:"
                value={staticData.reportedCurrency || "N/A"}
                isInteractive={!!staticData.reportedCurrency}
                onClick={() => {
                  if (staticData.reportedCurrency) {
                    handleInteraction("TRIGGER_CARD_ACTION", {
                      actionName: "viewCurrencyDetails",
                      actionData: { currency: staticData.reportedCurrency },
                    } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-xs font-medium text-muted-foreground"
                valueClassName="text-xs font-semibold text-foreground"
              />
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
              <DataRow
                label="Total Assets"
                value={formatFinancialValue(liveData.totalAssets, currencyCode)}
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
              />
              <DataRow
                label="Cash"
                value={formatFinancialValue(
                  liveData.cashAndShortTermInvestments,
                  currencyCode
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
              />
              <DataRow
                label="Liabilities"
                value={formatFinancialValue(
                  liveData.totalCurrentLiabilities,
                  currencyCode
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
              />
              <DataRow
                label="Short-Term Debt"
                value={formatFinancialValue(
                  liveData.shortTermDebt,
                  currencyCode
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
              />
              <DataRow
                label="Long-Term Debt"
                value={formatFinancialValue(
                  liveData.longTermDebt,
                  currencyCode
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
              />
              <DataRow
                label="Free Cash Flow"
                value={formatFinancialValue(
                  liveData.freeCashFlow,
                  currencyCode
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
              />
            </div>
          </ShadCardContent>
        </div>
      );
    }
  });

SolvencyCardContent.displayName = "SolvencyCardContent";
