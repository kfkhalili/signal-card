// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import {
  CardContent as ShadCardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { cn } from "../../../../lib/utils";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks,
} from "./profile-card.types";
import {
  formatNumberWithAbbreviations,
  formatPercentage,
} from "@/lib/formatters";
import { ExternalLink, BarChart3 } from "lucide-react";

interface ProfileCardContentProps {
  cardData: ProfileCardData;
  isBackFace: boolean;
  interactionCallbacks?: ProfileCardInteractionCallbacks;
}

export const ProfileCardContent: React.FC<ProfileCardContentProps> = React.memo(
  ({ cardData, isBackFace, interactionCallbacks }) => {
    const { staticData, liveData, symbol } = cardData;

    const currencySymbol =
      staticData.currency === "USD" ? "$" : staticData.currency || "$";

    const handleWebsiteClick = (e: React.MouseEvent | React.KeyboardEvent) => {
      if (staticData.website && interactionCallbacks?.onWebsiteClick) {
        e.stopPropagation(); // Prevent card flip if this item is directly on the card surface
        interactionCallbacks.onWebsiteClick(staticData.website);
      }
    };

    const handleShowFullPriceChart = (
      e: React.MouseEvent | React.KeyboardEvent
    ) => {
      if (interactionCallbacks?.onShowFullPriceCard) {
        e.stopPropagation();
        interactionCallbacks.onShowFullPriceCard({
          id: cardData.id,
          symbol,
          type: cardData.type,
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

    if (isBackFace) {
      // --- BACK FACE ---
      return (
        <div
          data-testid={`profile-card-back-${symbol}`}
          className="pointer-events-auto text-xs sm:text-sm">
          <ShadCardContent className="pt-2 pb-2 px-0 space-y-3">
            {staticData.description && (
              <div>
                <h4 className="font-semibold mb-0.5 text-sm sm:text-base">
                  About
                </h4>
                <CardDescription className="text-muted-foreground leading-relaxed line-clamp-6 sm:line-clamp-none hover:line-clamp-none transition-all">
                  {staticData.description}
                </CardDescription>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {staticData.ceo && (
                <div>
                  <span className="font-semibold block">CEO</span>
                  <span className="text-muted-foreground">
                    {staticData.ceo}
                  </span>
                </div>
              )}
              {staticData.formatted_full_time_employees && (
                <div>
                  <span className="font-semibold block">Employees</span>
                  <span className="text-muted-foreground">
                    {staticData.formatted_full_time_employees}
                  </span>
                </div>
              )}
              {staticData.exchange_full_name && (
                <ClickableDataItem
                  isInteractive={!!interactionCallbacks?.onFilterByField}
                  onClickHandler={(e) =>
                    handleFilterClick(
                      e,
                      "exchange",
                      staticData.exchange_full_name
                    )
                  }
                  baseClassName="w-full"
                  interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                  aria-label={
                    interactionCallbacks?.onFilterByField
                      ? `Filter by exchange: ${staticData.exchange_full_name}`
                      : undefined
                  }>
                  <span className="font-semibold block">Exchange</span>
                  <span className="text-muted-foreground">
                    {staticData.exchange_full_name}
                  </span>
                </ClickableDataItem>
              )}
              {staticData.country && (
                <div>
                  <span className="font-semibold block">Country</span>
                  <span className="text-muted-foreground">
                    {staticData.country}
                  </span>
                </div>
              )}
              {staticData.formatted_ipo_date && (
                <div>
                  <span className="font-semibold block">IPO Date</span>
                  <span className="text-muted-foreground">
                    {staticData.formatted_ipo_date}
                  </span>
                </div>
              )}
              {staticData.phone && (
                <div>
                  <span className="font-semibold block">Phone</span>
                  <span className="text-muted-foreground">
                    {staticData.phone}
                  </span>
                </div>
              )}
            </div>

            {staticData.full_address && (
              <div>
                <span className="font-semibold block">Address</span>
                <span className="text-muted-foreground">
                  {staticData.full_address}
                </span>
              </div>
            )}
            {staticData.profile_last_updated && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                Profile data as of: {staticData.profile_last_updated}
              </p>
            )}
          </ShadCardContent>
        </div>
      );
    } else {
      // --- FRONT FACE ---
      return (
        <div
          data-testid={`profile-card-front-${symbol}`}
          className="pointer-events-auto">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-2 sm:space-y-3">
            {/* Live Financial Snapshot */}
            <div className="p-2 -mx-2 rounded-md bg-muted/30 dark:bg-muted/10">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  {currencySymbol}
                  {liveData.price?.toFixed(2) ?? "N/A"}
                </span>
                <div
                  className={cn(
                    "text-sm sm:text-base font-semibold",
                    !liveData.dayChange || liveData.dayChange === 0
                      ? "text-muted-foreground"
                      : liveData.dayChange > 0
                      ? "text-green-600 dark:text-green-500"
                      : "text-red-600 dark:text-red-500"
                  )}>
                  {liveData.dayChange && liveData.dayChange > 0 ? "+" : ""}
                  {liveData.dayChange?.toFixed(2) ?? "N/A"}
                  {liveData.changePercentage != null && (
                    <span className="ml-1 text-xs sm:text-sm">
                      ({liveData.changePercentage > 0 ? "+" : ""}
                      {formatPercentage(liveData.changePercentage)})
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>
                  Volume: {formatNumberWithAbbreviations(liveData.volume)}
                </span>
                {liveData.timestamp && (
                  <span>
                    Live: {new Date(liveData.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Key Static Info */}
            <div className="space-y-1 text-xs sm:text-sm">
              {staticData.sector && (
                <ClickableDataItem
                  isInteractive={!!interactionCallbacks?.onFilterByField}
                  onClickHandler={(e) =>
                    handleFilterClick(e, "sector", staticData.sector)
                  }
                  baseClassName="w-full"
                  interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                  aria-label={
                    interactionCallbacks?.onFilterByField
                      ? `Filter by sector: ${staticData.sector}`
                      : undefined
                  }>
                  <span className="font-semibold">Sector:</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {staticData.sector}
                  </span>
                </ClickableDataItem>
              )}
              {staticData.industry && (
                <ClickableDataItem
                  isInteractive={!!interactionCallbacks?.onFilterByField}
                  onClickHandler={(e) =>
                    handleFilterClick(e, "industry", staticData.industry)
                  }
                  baseClassName="w-full"
                  interactiveClassName="cursor-pointer hover:text-primary transition-colors"
                  aria-label={
                    interactionCallbacks?.onFilterByField
                      ? `Filter by industry: ${staticData.industry}`
                      : undefined
                  }>
                  <span className="font-semibold">Industry:</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {staticData.industry}
                  </span>
                </ClickableDataItem>
              )}
              {staticData.website && (
                <ClickableDataItem
                  isInteractive={!!interactionCallbacks?.onWebsiteClick}
                  onClickHandler={handleWebsiteClick}
                  baseClassName="flex items-center space-x-1 w-fit"
                  interactiveClassName="cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  aria-label={`Visit website for ${
                    cardData.companyName || symbol
                  }`}>
                  <ExternalLink size={14} className="inline-block" />
                  <span className="font-semibold">Website</span>
                </ClickableDataItem>
              )}
            </div>

            {/* Badges for Flags */}
            <div className="flex flex-wrap gap-1 pt-1">
              {staticData.is_etf && <Badge variant="outline">ETF</Badge>}
              {staticData.is_adr && <Badge variant="outline">ADR</Badge>}
              {staticData.is_fund && <Badge variant="outline">Fund</Badge>}
            </div>
            {staticData.profile_last_updated && (
              <p className="text-xs text-muted-foreground/70 pt-1">
                Profile as of: {staticData.profile_last_updated}
              </p>
            )}
          </ShadCardContent>
          {interactionCallbacks?.onShowFullPriceCard && (
            <CardFooter className="p-0 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-primary hover:text-primary/90"
                onClick={handleShowFullPriceChart}
                aria-label={`View full price chart for ${symbol}`}>
                <BarChart3 size={16} className="mr-2" />
                View Full Price Chart
              </Button>
            </CardFooter>
          )}
        </div>
      );
    }
  }
);

ProfileCardContent.displayName = "ProfileCardContent";
