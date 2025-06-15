// src/components/game/cards/exchange-variants-card/ExchangeVariantsCardContent.tsx
import React, { useMemo } from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type {
  ExchangeVariantsCardData,
  ExchangeVariant,
} from "./exchange-variants-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { getFlagEmoji } from "@/lib/utils";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import {
  CheckboxCheckedIcon,
  CheckboxUncheckedIcon,
} from "@/components/ui/CheckboxIcons";
import dynamic from "next/dynamic"; // Import dynamic from next/dynamic
import type { MapMarker } from "@/components/ui/WorldMap"; // Import MapMarker type

// Dynamically import WorldMap
const DynamicWorldMap = dynamic(
  () => import("@/components/ui/WorldMap").then((mod) => mod.WorldMap),
  { ssr: false } // Disable server-side rendering for this component
);

interface ExchangeVariantsCardContentProps {
  cardData: ExchangeVariantsCardData;
  isBackFace: boolean;
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

const VariantRow: React.FC<{
  variant: ExchangeVariant;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  isBase: boolean;
}> = ({ variant, isSelectionMode, isSelected, onSelect, isBase }) => (
  <div
    className={cn(
      "flex justify-between items-center py-1.5 px-2 border-b last:border-b-0 transition-colors",
      isSelectionMode && !isBase && "hover:bg-primary/10 cursor-pointer",
      isSelected && "bg-primary/20",
      isBase && "bg-muted/50"
    )}
    onClick={isSelectionMode && !isBase ? onSelect : undefined}
    role={isSelectionMode && !isBase ? "button" : undefined}
    tabIndex={isSelectionMode && !isBase ? 0 : undefined}
    aria-label={`Select ${variant.variantSymbol}`}>
    <div className="flex items-center min-w-0">
      {isSelectionMode && (
        <div className="mr-2 shrink-0">
          {isBase ? (
            <div className="w-4 h-4" />
          ) : isSelected ? (
            <CheckboxCheckedIcon className="text-primary" />
          ) : (
            <CheckboxUncheckedIcon className="text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold text-foreground">
          {variant.variantSymbol}
          {isBase && (
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              (Base)
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {variant.exchangeShortName}
        </span>
      </div>
    </div>
    <div className="flex flex-col items-end text-right">
      <span
        className="text-sm font-semibold text-foreground flex items-center"
        title={variant.countryName ?? undefined}>
        <span className="mr-1.5">{getFlagEmoji(variant.countryCode)}</span>
        {variant.countryName}
      </span>
      <span className="text-xs text-muted-foreground">
        Avg Vol: {formatNumberWithAbbreviations(variant.averageVolume, 2)}
      </span>
    </div>
  </div>
);

export const ExchangeVariantsCardContent: React.FC<ExchangeVariantsCardContentProps> =
  React.memo(
    ({
      cardData,
      isBackFace,
      isSelectionMode,
      selectedDataItems,
      onToggleItemSelection,
    }) => {
      const { staticData, liveData, symbol, id } = cardData;

      const allVariantsToDisplay = useMemo((): ExchangeVariant[] => {
        const { baseExchangeInfo } = staticData;
        const baseVariant: ExchangeVariant = {
          variantSymbol: symbol,
          exchangeShortName: baseExchangeInfo.exchangeShortName,
          countryCode: baseExchangeInfo.countryCode,
          countryName: baseExchangeInfo.countryName,
          averageVolume: baseExchangeInfo.averageVolume,
        };
        return [baseVariant, ...liveData.variants];
      }, [symbol, staticData, liveData.variants]);

      const mapMarkers = useMemo((): MapMarker[] => {
        const markers: MapMarker[] = [];
        const seenExchanges = new Set<string>();

        allVariantsToDisplay.forEach((variant) => {
          if (
            variant.exchangeShortName &&
            !seenExchanges.has(variant.exchangeShortName)
          ) {
            markers.push({
              countryCode: variant.countryCode ?? "",
              label: variant.exchangeShortName, // Use the exchange code as the label
            });
            seenExchanges.add(variant.exchangeShortName);
          }
        });
        return markers;
      }, [allVariantsToDisplay]);

      const isSelected = (itemId: string) =>
        selectedDataItems.some((item) => item.id === itemId);

      const onSelect = (variant: ExchangeVariant) => {
        if (variant.variantSymbol === symbol || !variant.averageVolume) return;
        const fullItem: SelectedDataItem = {
          id: `${id}-${variant.variantSymbol}`,
          sourceCardId: id,
          sourceCardSymbol: symbol,
          label: `${variant.variantSymbol} Avg Vol`,
          value: variant.averageVolume,
        };
        onToggleItemSelection(fullItem);
      };

      if (isBackFace) {
        return (
          <div
            data-testid={`exchangevariants-card-back-${symbol}`}
            className="pointer-events-auto flex flex-col h-full">
            <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
              <div className="space-y-0">
                {allVariantsToDisplay.map((variant, index) => (
                  <VariantRow
                    key={variant.variantSymbol}
                    variant={variant}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected(`${id}-${variant.variantSymbol}`)}
                    onSelect={() => onSelect(variant)}
                    isBase={index === 0}
                  />
                ))}
              </div>
            </ShadCardContent>
          </div>
        );
      }

      return (
        <div
          data-testid={`exchangevariants-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <div className="relative flex-grow w-full">
            <DynamicWorldMap
              markers={mapMarkers}
              className="absolute inset-0"
            />
          </div>
        </div>
      );
    }
  );
ExchangeVariantsCardContent.displayName = "ExchangeVariantsCardContent";
