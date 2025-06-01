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

interface RevenueCardContentProps {
  cardData: RevenueCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const RevenueCardContent: React.FC<RevenueCardContentProps> = React.memo(
  ({ cardData, isBackFace, onGenericInteraction }) => {
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
          data-testid={`revenue-card-back-${symbol}`}
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
                      targetCardType: "revenue",
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
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "currencyValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
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
                      targetCardType: "revenue",
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
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "filingDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
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
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "acceptedDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
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
          data-testid={`revenue-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1.5">
              <DataRow
                label="Revenue"
                value={formatFinancialValue(liveData.revenue, currencyCode)}
                className="mb-1"
                labelClassName="text-sm font-medium text-muted-foreground"
                valueClassName="text-xl font-bold sm:text-2xl text-foreground"
                data-testid="revenue-value-front"
                isInteractive={true}
                onClick={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "revenueMetric",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
              />
              <DataRow
                label="Gross Profit"
                value={formatFinancialValue(liveData.grossProfit, currencyCode)}
                labelClassName="text-sm font-medium text-muted-foreground"
                valueClassName="text-sm font-semibold text-foreground"
                data-testid="gross-profit-value-front"
                isInteractive={true}
                onClick={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "grossProfitMetric",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
              />
              <DataRow
                label="Operating Income"
                value={formatFinancialValue(
                  liveData.operatingIncome,
                  currencyCode
                )}
                labelClassName="text-sm font-medium text-muted-foreground"
                valueClassName="text-sm font-semibold text-foreground"
                data-testid="operating-income-value-front"
                isInteractive={true}
                onClick={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "operatingIncomeMetric",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
              />
              <DataRow
                label="Net Income"
                value={formatFinancialValue(liveData.netIncome, currencyCode)}
                labelClassName="text-sm font-medium text-muted-foreground"
                valueClassName="text-sm font-semibold text-foreground"
                data-testid="net-income-value-front"
                isInteractive={true}
                onClick={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "netIncomeMetric",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
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
                    targetCardType: "price",
                    originatingElement: "fcfMetric",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
              />
            </div>
          </ShadCardContent>
        </div>
      );
    }
  }
);

RevenueCardContent.displayName = "RevenueCardContent";
