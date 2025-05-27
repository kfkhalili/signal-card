// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem"; //
import type { ProfileCardData } from "./profile-card.types";
import { getFlagEmoji, getCountryName, cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import type {
  OnGenericInteraction,
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

    if (!isBackFace) {
      const description = staticData?.description;
      const countryFlag = getFlagEmoji(staticData?.country);
      const fullCountryName = staticData?.country
        ? getCountryName(staticData.country)
        : "N/A";

      // Define a common base class for interactive items if they should share a default color
      const interactiveItemBaseColor = "text-foreground"; // Or "text-muted-foreground" if that's the default
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
                    const payload: FilterWorkspaceDataInteraction = {
                      intent: "FILTER_WORKSPACE_DATA",
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      sourceCardType: cardType,
                      filterField: "industry",
                      filterValue: staticData.industry,
                      originatingElement: "industryLink",
                    };
                    onGenericInteraction(payload);
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
                      const payload: FilterWorkspaceDataInteraction = {
                        intent: "FILTER_WORKSPACE_DATA",
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        sourceCardType: cardType,
                        filterField: "country",
                        filterValue: staticData.country,
                        originatingElement: "countryLink",
                      };
                      onGenericInteraction(payload);
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
                    const payload: TriggerCardActionInteraction = {
                      intent: "TRIGGER_CARD_ACTION",
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      sourceCardType: cardType,
                      actionName: "viewEmployeeData",
                      actionData: {
                        employees: staticData.formatted_full_time_employees,
                      },
                    };
                    onGenericInteraction(payload);
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
                      const payload: RequestNewCardInteraction = {
                        intent: "REQUEST_NEW_CARD",
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        sourceCardType: cardType,
                        targetCardType: "revenue",
                        originatingElement: "revenueDisplayTrigger",
                      };
                      onGenericInteraction(payload);
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
                    const payload: RequestNewCardInteraction = {
                      intent: "REQUEST_NEW_CARD",
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      sourceCardType: cardType,
                      targetCardType: "revenue",
                      originatingElement: "epsDisplayTrigger",
                    };
                    onGenericInteraction(payload);
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
            </div>
          </ShadCardContent>

          <div className="px-0 pt-1 mt-auto">
            <div className="grid grid-cols-2 gap-x-2 items-center text-xs mb-0.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() => {
                  const payload: RequestNewCardInteraction = {
                    intent: "REQUEST_NEW_CARD",
                    sourceCardId: id,
                    sourceCardSymbol: symbol,
                    sourceCardType: cardType,
                    targetCardType: "price",
                    originatingElement: "priceDisplayTrigger",
                  };
                  onGenericInteraction(payload);
                }}
                baseClassName={cn("py-0.5", interactiveItemBaseColor)} // Apply base color
                interactiveClassName={interactiveHoverColor}
                aria-label={`Request Price Card for ${symbol}`}>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-medium shrink-0">Price:</span>
                  <span className="font-semibold text-sm">
                    {" "}
                    {/* font-semibold might have its own color, check if it overrides */}
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
                      const payload: RequestNewCardInteraction = {
                        intent: "REQUEST_NEW_CARD",
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        sourceCardType: cardType,
                        targetCardType: "price",
                        originatingElement: "marketCapDisplayTrigger",
                      };
                      onGenericInteraction(payload);
                    }}
                    title={`Market Cap: ${formatNumberWithAbbreviations(
                      liveData.marketCap
                    )}`}
                    baseClassName={cn(
                      "flex items-baseline justify-end min-w-0 py-0.5 gap-1",
                      interactiveItemBaseColor
                    )} // Apply base color
                    interactiveClassName={interactiveHoverColor}
                    aria-label={`Request Price card for Market Cap details of ${symbol}`}>
                    <span className="text-xs font-medium shrink-0">
                      Market Cap:
                    </span>
                    <span className="font-semibold text-sm">
                      {" "}
                      {/* font-semibold might have its own color */}
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
      // For consistency, if these items on the back were also meant to be interactive
      // and have hover effects, a similar approach would be needed.
      // For now, focusing on the front face as per the immediate issue.
      const nonInteractiveItemColor = "text-foreground"; // Default color for non-interactive items on back
      const interactiveItemBaseColorBack = "text-muted-foreground";
      const interactiveHoverColorBack = "hover:text-primary cursor-pointer";

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
                <div
                  title={`CEO: ${staticData.ceo}`}
                  className={cn(
                    "flex items-start min-w-0 gap-1",
                    nonInteractiveItemColor
                  )}>
                  <span className="font-medium block leading-tight shrink-0">
                    CEO:
                  </span>
                  <span className="leading-tight line-clamp-2">
                    {staticData.ceo}
                  </span>
                </div>
              )}
              {staticData?.formatted_ipo_date && (
                <div
                  title={`IPO: ${staticData.formatted_ipo_date}`}
                  className={cn(
                    "flex items-start min-w-0 gap-1",
                    nonInteractiveItemColor
                  )}>
                  <span className="font-medium block leading-tight shrink-0">
                    IPO:
                  </span>
                  <span className="leading-tight">
                    {staticData.formatted_ipo_date}
                  </span>
                </div>
              )}
              {staticData?.exchange_full_name && (
                <ClickableDataItem
                  isInteractive={!!staticData.exchange}
                  onClickHandler={() => {
                    if (staticData.exchange) {
                      const payload: FilterWorkspaceDataInteraction = {
                        intent: "FILTER_WORKSPACE_DATA",
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        sourceCardType: cardType,
                        filterField: "exchange",
                        filterValue: staticData.exchange,
                        originatingElement: "exchangeLink",
                      };
                      onGenericInteraction(payload);
                    }
                  }}
                  title={`Exchange: ${staticData.exchange_full_name}`}
                  baseClassName={cn(
                    "min-w-0",
                    staticData.exchange
                      ? interactiveItemBaseColorBack
                      : nonInteractiveItemColor
                  )}
                  interactiveClassName={interactiveHoverColorBack}>
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
