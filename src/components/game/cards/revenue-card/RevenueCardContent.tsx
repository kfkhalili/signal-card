// src/components/game/cards/revenue-card/RevenueCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import type { RevenueCardData } from "./revenue-card.types";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
} from "../base-card/base-card.types";
import { DataRow } from "@/components/ui/DataRow";
import { formatFinancialValue } from "@/lib/formatters";

interface RevenueCardContentProps {
  cardData: RevenueCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const RevenueCardContent: React.FC<RevenueCardContentProps> = React.memo(
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
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1 sm:space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2.5 px-1 leading-relaxed">
              {backData.description ||
                `Financial highlights for ${companyName || symbol}.`}
            </CardDescription>

            <div className="pt-1.5 space-y-0.5 text-[10px] sm:text-xs border-t mt-1.5">
              <DataRow
                label="Period:"
                value={staticData.periodLabel}
                isMonetary={false}
                isInteractive={!!staticData.periodLabel}
                onClick={() => {
                  if (staticData.periodLabel) {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "periodLabelBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-muted-foreground/90"
                valueClassName="text-foreground font-medium"
              />
              <DataRow
                label="Currency:"
                value={staticData.reportedCurrency || "N/A"}
                isMonetary={false}
                isInteractive={!!staticData.reportedCurrency}
                onClick={() => {
                  if (staticData.reportedCurrency) {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "currencyValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                labelClassName="text-muted-foreground/90"
                valueClassName="text-foreground"
              />
              {staticData.statementDate && (
                <DataRow
                  label="Statement Date:"
                  value={staticData.statementDate}
                  isMonetary={false}
                  isInteractive={true}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "statementDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  labelClassName="text-muted-foreground/90"
                  valueClassName="text-foreground"
                />
              )}
              {staticData.filingDate && (
                <DataRow
                  label="Filing Date:"
                  value={staticData.filingDate}
                  isMonetary={false}
                  isInteractive={true}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "filingDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  labelClassName="text-muted-foreground/90"
                  valueClassName="text-foreground"
                />
              )}
              {staticData.acceptedDate && (
                <DataRow
                  label="Accepted Date:"
                  value={staticData.acceptedDate.substring(0, 10)}
                  isMonetary={false}
                  isInteractive={true}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "acceptedDateBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  labelClassName="text-muted-foreground/90"
                  valueClassName="text-foreground"
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
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <DataRow
              label="Revenue"
              value={formatFinancialValue(liveData.revenue, currencyCode)}
              // currency prop is no longer needed if formatFinancialValue includes the symbol
              className="mb-1"
              labelClassName="text-base sm:text-lg md:text-xl"
              valueClassName="text-base sm:text-lg md:text-xl"
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
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
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
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
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
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
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
              value={formatFinancialValue(liveData.freeCashFlow, currencyCode)}
              labelClassName="text-xs sm:text-sm"
              valueClassName="text-sm sm:text-base"
              data-testid="fcf-value-front"
              isInteractive={true}
              onClick={() =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: "price",
                  originatingElement: "fcfMetric",
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
              }
            />
          </ShadCardContent>
        </div>
      );
    }
  }
);

RevenueCardContent.displayName = "RevenueCardContent";
