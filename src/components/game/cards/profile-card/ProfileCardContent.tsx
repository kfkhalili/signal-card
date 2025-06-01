// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import type { ProfileCardData } from "./profile-card.types";
import { getFlagEmoji, getCountryName } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { DataRow } from "@/components/ui/DataRow"; // Import the shared DataRow
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
              <DataRow
                label="Industry"
                value={
                  staticData?.industry
                    ? `${truncateText(staticData.industry, 22)}${
                        staticData.sector
                          ? ` (${truncateText(staticData.sector, 15)})`
                          : ""
                      }`
                    : "N/A"
                }
                onClick={() => {
                  if (staticData?.industry) {
                    handleInteraction("FILTER_WORKSPACE_DATA", {
                      filterField: "industry",
                      filterValue: staticData.industry,
                      originatingElement: "industryLink",
                    } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }
                }}
                title={`Industry: ${staticData?.industry || "N/A"}${
                  staticData?.sector ? ` (Sector: ${staticData.sector})` : ""
                }`}
                originatingElement="industry-profile-item"
              />

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
                  aria-label={`Filter by country: ${fullCountryName}`}
                  data-testid="country-profile-item">
                  <span className="text-xs font-medium shrink-0">Country:</span>
                  <span className="text-sm leading-none mr-0.5">
                    {countryFlag}
                  </span>
                  <span className="truncate text-xs" title={fullCountryName}>
                    {fullCountryName}
                  </span>
                </ClickableDataItem>
              )}

              <DataRow
                label="Employees"
                value={staticData?.formatted_full_time_employees}
                onClick={() => {
                  handleInteraction("TRIGGER_CARD_ACTION", {
                    actionName: "viewEmployeeData",
                    actionData: {
                      employees: staticData?.formatted_full_time_employees,
                    },
                  } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }}
                title={`${
                  staticData?.formatted_full_time_employees || "N/A"
                } employees`}
                originatingElement="employees-profile-item"
              />
              {liveData?.revenue !== null &&
                liveData?.revenue !== undefined && (
                  <DataRow
                    label="Revenue (TTM)"
                    value={formatNumberWithAbbreviations(liveData.revenue)}
                    currency={staticData?.currency} // Pass currency for potential symbol use
                    isMonetary={false} // Value is already formatted, let DataRow just display it
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "revenueDisplayTriggerProfile",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Revenue (TTM): ${formatNumberWithAbbreviations(
                      liveData.revenue
                    )} ${staticData?.currency || ""}`}
                    originatingElement="revenue-ttm-profile-item"
                  />
                )}
              {liveData?.eps !== null && liveData?.eps !== undefined && (
                <DataRow
                  label={`EPS (TTM)`}
                  value={liveData.eps}
                  unit={staticData?.currency ? ` ${staticData.currency}` : ""}
                  precision={2}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "keyratios",
                      originatingElement: "epsTTMDisplayTriggerProfile",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`EPS (TTM): ${liveData.eps.toFixed(2)} ${
                    staticData?.currency || ""
                  }`}
                  originatingElement="eps-ttm-profile-item"
                />
              )}
              {liveData?.priceToEarningsRatioTTM !== null &&
                liveData?.priceToEarningsRatioTTM !== undefined && (
                  <DataRow
                    label="P/E (TTM)"
                    value={liveData.priceToEarningsRatioTTM}
                    unit="x"
                    precision={2}
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "keyratios",
                        originatingElement: "peTTMDisplayTriggerProfile",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Price/Earnings Ratio (TTM): ${liveData.priceToEarningsRatioTTM.toFixed(
                      2
                    )}x`}
                    originatingElement="pe-ttm-profile-item"
                  />
                )}
              {liveData?.priceToBookRatioTTM !== null &&
                liveData?.priceToBookRatioTTM !== undefined && (
                  <DataRow
                    label="P/B (TTM)"
                    value={liveData.priceToBookRatioTTM}
                    unit="x"
                    precision={2}
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "keyratios",
                        originatingElement: "pbTTMDisplayTriggerProfile",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Price/Book Ratio (TTM): ${liveData.priceToBookRatioTTM.toFixed(
                      2
                    )}x`}
                    originatingElement="pb-ttm-profile-item"
                  />
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
      // Back Face
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
              {staticData?.ceo && (
                <DataRow
                  label="CEO"
                  value={staticData.ceo}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      // Example interaction
                      targetCardType: "profile",
                      originatingElement: "ceoValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`CEO: ${staticData.ceo}`}
                  originatingElement="ceo-profile-item-back"
                />
              )}
              {staticData?.formatted_ipo_date && (
                <DataRow
                  label="IPO Date"
                  value={staticData.formatted_ipo_date}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "profile", // Or another relevant card
                      originatingElement: "ipoDateValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`IPO Date: ${staticData.formatted_ipo_date}`}
                  originatingElement="ipo-date-profile-item-back"
                />
              )}
              {staticData?.exchange_full_name && (
                <DataRow
                  label="Exchange"
                  value={staticData.exchange_full_name}
                  onClick={() => {
                    if (staticData.exchange) {
                      handleInteraction("FILTER_WORKSPACE_DATA", {
                        filterField: "exchange",
                        filterValue: staticData.exchange,
                        originatingElement: "exchangeLinkBack",
                      } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  title={`Exchange: ${staticData.exchange_full_name}`}
                  originatingElement="exchange-profile-item-back"
                />
              )}
              {staticData?.isin && (
                <DataRow
                  label="ISIN"
                  value={staticData.isin}
                  title={`ISIN: ${staticData.isin}`}
                  originatingElement="isin-profile-item-back"
                />
              )}
              {staticData?.last_dividend !== null &&
                staticData?.last_dividend !== undefined && (
                  <DataRow
                    label="Last Div."
                    value={staticData.last_dividend}
                    unit={staticData.currency ? ` ${staticData.currency}` : ""}
                    isMonetary={true}
                    currency={staticData.currency}
                    precision={2} // Assuming 2 decimal places for dividend amount
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "dividendshistory", // Changed from "cashuse"
                        originatingElement: "lastDividendDisplayTriggerBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Last Dividend: ${staticData.last_dividend.toFixed(
                      2
                    )} ${staticData.currency || ""}`}
                    originatingElement="last-dividend-profile-item-back"
                  />
                )}
              {staticData?.beta !== null && staticData?.beta !== undefined && (
                <DataRow
                  label="1Y Beta"
                  value={staticData.beta}
                  precision={2}
                  onClick={() =>
                    handleInteraction("TRIGGER_CARD_ACTION", {
                      actionName: "viewVolatilityAnalysis", // Or "REQUEST_NEW_CARD" if beta has its own card
                      actionData: { beta: staticData.beta },
                    } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`1 Year Beta: ${staticData.beta.toFixed(2)}`}
                  originatingElement="beta-profile-item-back"
                />
              )}
              {staticData?.average_volume !== null &&
                staticData?.average_volume !== undefined && (
                  <DataRow
                    label="Avg. Vol."
                    value={formatNumberWithAbbreviations(
                      staticData.average_volume
                    )}
                    isMonetary={false} // Avg. Volume is not monetary
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "avgVolumeDisplayTriggerBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Average Volume: ${formatNumberWithAbbreviations(
                      staticData.average_volume
                    )}`}
                    originatingElement="avg-volume-profile-item-back"
                  />
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
