// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { cn } from "@/lib/utils";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks,
} from "./profile-card.types";
import {
  ExternalLink,
  Users,
  CalendarDays,
  Building,
  TrendingUp,
  UserCheck,
  Info,
} from "lucide-react";
import { getFlagEmoji, getCountryName } from "@/lib/utils";
import {
  SectorIconDisplay,
  type SectorName,
} from "@/components/workspace/SectorIconDisplay";

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
  interactionCallbacks?: ProfileCardInteractionCallbacks;
}

export const ProfileCardContent: React.FC<ProfileCardContentProps> = React.memo(
  ({ cardData, isBackFace, interactionCallbacks }) => {
    const { staticData, liveData, symbol, companyName } = cardData;

    // if (!isBackFace && process.env.NODE_ENV === 'development') {
    //   console.log(`[ProfileCardContent ${symbol} FRONT] Rendering. CardData:`, JSON.stringify(cardData));
    //   console.log(`[ProfileCardContent ${symbol} FRONT] LiveData for rendering:`, JSON.stringify(liveData));
    //   console.log(`[ProfileCardContent ${symbol} FRONT] LiveData.price for rendering:`, liveData?.price);
    // }

    const handlePriceNavigate = (e: React.MouseEvent | React.KeyboardEvent) => {
      if (interactionCallbacks?.onRequestPriceCard) {
        e.stopPropagation();
        interactionCallbacks.onRequestPriceCard({
          id: cardData.id,
          symbol,
          type: cardData.type,
          companyName,
          websiteUrl: staticData?.website,
        });
      }
    };

    const handleFilterClick = (
      e: React.MouseEvent | React.KeyboardEvent,
      fieldType: "sector" | "industry" | "exchange",
      value: string | null | undefined
    ) => {
      if (value && interactionCallbacks?.onFilterByField) {
        e.stopPropagation();
        interactionCallbacks.onFilterByField(fieldType, value);
      }
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
                isInteractive={
                  !!interactionCallbacks?.onFilterByField &&
                  !!staticData?.industry
                }
                onClickHandler={(e) =>
                  handleFilterClick(e, "industry", staticData?.industry)
                }
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
                <div
                  className="flex items-center gap-1.5 pt-0.5 cursor-default"
                  aria-label={`Country: ${fullCountryName}`}>
                  <span className="text-base leading-none">{countryFlag}</span>
                  <span
                    className="truncate text-foreground"
                    title={fullCountryName}>
                    {fullCountryName}
                  </span>
                </div>
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
                isInteractive={!!interactionCallbacks?.onRequestPriceCard}
                onClickHandler={handlePriceNavigate}
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
              <div></div>
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
      return (
        <div
          data-testid={`profile-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full text-xs">
          <ShadCardContent className="pt-1 pb-1 px-0 space-y-1.5 flex-grow">
            <h4 className="font-semibold text-[13px] mb-1 text-center">
              Company Highlights
            </h4>
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
                  isInteractive={
                    !!interactionCallbacks?.onFilterByField &&
                    !!staticData.exchange_full_name
                  }
                  onClickHandler={(e) =>
                    handleFilterClick(
                      e,
                      "exchange",
                      staticData.exchange_full_name
                    )
                  }
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
