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

    if (!isBackFace) {
      const description = staticData?.description;
      const countryFlag = getFlagEmoji(staticData?.country);
      const fullCountryName = staticData?.country
        ? getCountryName(staticData.country)
        : "N/A";

      const interactiveItemBaseColor = "text-foreground";
      const interactiveHoverColor = "hover:text-primary cursor-pointer";

      return (
        <div
          data-testid={`profile-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between text-xs">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1 flex-grow">
            {description && (
              <p
                className="text-muted-foreground text-xs leading-snug line-clamp-3"
                style={{ minHeight: "2.25rem" }}
                title={description || undefined}>
                {description}
              </p>
            )}

            <div className="space-y-0.5 mt-0.5">
              <ClickableDataItem
                isInteractive={!!staticData?.industry}
                onClickHandler={() => {
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
                baseClassName={cn(
                  "flex items-baseline min-w-0 gap-1",
                  interactiveItemBaseColor
                )}
                interactiveClassName={interactiveHoverColor}
                aria-label={`Filter by industry: ${
                  staticData?.industry || "N/A"
                }`}>
                <span className="text-xs font-medium shrink-0">Industry:</span>
                <span className="truncate text-xs">
                  {truncateText(staticData?.industry, 22)}
                  {staticData?.sector && (
                    <span className="text-xs">
                      {" "}
                      ({truncateText(staticData.sector, 15)})
                    </span>
                  )}
                </span>
              </ClickableDataItem>

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
                  baseClassName={cn(
                    "flex items-baseline min-w-0 gap-1",
                    interactiveItemBaseColor
                  )}
                  interactiveClassName={interactiveHoverColor}
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

              {staticData?.formatted_full_time_employees && (
                <ClickableDataItem
                  isInteractive={true}
                  onClickHandler={() => {
                    handleInteraction("TRIGGER_CARD_ACTION", {
                      actionName: "viewEmployeeData",
                      actionData: {
                        employees: staticData.formatted_full_time_employees,
                      },
                    } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  title={`${staticData.formatted_full_time_employees} employees`}
                  baseClassName={cn(
                    "flex items-baseline min-w-0 gap-1",
                    interactiveItemBaseColor
                  )}
                  interactiveClassName={interactiveHoverColor}
                  aria-label={`Employee count: ${staticData.formatted_full_time_employees}`}>
                  <span className="text-xs font-medium shrink-0">
                    Employees:
                  </span>
                  <span className="truncate text-xs">
                    {staticData.formatted_full_time_employees}
                  </span>
                </ClickableDataItem>
              )}

              {liveData?.revenue !== null &&
                liveData?.revenue !== undefined && (
                  <ClickableDataItem
                    isInteractive={true}
                    onClickHandler={() => {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "revenue",
                        originatingElement: "revenueDisplayTrigger",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }}
                    title={`Revenue (TTM/Latest): ${formatNumberWithAbbreviations(
                      liveData.revenue
                    )}`}
                    baseClassName={cn(
                      "flex items-baseline min-w-0 gap-1",
                      interactiveItemBaseColor
                    )}
                    interactiveClassName={interactiveHoverColor}
                    aria-label={`Request Revenue Card for ${symbol}`}>
                    <span className="text-xs font-medium shrink-0">
                      Revenue:
                    </span>
                    <span className="truncate text-xs">
                      {formatNumberWithAbbreviations(liveData.revenue)}
                    </span>
                  </ClickableDataItem>
                )}

              {liveData?.eps !== null && liveData?.eps !== undefined && (
                <ClickableDataItem
                  isInteractive={true}
                  onClickHandler={() => {
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "revenue",
                      originatingElement: "epsDisplayTrigger",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  title={`EPS (TTM/Latest): ${
                    staticData?.currency ?? ""
                  }${liveData.eps.toFixed(2)}`}
                  baseClassName={cn(
                    "flex items-baseline min-w-0 gap-1",
                    interactiveItemBaseColor
                  )}
                  interactiveClassName={interactiveHoverColor}
                  aria-label={`Request Revenue card for EPS details of ${symbol}`}>
                  <span className="text-xs font-medium shrink-0">EPS:</span>
                  <span className="truncate text-xs">
                    {staticData?.currency ?? ""}
                    {liveData.eps.toFixed(2)}
                  </span>
                </ClickableDataItem>
              )}
              {staticData?.last_dividend !== null &&
                staticData?.last_dividend !== undefined && (
                  <ClickableDataItem
                    isInteractive={true}
                    onClickHandler={() => {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "cashuse",
                        originatingElement: "lastDividendDisplayTrigger",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }}
                    title={`Last Dividend: ${
                      staticData?.currency ?? ""
                    }${staticData.last_dividend.toFixed(2)}`}
                    baseClassName={cn(
                      "flex items-baseline min-w-0 gap-1",
                      interactiveItemBaseColor
                    )}
                    interactiveClassName={interactiveHoverColor}
                    aria-label={`Last Dividend for ${symbol}: ${
                      staticData?.currency ?? ""
                    }${staticData.last_dividend.toFixed(2)}`}>
                    <span className="text-xs font-medium shrink-0">
                      Last Div:
                    </span>
                    <span className="truncate text-xs">
                      {staticData?.currency ?? ""}
                      {staticData.last_dividend.toFixed(2)}
                    </span>
                  </ClickableDataItem>
                )}

              {staticData?.beta !== null && staticData?.beta !== undefined && (
                <ClickableDataItem
                  isInteractive={true}
                  onClickHandler={() => {
                    handleInteraction("TRIGGER_CARD_ACTION", {
                      actionName: "viewVolatilityAnalysis",
                      actionData: { beta: staticData.beta },
                    } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                  }}
                  title={`1 Year Beta: ${staticData.beta.toFixed(2)}`}
                  baseClassName={cn(
                    "flex items-baseline min-w-0 gap-1",
                    interactiveItemBaseColor
                  )}
                  interactiveClassName={interactiveHoverColor}
                  aria-label={`1 Year Beta for ${symbol}: ${staticData.beta.toFixed(
                    2
                  )}`}>
                  <span className="text-xs font-medium shrink-0">1Y Beta:</span>
                  <span className="truncate text-xs">
                    {staticData.beta.toFixed(2)}
                  </span>
                </ClickableDataItem>
              )}

              {staticData?.average_volume !== null &&
                staticData?.average_volume !== undefined && (
                  <ClickableDataItem
                    isInteractive={true}
                    onClickHandler={() => {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price", // Or a specific volume chart card if you plan one
                        originatingElement: "avgVolumeDisplayTrigger",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }}
                    title={`Avg Volume: ${formatNumberWithAbbreviations(
                      staticData.average_volume
                    )}`}
                    baseClassName={cn(
                      "flex items-baseline min-w-0 gap-1",
                      interactiveItemBaseColor
                    )}
                    interactiveClassName={interactiveHoverColor}
                    aria-label={`Average Volume for ${symbol}: ${formatNumberWithAbbreviations(
                      staticData.average_volume
                    )}`}>
                    <span className="text-xs font-medium shrink-0">
                      Avg Vol:
                    </span>
                    <span className="truncate text-xs">
                      {formatNumberWithAbbreviations(staticData.average_volume)}
                    </span>
                  </ClickableDataItem>
                )}
            </div>
          </ShadCardContent>

          <div className="px-0 pt-1 mt-auto">
            <div className="grid grid-cols-2 gap-x-2 items-center text-xs mb-0.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() => {
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "priceDisplayTrigger",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                }}
                baseClassName={cn("py-0.5", interactiveItemBaseColor)}
                interactiveClassName={interactiveHoverColor}
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
                    onClickHandler={() => {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "marketCapDisplayTrigger",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }}
                    title={`Market Cap: ${formatNumberWithAbbreviations(
                      liveData.marketCap
                    )}`}
                    baseClassName={cn(
                      "flex items-baseline justify-end min-w-0 py-0.5 gap-1",
                      interactiveItemBaseColor
                    )}
                    interactiveClassName={interactiveHoverColor}
                    aria-label={`Request Price card for Market Cap details of ${symbol}`}>
                    <span className="text-xs font-medium shrink-0">
                      Market Cap:
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
      const interactiveItemBaseColorBack = "text-muted-foreground"; // For items that become interactive
      const interactiveHoverColorBack = "hover:text-primary cursor-pointer";
      const nonInteractiveItemColor = "text-foreground"; // For items that remain non-interactive or their base color

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
                <ClickableDataItem
                  isInteractive={!!staticData.ceo}
                  onClickHandler={() => {
                    if (staticData.ceo) {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "profile",
                        originatingElement: "ceoValueBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  title={`CEO: ${staticData.ceo}`}
                  baseClassName={cn("min-w-0", interactiveItemBaseColorBack)}
                  interactiveClassName={interactiveHoverColorBack}
                  aria-label={`View full profile for CEO: ${staticData.ceo}`}>
                  <div className="flex items-start gap-1">
                    <span className="font-medium block leading-tight shrink-0">
                      CEO:
                    </span>
                    <span className="leading-tight line-clamp-2">
                      {staticData.ceo}
                    </span>
                  </div>
                </ClickableDataItem>
              )}
              {staticData?.formatted_ipo_date && (
                <ClickableDataItem
                  isInteractive={!!staticData.formatted_ipo_date}
                  onClickHandler={() => {
                    if (staticData.formatted_ipo_date) {
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "profile",
                        originatingElement: "ipoDateValueBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  title={`IPO Date: ${staticData.formatted_ipo_date}`}
                  baseClassName={cn("min-w-0", interactiveItemBaseColorBack)}
                  interactiveClassName={interactiveHoverColorBack}
                  aria-label={`View full profile for IPO details`}>
                  <div className="flex items-start gap-1">
                    <span className="font-medium block leading-tight shrink-0">
                      IPO:
                    </span>
                    <span className="leading-tight">
                      {staticData.formatted_ipo_date}
                    </span>
                  </div>
                </ClickableDataItem>
              )}
              {staticData?.exchange_full_name && (
                <ClickableDataItem
                  isInteractive={!!staticData.exchange}
                  onClickHandler={() => {
                    if (staticData.exchange) {
                      handleInteraction("FILTER_WORKSPACE_DATA", {
                        filterField: "exchange",
                        filterValue: staticData.exchange,
                        originatingElement: "exchangeLink",
                      } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  title={`Exchange: ${staticData.exchange_full_name}`}
                  baseClassName={cn(
                    "min-w-0", // Keep min-w-0 for layout consistency
                    staticData.exchange // If exchange exists (for filtering), apply interactive base color
                      ? interactiveItemBaseColorBack
                      : nonInteractiveItemColor // Otherwise, use non-interactive color
                  )}
                  interactiveClassName={
                    staticData.exchange ? interactiveHoverColorBack : ""
                  } // Apply hover only if interactive
                  aria-label={
                    staticData.exchange
                      ? `Filter by exchange: ${staticData.exchange_full_name}`
                      : `Exchange: ${staticData.exchange_full_name}`
                  }>
                  <div className="flex items-start gap-1">
                    <span className="font-medium block leading-tight shrink-0">
                      Exchange:
                    </span>
                    <span className="leading-tight line-clamp-2">
                      {staticData.exchange_full_name}
                    </span>
                  </div>
                </ClickableDataItem>
              )}
              {staticData?.isin && (
                <ClickableDataItem
                  isInteractive={false} // ISIN is usually not interactive for filtering/card creation
                  title={`ISIN: ${staticData.isin}`}
                  baseClassName={cn("min-w-0", nonInteractiveItemColor)}
                  aria-label={`ISIN: ${staticData.isin}`}>
                  <div className="flex items-start gap-1">
                    <span className="font-medium block leading-tight shrink-0">
                      ISIN:
                    </span>
                    <span className="leading-tight">{staticData.isin}</span>
                  </div>
                </ClickableDataItem>
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
