// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import type { ProfileCardData } from "./profile-card.types";
import { getFlagEmoji, getCountryName, cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  FilterWorkspaceDataInteraction,
  TriggerCardActionInteraction,
} from "../base-card/base-card.types";

const truncateText = (
  text: string | null | undefined,
  maxLength: number
): string => {
  if (!text) return "N/A";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + "...";
};

interface ProfileCardContentProps {
  cardData: ProfileCardData;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

export const ProfileCardContent = React.memo<ProfileCardContentProps>(
  ({ cardData, isBackFace, onGenericInteraction }) => {
    const {
      staticData,
      liveData,
      symbol,
      id,
      type: cardType,
      backData,
      companyName,
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

    // Helper to render a data item, now with optional unit
    const renderDataItem = (
      label: string,
      value: string | number | null | undefined,
      unit = "",
      isInteractive = false,
      onClickHandler?: () => void,
      titleOverride?: string,
      valuePrecision?: number,
      originatingElement?: string
    ) => {
      let displayValue: string;
      if (value === null || value === undefined) {
        displayValue = "N/A";
      } else if (typeof value === "number") {
        displayValue = `${value.toFixed(valuePrecision ?? 2)}${unit}`;
      } else {
        displayValue = `${value}${unit}`;
      }

      return (
        <ClickableDataItem
          isInteractive={isInteractive && !!onClickHandler}
          onClickHandler={onClickHandler}
          title={titleOverride || `${label}: ${displayValue}`}
          baseClassName={cn(
            "flex items-baseline min-w-0 gap-1 text-foreground"
          )}
          interactiveClassName={
            isInteractive && !!onClickHandler
              ? "hover:text-primary cursor-pointer"
              : ""
          }
          aria-label={titleOverride || `${label}: ${displayValue}`}
          data-testid={`${
            originatingElement || label.toLowerCase().replace(/\s+/g, "-")
          }-profile-item`}>
          <span className="text-xs font-medium shrink-0">{label}:</span>
          <span className="truncate text-xs">{displayValue}</span>
        </ClickableDataItem>
      );
    };

    if (!isBackFace) {
      const description = staticData?.description;
      const countryFlag = getFlagEmoji(staticData?.country);
      const fullCountryName = staticData?.country
        ? getCountryName(staticData.country)
        : "N/A";

      return (
        <div
          data-testid={`profile-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between text-xs">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1 flex-grow">
            <div className="text-center mb-1.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "profile",
                    originatingElement: "profileBadge",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                title={`View profile for ${companyName || symbol}`}
                baseClassName="inline-block">
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 py-0.5">
                  Profile
                </Badge>
              </ClickableDataItem>
            </div>
            {description && (
              <p
                className="text-muted-foreground text-xs leading-snug line-clamp-3"
                style={{ minHeight: "2.25rem" }}
                title={description || undefined}>
                {description}
              </p>
            )}

            <div className="space-y-0.5 mt-0.5">
              {renderDataItem(
                "Industry",
                staticData?.industry
                  ? `${truncateText(staticData.industry, 22)}${
                      staticData.sector
                        ? ` (${truncateText(staticData.sector, 15)})`
                        : ""
                    }`
                  : "N/A",
                "",
                !!staticData?.industry,
                () => {
                  if (staticData?.industry) {
                    handleInteraction("FILTER_WORKSPACE_DATA", {
                      filterField: "industry",
                      filterValue: staticData.industry,
                      originatingElement: "industryLink",
                    } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                },
                `Industry: ${staticData?.industry || "N/A"}${
                  staticData?.sector ? ` (Sector: ${staticData.sector})` : ""
                }`
              )}

              {staticData?.country && (
                <ClickableDataItem
                  isInteractive={true}
                  onClickHandler={() => {
                    if (staticData?.country) {
                      handleInteraction("FILTER_WORKSPACE_DATA", {
                        filterField: "country",
                        filterValue: staticData.country,
                        originatingElement: "countryLink",
                      } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  title={`Country: ${fullCountryName}`}
                  baseClassName="flex items-baseline min-w-0 gap-1 text-foreground hover:text-primary cursor-pointer"
                  aria-label={`Filter by country: ${fullCountryName}`}>
                  <span className="text-xs font-medium shrink-0">Country:</span>
                  <span className="text-sm leading-none mr-0.5">
                    {countryFlag}
                  </span>
                  <span className="truncate text-xs" title={fullCountryName}>
                    {fullCountryName}
                  </span>
                </ClickableDataItem>
              )}

              {renderDataItem(
                "Employees",
                staticData?.formatted_full_time_employees,
                "",
                true,
                () => {
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "viewEmployeeData",
                    actionData: {
                      employees: staticData?.formatted_full_time_employees,
                    },
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                },
                `${
                  staticData?.formatted_full_time_employees || "N/A"
                } employees`
              )}
              {liveData?.revenue !== null &&
                liveData?.revenue !== undefined &&
                renderDataItem(
                  "Revenue (TTM)",
                  formatNumberWithAbbreviations(liveData.revenue),
                  "",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "revenueDisplayTriggerProfile",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `Revenue (TTM): ${formatNumberWithAbbreviations(
                    liveData.revenue
                  )} ${staticData?.currency || ""}`
                )}
              {/* Displaying new TTM Ratios */}
              {liveData?.eps !== null &&
                liveData?.eps !== undefined &&
                renderDataItem(
                  `EPS (TTM)`,
                  liveData.eps,
                  staticData?.currency ? ` ${staticData.currency}` : "",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "keyratios",
                      originatingElement: "epsTTMDisplayTriggerProfile",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `EPS (TTM): ${liveData.eps.toFixed(2)} ${
                    staticData?.currency || ""
                  }`
                )}
              {liveData?.priceToEarningsRatioTTM !== null &&
                liveData?.priceToEarningsRatioTTM !== undefined &&
                renderDataItem(
                  "P/E (TTM)",
                  liveData.priceToEarningsRatioTTM,
                  "x",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "keyratios",
                      originatingElement: "peTTMDisplayTriggerProfile",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `Price/Earnings Ratio (TTM): ${liveData.priceToEarningsRatioTTM.toFixed(
                    2
                  )}x`
                )}
              {liveData?.priceToBookRatioTTM !== null &&
                liveData?.priceToBookRatioTTM !== undefined &&
                renderDataItem(
                  "P/B (TTM)",
                  liveData.priceToBookRatioTTM,
                  "x",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "keyratios",
                      originatingElement: "pbTTMDisplayTriggerProfile",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `Price/Book Ratio (TTM): ${liveData.priceToBookRatioTTM.toFixed(
                    2
                  )}x`
                )}
            </div>
          </ShadCardContent>

          <div className="px-0 pt-1 mt-auto">
            <div className="grid grid-cols-2 gap-x-2 items-center text-xs mb-0.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "priceDisplayTriggerProfile",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                baseClassName="py-0.5 text-foreground hover:text-primary cursor-pointer"
                aria-label={`Request Price Card for ${symbol}`}>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-medium shrink-0">Price:</span>
                  <span className="font-semibold text-sm">
                    {staticData?.currency === "USD"
                      ? "$"
                      : staticData?.currency || "$"}
                    {liveData?.price?.toFixed(2) ?? "N/A"}
                  </span>
                </div>
              </ClickableDataItem>
              {liveData?.marketCap !== null &&
                liveData?.marketCap !== undefined && (
                  <ClickableDataItem
                    isInteractive={true}
                    onClickHandler={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "marketCapDisplayTriggerProfile",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Market Cap: ${formatNumberWithAbbreviations(
                      liveData.marketCap
                    )}`}
                    baseClassName="flex items-baseline justify-end min-w-0 py-0.5 gap-1 text-foreground hover:text-primary cursor-pointer"
                    aria-label={`Request Price card for Market Cap details of ${symbol}`}>
                    <span className="text-xs font-medium shrink-0">
                      Mkt Cap:
                    </span>
                    <span className="font-semibold text-sm">
                      {formatNumberWithAbbreviations(liveData.marketCap)}
                    </span>
                  </ClickableDataItem>
                )}
            </div>
            <div className="flex flex-wrap gap-0.5 justify-end mt-0.5">
              {staticData?.is_etf && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[8px] leading-tight">
                  ETF
                </Badge>
              )}
              {staticData?.is_adr && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[8px] leading-tight">
                  ADR
                </Badge>
              )}
              {staticData?.is_fund && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[8px] leading-tight">
                  Fund
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div
          data-testid={`profile-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full text-xs">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1.5 flex-grow">
            <p className="text-muted-foreground/90 text-center mb-1.5 leading-relaxed text-xs px-1">
              {backData.description ||
                `Profile details for ${companyName || symbol}.`}
            </p>
            <div className="space-y-1.5">
              {staticData?.ceo &&
                renderDataItem(
                  "CEO",
                  staticData.ceo,
                  "",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "profile",
                      originatingElement: "ceoValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `CEO: ${staticData.ceo}`
                )}
              {staticData?.formatted_ipo_date &&
                renderDataItem(
                  "IPO Date",
                  staticData.formatted_ipo_date,
                  "",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "profile",
                      originatingElement: "ipoDateValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `IPO Date: ${staticData.formatted_ipo_date}`
                )}
              {staticData?.exchange_full_name &&
                renderDataItem(
                  "Exchange",
                  staticData.exchange_full_name,
                  "",
                  !!staticData.exchange,
                  () => {
                    if (staticData.exchange) {
                      handleInteraction("FILTER_WORKSPACE_DATA", {
                        filterField: "exchange",
                        filterValue: staticData.exchange,
                        originatingElement: "exchangeLinkBack",
                      } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  },
                  `Exchange: ${staticData.exchange_full_name}`
                )}
              {staticData?.isin &&
                renderDataItem(
                  "ISIN",
                  staticData.isin,
                  "",
                  false,
                  undefined,
                  `ISIN: ${staticData.isin}`
                )}
              {staticData?.last_dividend !== null &&
                staticData?.last_dividend !== undefined &&
                renderDataItem(
                  "Last Div.",
                  staticData.last_dividend,
                  ` ${staticData.currency || ""}`,
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "cashuse",
                      originatingElement: "lastDividendDisplayTriggerBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `Last Dividend: ${staticData.last_dividend.toFixed(2)} ${
                    staticData.currency || ""
                  }`
                )}
              {staticData?.beta !== null &&
                staticData?.beta !== undefined &&
                renderDataItem(
                  "1Y Beta",
                  staticData.beta,
                  "",
                  true,
                  () =>
                    handleInteraction("TRIGGER_CARD_ACTION", {
                      actionName: "viewVolatilityAnalysis",
                      actionData: { beta: staticData.beta },
                    } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `1 Year Beta: ${staticData.beta.toFixed(2)}`
                )}
              {staticData?.average_volume !== null &&
                staticData?.average_volume !== undefined &&
                renderDataItem(
                  "Avg. Vol.",
                  formatNumberWithAbbreviations(staticData.average_volume),
                  "",
                  true,
                  () =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "price",
                      originatingElement: "avgVolumeDisplayTriggerBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">),
                  `Average Volume: ${formatNumberWithAbbreviations(
                    staticData.average_volume
                  )}`
                )}
            </div>
          </ShadCardContent>
          <div className="px-0 pt-0.5 text-center mt-auto">
            {staticData?.profile_last_updated && (
              <p className="text-[9px] text-muted-foreground/80 leading-tight">
                Profile as of: {staticData.profile_last_updated}
              </p>
            )}
          </div>
        </div>
      );
    }
  }
);

ProfileCardContent.displayName = "ProfileCardContent";
