// src/components/game/cards/profile-card/ProfileCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProfileCardData } from "./profile-card.types";
import { getFlagEmoji, getCountryName } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { DataRow } from "@/components/ui/DataRow";
import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  FilterWorkspaceDataInteraction,
  TriggerCardActionInteraction,
} from "../base-card/base-card.types";
import { cn } from "@/lib/utils";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";

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
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const ProfileCardContent = React.memo<ProfileCardContentProps>(
  ({
    cardData,
    isBackFace,
    onGenericInteraction,
    // NEW PROPS
    isSelectionMode,
    selectedDataItems,
    onToggleItemSelection,
  }) => {
    const { staticData, liveData, symbol, id, type: cardType } = cardData;

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
      const countryNameResult = getCountryName(staticData?.country || "");
      const countryName = countryNameResult.isOk()
        ? countryNameResult.value
        : staticData?.country || "Unknown";

      return (
        <div
          data-testid={`profile-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full justify-between">
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1.5">
              {description && (
                <p
                  className="text-sm text-muted-foreground leading-snug line-clamp-3"
                  style={{ minHeight: "3rem" }}
                  title={description || undefined}>
                  {description}
                </p>
              )}
              <div className="space-y-0.5">
                <DataRow
                  label="Sector"
                  value={
                    staticData?.sector
                      ? truncateText(staticData.sector, 30)
                      : "N/A"
                  }
                  onClick={() => {
                    if (staticData?.sector) {
                      handleInteraction("FILTER_WORKSPACE_DATA", {
                        filterField: "sector",
                        filterValue: staticData.sector,
                        originatingElement: "sectorLink",
                      } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                    }
                  }}
                  title={`Sector: ${staticData?.sector || "N/A"}`}
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-sm font-semibold text-foreground"
                  originatingElement="sector-profile-item"
                  data-testid="sector-profile-item"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-sector`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-sector`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Sector",
                      value: staticData?.sector || "N/A",
                    })
                  }
                />

                {staticData?.country && (
                  <DataRow
                    label="Country"
                    value={
                      <span className="flex items-center">
                        <span className="text-sm leading-none mr-1.5">
                          {countryFlag}
                        </span>
                        <span className="truncate" title={countryName}>
                          {countryName}
                        </span>
                      </span>
                    }
                    onClick={() => {
                      if (staticData?.country) {
                        handleInteraction("FILTER_WORKSPACE_DATA", {
                          filterField: "country",
                          filterValue: staticData.country,
                          originatingElement: "countryLink",
                        } as Omit<FilterWorkspaceDataInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">);
                      }
                    }}
                    title={`Country: ${countryName}`}
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    isInteractive={true}
                    data-testid="country-profile-item"
                    // SELECTION PROPS
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedDataItems.some(
                      (item) => item.id === `${id}-country`
                    )}
                    onSelect={() =>
                      onToggleItemSelection({
                        id: `${id}-country`,
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Country",
                        value: countryName,
                      })
                    }
                  />
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
                  labelClassName="text-sm font-medium text-muted-foreground"
                  valueClassName="text-sm font-semibold text-foreground"
                  originatingElement="employees-profile-item"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-employees`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-employees`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Employees",
                      value: staticData?.formatted_full_time_employees || "N/A",
                    })
                  }
                />
                {liveData?.revenue !== null &&
                  liveData?.revenue !== undefined && (
                    <DataRow
                      label="Revenue (TTM)"
                      value={formatNumberWithAbbreviations(liveData.revenue)}
                      currency={staticData?.currency}
                      isMonetary={true}
                      onClick={() =>
                        handleInteraction("REQUEST_NEW_CARD", {
                          targetCardType: "revenue",
                          originatingElement: "revenueDisplayTriggerProfile",
                        } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                      }
                      title={`Revenue (TTM): ${formatNumberWithAbbreviations(
                        liveData.revenue
                      )} ${staticData?.currency || ""}`}
                      labelClassName="text-sm font-medium text-muted-foreground"
                      valueClassName="text-sm font-semibold text-foreground"
                      originatingElement="revenue-ttm-profile-item"
                      // SELECTION PROPS
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedDataItems.some(
                        (item) => item.id === `${id}-revenue`
                      )}
                      onSelect={() =>
                        onToggleItemSelection({
                          id: `${id}-revenue`,
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: "Revenue (TTM)",
                          value: liveData.revenue,
                          isMonetary: true,
                          currency: staticData?.currency,
                        })
                      }
                    />
                  )}
                {liveData?.eps !== null && liveData?.eps !== undefined && (
                  <DataRow
                    label={`EPS (TTM)`}
                    value={liveData.eps}
                    currency={staticData?.currency}
                    isMonetary={true}
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
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    originatingElement="eps-ttm-profile-item"
                    // SELECTION PROPS
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedDataItems.some(
                      (item) => item.id === `${id}-eps`
                    )}
                    onSelect={() =>
                      onToggleItemSelection({
                        id: `${id}-eps`,
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "EPS (TTM)",
                        value: liveData.eps,
                        isMonetary: true,
                        currency: staticData?.currency,
                      })
                    }
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
                      labelClassName="text-sm font-medium text-muted-foreground"
                      valueClassName="text-sm font-semibold text-foreground"
                      originatingElement="pe-ttm-profile-item"
                      // SELECTION PROPS
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedDataItems.some(
                        (item) => item.id === `${id}-pe`
                      )}
                      onSelect={() =>
                        onToggleItemSelection({
                          id: `${id}-pe`,
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: "P/E (TTM)",
                          value: liveData.priceToEarningsRatioTTM,
                          unit: "x",
                        })
                      }
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
                      labelClassName="text-sm font-medium text-muted-foreground"
                      valueClassName="text-sm font-semibold text-foreground"
                      originatingElement="pb-ttm-profile-item"
                      // SELECTION PROPS
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedDataItems.some(
                        (item) => item.id === `${id}-pb`
                      )}
                      onSelect={() =>
                        onToggleItemSelection({
                          id: `${id}-pb`,
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: "P/B (TTM)",
                          value: liveData.priceToBookRatioTTM,
                          unit: "x",
                        })
                      }
                    />
                  )}
              </div>
            </div>
          </ShadCardContent>

          <div className="p-0 pt-1 mt-auto">
            <div className="grid grid-cols-2 gap-x-2 items-center mb-0.5">
              <DataRow
                label="Price:"
                value={
                  (staticData?.currency === "USD"
                    ? "$"
                    : staticData?.currency || "$") +
                  (liveData?.price?.toFixed(2) ?? "N/A")
                }
                onClick={() =>
                  handleInteraction("REQUEST_NEW_CARD", {
                    targetCardType: "price",
                    originatingElement: "priceDisplayTriggerProfile",
                  } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                }
                isInteractive={true}
                labelClassName="text-sm font-medium text-muted-foreground"
                valueClassName="text-sm font-semibold text-foreground"
                // SELECTION PROPS
                isSelectionMode={isSelectionMode}
                isSelected={selectedDataItems.some(
                  (item) => item.id === `${id}-price`
                )}
                onSelect={() =>
                  onToggleItemSelection({
                    id: `${id}-price`,
                    sourceCardId: id,
                    sourceCardSymbol: symbol,
                    label: "Price",
                    value: liveData.price,
                    isMonetary: true,
                    currency: staticData?.currency,
                  })
                }
              />
              {liveData?.marketCap !== null &&
                liveData?.marketCap !== undefined && (
                  <DataRow
                    label="Mkt Cap:"
                    value={formatNumberWithAbbreviations(liveData.marketCap)}
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "marketCapDisplayTriggerProfile",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    isInteractive={true}
                    title={`Market Cap: ${formatNumberWithAbbreviations(
                      liveData.marketCap
                    )}`}
                    labelClassName="text-sm font-medium text-muted-foreground"
                    valueClassName="text-sm font-semibold text-foreground"
                    // SELECTION PROPS
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedDataItems.some(
                      (item) => item.id === `${id}-marketcap`
                    )}
                    onSelect={() =>
                      onToggleItemSelection({
                        id: `${id}-marketcap`,
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Market Cap",
                        value: liveData.marketCap,
                        isMonetary: true,
                        currency: staticData?.currency,
                      })
                    }
                  />
                )}
            </div>
            <div className="flex flex-wrap gap-0.5 justify-end mt-0.5">
              {staticData?.is_etf && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0.5 text-[10px] font-medium leading-tight">
                  ETF
                </Badge>
              )}
              {staticData?.is_adr && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0.5 text-[10px] font-medium leading-tight">
                  ADR
                </Badge>
              )}
              {staticData?.is_fund && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0.5 text-[10px] font-medium leading-tight">
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
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
            <div className="space-y-1.5 pt-1.5">
              {staticData?.ceo && (
                <DataRow
                  label="CEO"
                  value={staticData.ceo}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "profile",
                      originatingElement: "ceoValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`CEO: ${staticData.ceo}`}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  originatingElement="ceo-profile-item-back"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-ceo`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-ceo`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "CEO",
                      value: staticData.ceo || "N/A",
                    })
                  }
                />
              )}
              {staticData?.formatted_ipo_date && (
                <DataRow
                  label="IPO Date"
                  value={staticData.formatted_ipo_date}
                  onClick={() =>
                    handleInteraction("REQUEST_NEW_CARD", {
                      targetCardType: "profile",
                      originatingElement: "ipoDateValueBack",
                    } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`IPO Date: ${staticData.formatted_ipo_date}`}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  originatingElement="ipo-date-profile-item-back"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-ipo`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-ipo`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "IPO Date",
                      value: staticData.formatted_ipo_date || "N/A",
                    })
                  }
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
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  originatingElement="exchange-profile-item-back"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-exchange`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-exchange`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "Exchange",
                      value: staticData.exchange_full_name || "N/A",
                    })
                  }
                />
              )}
              {staticData?.isin && (
                <DataRow
                  label="ISIN"
                  value={staticData.isin}
                  title={`ISIN: ${staticData.isin}`}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  originatingElement="isin-profile-item-back"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-isin`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-isin`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "ISIN",
                      value: staticData.isin || "N/A",
                    })
                  }
                />
              )}
              {staticData?.last_dividend !== null &&
                staticData?.last_dividend !== undefined && (
                  <DataRow
                    label="Last Div."
                    value={staticData.last_dividend}
                    currency={staticData.currency}
                    isMonetary={true}
                    precision={2}
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "dividendshistory",
                        originatingElement: "lastDividendDisplayTriggerBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Last Dividend: ${staticData.last_dividend.toFixed(
                      2
                    )} ${staticData.currency || ""}`}
                    labelClassName="text-xs font-medium text-muted-foreground"
                    valueClassName="text-xs font-semibold text-foreground"
                    originatingElement="last-dividend-profile-item-back"
                    // SELECTION PROPS
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedDataItems.some(
                      (item) => item.id === `${id}-lastdiv`
                    )}
                    onSelect={() =>
                      onToggleItemSelection({
                        id: `${id}-lastdiv`,
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Last Dividend",
                        value: staticData.last_dividend,
                        isMonetary: true,
                        currency: staticData.currency,
                      })
                    }
                  />
                )}
              {staticData?.beta !== null && staticData?.beta !== undefined && (
                <DataRow
                  label="1Y Beta"
                  value={staticData.beta}
                  precision={2}
                  onClick={() =>
                    handleInteraction("TRIGGER_CARD_ACTION", {
                      actionName: "viewVolatilityAnalysis",
                      actionData: { beta: staticData.beta },
                    } as Omit<TriggerCardActionInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                  }
                  title={`1 Year Beta: ${staticData.beta.toFixed(2)}`}
                  labelClassName="text-xs font-medium text-muted-foreground"
                  valueClassName="text-xs font-semibold text-foreground"
                  originatingElement="beta-profile-item-back"
                  // SELECTION PROPS
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDataItems.some(
                    (item) => item.id === `${id}-beta`
                  )}
                  onSelect={() =>
                    onToggleItemSelection({
                      id: `${id}-beta`,
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: "1Y Beta",
                      value: staticData.beta,
                    })
                  }
                />
              )}
              {staticData?.average_volume !== null &&
                staticData?.average_volume !== undefined && (
                  <DataRow
                    label="Avg. Vol."
                    value={formatNumberWithAbbreviations(
                      staticData.average_volume
                    )}
                    isMonetary={false}
                    onClick={() =>
                      handleInteraction("REQUEST_NEW_CARD", {
                        targetCardType: "price",
                        originatingElement: "avgVolumeDisplayTriggerBack",
                      } as Omit<RequestNewCardInteraction, "intent" | "sourceCardId" | "sourceCardSymbol" | "sourceCardType">)
                    }
                    title={`Average Volume: ${formatNumberWithAbbreviations(
                      staticData.average_volume
                    )}`}
                    labelClassName="text-xs font-medium text-muted-foreground"
                    valueClassName="text-xs font-semibold text-foreground"
                    originatingElement="avg-volume-profile-item-back"
                    // SELECTION PROPS
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedDataItems.some(
                      (item) => item.id === `${id}-avgvol`
                    )}
                    onSelect={() =>
                      onToggleItemSelection({
                        id: `${id}-avgvol`,
                        sourceCardId: id,
                        sourceCardSymbol: symbol,
                        label: "Avg. Volume",
                        value: staticData.average_volume,
                      })
                    }
                  />
                )}
            </div>
          </ShadCardContent>
        </div>
      );
    }
  }
);

ProfileCardContent.displayName = "ProfileCardContent";
