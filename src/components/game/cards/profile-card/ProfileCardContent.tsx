// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import type { ProfileCardData } from "./profile-card.types";
import {
  Users,
  CalendarDays,
  Building,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { getFlagEmoji, getCountryName } from "@/lib/utils";
import {
  SectorIconDisplay,
  type SectorName,
} from "@/components/workspace/SectorIconDisplay";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  FilterWorkspaceDataInteraction,
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

    // Helper to construct and dispatch payloads
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
      } as InteractionPayload; // Cast is acceptable here due to the discriminated union logic in handler
      onGenericInteraction(payload);
    };

    if (!isBackFace) {
      const description = staticData?.description;
      const countryFlag = getFlagEmoji(staticData?.country); //
      const fullCountryName = staticData?.country
        ? getCountryName(staticData.country) //
        : "N/A";

      return (
        <div
          data-testid={`profile-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between text-xs">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1.5 flex-grow">
            {description && (
              <p
                className="text-muted-foreground text-sm leading-tight line-clamp-5"
                style={{ minHeight: "6.25em" }}
                title={description || undefined}>
                {description}
              </p>
            )}

            <div className="space-y-1 mt-1">
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
                baseClassName="flex items-center min-w-0 gap-1.5"
                interactiveClassName="hover:text-primary cursor-pointer"
                aria-label={`Filter by industry: ${
                  staticData?.industry || "N/A"
                }`}>
                <SectorIconDisplay
                  sector={staticData?.sector as SectorName}
                  iconSize={14}
                />
                <span className="truncate text-foreground">
                  {truncateText(staticData?.industry, 28)}
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
                  baseClassName="flex items-center min-w-0 gap-1.5 pt-0.5"
                  interactiveClassName="hover:text-primary cursor-pointer"
                  aria-label={`Filter by country: ${fullCountryName}`}>
                  <span className="text-base leading-none">{countryFlag}</span>
                  <span
                    className="truncate text-foreground"
                    title={fullCountryName}>
                    {fullCountryName}
                  </span>
                </ClickableDataItem>
              )}

              {staticData?.formatted_full_time_employees && (
                <div
                  className="flex items-center text-muted-foreground min-w-0 pt-0.5"
                  title={`${staticData.formatted_full_time_employees} employees`}>
                  <Users size={12} className="mr-1.5 shrink-0" />
                  <span className="truncate text-foreground">
                    {staticData.formatted_full_time_employees}
                  </span>
                </div>
              )}
            </div>
          </ShadCardContent>

          <div className="px-0 pt-1">
            <div className="flex justify-between items-center text-xs mb-0.5">
              <ClickableDataItem
                isInteractive={true}
                onClickHandler={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "priceDisplayTrigger",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                baseClassName="py-0.5"
                interactiveClassName="hover:text-primary cursor-pointer"
                aria-label={`Request Price Card for ${symbol}`}>
                <div className="flex items-center">
                  <TrendingUp size={14} className="mr-1 shrink-0" />
                  <span className="font-semibold text-sm">
                    {staticData?.currency === "USD"
                      ? "$"
                      : staticData?.currency || "$"}
                    {liveData?.price?.toFixed(2) ?? "N/A"}
                  </span>
                </div>
              </ClickableDataItem>
              <div></div>{" "}
              {/* Placeholder for potential right-aligned content */}
            </div>
            <div className="flex flex-wrap gap-0.5 justify-end">
              {staticData?.is_etf && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[9px] leading-tight">
                  ETF
                </Badge>
              )}
              {staticData?.is_adr && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[9px] leading-tight">
                  ADR
                </Badge>
              )}
              {staticData?.is_fund && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 text-[9px] leading-tight">
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
            <div className="space-y-1">
              {staticData?.ceo && (
                <div
                  className="flex items-start min-w-0"
                  title={`CEO: ${staticData.ceo}`}>
                  <UserCheck
                    size={14}
                    className="mr-1.5 mt-px text-muted-foreground shrink-0"
                  />
                  <div>
                    <span className="font-medium text-muted-foreground block leading-tight">
                      CEO
                    </span>
                    <span className="text-foreground leading-tight line-clamp-2">
                      {staticData.ceo}
                    </span>
                  </div>
                </div>
              )}
              {staticData?.formatted_ipo_date && (
                <div
                  className="flex items-start min-w-0"
                  title={`IPO: ${staticData.formatted_ipo_date}`}>
                  <CalendarDays
                    size={14}
                    className="mr-1.5 mt-px text-muted-foreground shrink-0"
                  />
                  <div>
                    <span className="font-medium text-muted-foreground block leading-tight">
                      IPO Date
                    </span>
                    <span className="text-foreground leading-tight">
                      {staticData.formatted_ipo_date}
                    </span>
                  </div>
                </div>
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
                  baseClassName="min-w-0">
                  <div className="flex items-start">
                    <Building
                      size={14}
                      className="mr-1.5 mt-px text-muted-foreground shrink-0"
                    />
                    <div>
                      <span className="font-medium text-muted-foreground block leading-tight">
                        Exchange
                      </span>
                      <span className="text-foreground leading-tight line-clamp-2">
                        {staticData.exchange_full_name}
                      </span>
                    </div>
                  </div>
                </ClickableDataItem>
              )}
            </div>
          </ShadCardContent>
          <div className="px-0 pt-0.5 text-center">
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
