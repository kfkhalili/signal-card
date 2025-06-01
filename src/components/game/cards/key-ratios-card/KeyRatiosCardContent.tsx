// src/components/game/cards/key-ratios-card/KeyRatiosCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KeyRatiosCardData } from "./key-ratios-card.types";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
} from "../base-card/base-card.types";
import type { CardType } from "../base-card/base-card.types";
import { DataRow } from "@/components/ui/DataRow";

interface KeyRatiosCardContentProps {
  cardData: KeyRatiosCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const KeyRatiosCardContent: React.FC<KeyRatiosCardContentProps> =
  React.memo(({ cardData, isBackFace, onGenericInteraction }) => {
    const {
      staticData,
      liveData,
      symbol,
      companyName,
      backData,
      id,
      type: cardType,
    } = cardData;

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

    const renderRatio = (
      label: string,
      value: number | null,
      unit = "",
      precision = 2,
      tooltip?: string,
      relatedCardType?: CardType,
      originatingElement?: string,
      isMonetaryValue = false // Pass this for per-share values that might not be monetary ratios
    ) => (
      <DataRow
        label={label}
        value={value && unit === "%" ? value * 100 : value}
        unit={unit}
        precision={precision}
        tooltip={tooltip}
        isMonetary={isMonetaryValue} // Use the passed value
        isInteractive={!!relatedCardType}
        onClick={
          relatedCardType
            ? () =>
                handleInteraction("REQUEST_NEW_CARD", {
                  targetCardType: relatedCardType,
                  originatingElement: originatingElement || label,
                } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
            : undefined
        }
      />
    );

    if (isBackFace) {
      return (
        <div
          data-testid={`keyratios-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2.5 px-1 leading-relaxed">
              {backData.description ||
                `Trailing Twelve Months (TTM) ratios for ${
                  companyName || symbol
                }.`}
            </CardDescription>
            <div className="pt-1.5 space-y-0.5 text-[10px] sm:text-xs border-t mt-1.5">
              <DataRow
                label="Data Last Updated:"
                value={
                  staticData.lastUpdated
                    ? new Date(staticData.lastUpdated).toLocaleString()
                    : "N/A"
                }
                isMonetary={false} // Explicitly false for date strings
              />
              <DataRow
                label="Reporting Currency:"
                value={staticData.reportedCurrency || "N/A"}
                isMonetary={false} // Explicitly false for currency codes
              />
            </div>
            <div className="mt-2 text-xs space-y-0.5">
              <h4 className="font-semibold text-muted-foreground">
                Additional Ratios:
              </h4>
              {renderRatio(
                "Gross Profit Margin",
                liveData.grossProfitMarginTTM,
                "%",
                2,
                "Gross profit as a percentage of revenue",
                "revenue",
                "grossProfitMarginBack"
              )}
              {renderRatio(
                "EBITDA Margin",
                liveData.ebitdaMarginTTM,
                "%",
                2,
                "EBITDA as a percentage of revenue",
                "revenue",
                "ebitdaMarginBack"
              )}
              {renderRatio(
                "Asset Turnover",
                liveData.assetTurnoverTTM,
                "",
                2,
                "Efficiency in using assets to generate sales",
                "solvency",
                "assetTurnoverBack"
              )}
              {renderRatio(
                "Current Ratio",
                liveData.currentRatioTTM,
                "",
                2,
                "Ability to pay short-term obligations",
                "solvency",
                "currentRatioBack"
              )}
              {renderRatio(
                "Quick Ratio",
                liveData.quickRatioTTM,
                "",
                2,
                "Ability to pay short-term obligations without selling inventory",
                "solvency",
                "quickRatioBack"
              )}
              {renderRatio(
                "Effective Tax Rate",
                liveData.effectiveTaxRateTTM,
                "%",
                2,
                "Average tax rate paid",
                "revenue",
                "effectiveTaxRateBack"
              )}
              {renderRatio(
                "Div. Payout Ratio",
                liveData.dividendPayoutRatioTTM,
                "%",
                2,
                "Percentage of earnings paid as dividends",
                "cashuse",
                "dividendPayoutRatioBack"
              )}
            </div>
          </ShadCardContent>
        </div>
      );
    } else {
      // Front Face
      return (
        <div
          data-testid={`keyratios-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-0.5 flex-grow">
            <div className="text-center mb-1.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "keyratios",
                    originatingElement: "keyRatiosBadge",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                title={`View profile for ${companyName || symbol}`}
                baseClassName="inline-block">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 py-0.5">
                  Key Ratios (TTM)
                </Badge>
              </ClickableDataItem>
            </div>
            {renderRatio(
              "P/E Ratio",
              liveData.priceToEarningsRatioTTM,
              "",
              2,
              "Price to Earnings Ratio (TTM)",
              "price",
              "peRatioFront"
            )}
            {renderRatio(
              "P/S Ratio",
              liveData.priceToSalesRatioTTM,
              "",
              2,
              "Price to Sales Ratio (TTM)",
              "price",
              "psRatioFront"
            )}
            {renderRatio(
              "P/B Ratio",
              liveData.priceToBookRatioTTM,
              "",
              2,
              "Price to Book Ratio (TTM)",
              "price",
              "pbRatioFront"
            )}
            {renderRatio(
              "P/FCF Ratio",
              liveData.priceToFreeCashFlowRatioTTM,
              "",
              2,
              "Price to Free Cash Flow Ratio (TTM)",
              "cashuse", // Or Price, depending on where FCF is shown
              "pFcfRatioFront"
            )}
            {renderRatio(
              "Div. Yield",
              liveData.dividendYieldTTM,
              "%",
              2,
              "Dividend Yield (TTM)",
              "cashuse",
              "dividendYieldFront"
            )}
            {renderRatio(
              "Net Profit Margin",
              liveData.netProfitMarginTTM,
              "%",
              2,
              "Net Profit Margin (TTM)",
              "revenue",
              "netProfitMarginFront"
            )}
            {renderRatio(
              "Debt/Equity",
              liveData.debtToEquityRatioTTM,
              "",
              2,
              "Debt to Equity Ratio (TTM)",
              "solvency",
              "debtToEquityFront"
            )}
            {renderRatio(
              "EV Multiple",
              liveData.enterpriseValueMultipleTTM,
              "",
              2,
              "Enterprise Value Multiple (TTM)",
              "price", // Assuming EV is most related to pricing/valuation cards
              "evMultipleFront"
            )}
            {renderRatio(
              `EPS (${staticData.reportedCurrency || "$"})`, // Assuming $ if no currency
              liveData.earningsPerShareTTM,
              "", // Unit is part of label here
              2,
              "Earnings Per Share (TTM)",
              "revenue",
              "epsFront",
              true // This is a monetary value per share, not a ratio itself
            )}
          </ShadCardContent>
          <div className="px-0 pt-1 text-[10px] text-center text-muted-foreground/80">
            <p>
              Updated:{" "}
              {staticData.lastUpdated
                ? new Date(staticData.lastUpdated).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      );
    }
  });

KeyRatiosCardContent.displayName = "KeyRatiosCardContent";
