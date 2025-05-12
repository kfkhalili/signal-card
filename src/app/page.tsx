// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import "@/components/game/cards/rehydrators";
import useLocalStorage from "@/hooks/use-local-storage";
import { format, parseISO } from "date-fns";

import type {
  DisplayableCard,
  DisplayableLivePriceCard,
  ConcreteCardData,
} from "@/components/game/types";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardLiveData,
  ProfileCardStaticData,
} from "@/components/game/cards/profile-card/profile-card.types";

import {
  useStockData,
  type CombinedQuoteData,
  type MarketStatusDisplayHook,
  type ProfileDBRow,
} from "@/hooks/useStockData";

import ActiveCardsSection from "@/components/game/ActiveCardsSection";
import { useToast } from "@/hooks/use-toast";

import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import {
  createPriceCardFaceDataFromQuote,
  createPriceCardBackDataFromQuote,
} from "@/components/game/cards/price-card/priceCardUtils";
import { createProfileCardLiveDataFromQuote } from "@/components/game/cards/profile-card/profileCardUtils";
import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const SYMBOLS_TO_SUBSCRIBE_LIST: string[] = [
  "AAPL",
  "MSFT",
  "GOOG",
  "TSLA",
  "NVDA",
  "AMD",
  "BTC",
];

export type PageMarketStatusDisplay = MarketStatusDisplayHook;

interface StockDataHandlerProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: CombinedQuoteData,
    source: "fetch" | "realtime"
  ) => void;
  onStaticProfileUpdate: (updatedProfile: ProfileDBRow) => void;
  onMarketStatusChange?: (
    symbol: string,
    status: MarketStatusDisplayHook,
    message: string | null,
    timestamp: number | null
  ) => void;
}

const StockDataHandler: React.FC<StockDataHandlerProps> = ({
  symbol,
  onQuoteReceived,
  onStaticProfileUpdate,
  onMarketStatusChange,
}) => {
  const { marketStatus, marketStatusMessage, lastApiTimestamp } = useStockData({
    symbol: symbol,
    onQuoteReceived: onQuoteReceived,
    onStaticProfileUpdate: onStaticProfileUpdate,
  });

  useEffect(() => {
    if (onMarketStatusChange) {
      onMarketStatusChange(
        symbol,
        marketStatus,
        marketStatusMessage,
        lastApiTimestamp
      );
    }
  }, [
    symbol,
    marketStatus,
    marketStatusMessage,
    lastApiTimestamp,
    onMarketStatusChange,
  ]);

  return null;
};

export default function FinSignalGamePage() {
  const { toast } = useToast();
  const [marketStatuses, setMarketStatuses] = useState<
    Record<
      string,
      {
        status: MarketStatusDisplayHook;
        message: string | null;
        timestamp: number | null;
      }
    >
  >({});

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >("finSignal-activeCards-v7", INITIAL_ACTIVE_CARDS);

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() =>
    Array.isArray(initialCardsFromStorage)
      ? (initialCardsFromStorage
          .map(rehydrateCardFromStorage)
          .filter(Boolean) as DisplayableCard[])
      : INITIAL_ACTIVE_CARDS
  );

  // --- START REFACTORED HELPER ---
  const updateOrAddCard = useCallback(
    <SpecificConcreteCardData extends ConcreteCardData, NewExternalDataType>(
      prevCards: DisplayableCard[],
      symbol: string,
      cardType: SpecificConcreteCardData["type"],
      newExternalData: NewExternalDataType,
      // This function takes the existing *ConcreteCardData* (or undefined if new)
      // and the new external data, returning the updated *ConcreteCardData*.
      updateConcreteLogic: (
        existingConcreteData: SpecificConcreteCardData | undefined,
        externalData: NewExternalDataType,
        // Pass full existing card for context if needed (e.g., for companyName, logoUrl fallbacks)
        existingDisplayableCard?: DisplayableCard
      ) => SpecificConcreteCardData,
      // This function creates a new *DisplayableCard* if one needs to be added.
      // Typically used when a Price card is created for the first time.
      newDisplayableCardCreator?: (
        concreteData: SpecificConcreteCardData
      ) => DisplayableCard
    ): {
      updatedCards: DisplayableCard[];
      cardChangedOrAdded: boolean;
      finalCard?: DisplayableCard; // The card that was updated or added
    } => {
      let cardChangedOrAdded = false;
      const newCardsArray = [...prevCards]; // Work on a mutable copy
      const existingCardIndex = newCardsArray.findIndex(
        (c) => c.symbol === symbol && c.type === cardType
      );
      const existingDisplayableCard =
        existingCardIndex !== -1 ? newCardsArray[existingCardIndex] : undefined;

      // Extract the ConcreteCardData part if the card exists
      const existingConcreteCardData = existingDisplayableCard as
        | SpecificConcreteCardData
        | undefined;

      const updatedConcreteCardData = updateConcreteLogic(
        existingConcreteCardData,
        newExternalData,
        existingDisplayableCard
      );

      // Calculate rarity based on the new concrete data and existing (or default) UI state
      const { rarity: newRarity, reason: newRarityReason } =
        calculateDynamicCardRarity({
          ...updatedConcreteCardData, // This is the ConcreteCardData
          isFlipped: existingDisplayableCard?.isFlipped || false, // Include isFlipped for context
        } as DisplayableCard); // Cast for rarity calculator

      let finalDisplayableCard: DisplayableCard;

      if (existingDisplayableCard) {
        // Check for actual changes in the core data or rarity
        const oldDataStringForCompare = JSON.stringify(
          existingConcreteCardData
        );
        const newDataStringForCompare = JSON.stringify(updatedConcreteCardData);

        if (
          oldDataStringForCompare !== newDataStringForCompare ||
          existingDisplayableCard.currentRarity !== newRarity ||
          existingDisplayableCard.rarityReason !== newRarityReason
        ) {
          cardChangedOrAdded = true;
          finalDisplayableCard = {
            ...existingDisplayableCard, // Preserve existing UI state like id, isFlipped
            ...updatedConcreteCardData, // Merge updated data
            currentRarity: newRarity,
            rarityReason: newRarityReason,
          };
          newCardsArray[existingCardIndex] = finalDisplayableCard;
        } else {
          finalDisplayableCard = existingDisplayableCard; // No change
        }
      } else if (newDisplayableCardCreator) {
        // New card needs to be created (typically for Price cards on initial fetch)
        const newBaseDisplayable = newDisplayableCardCreator(
          updatedConcreteCardData
        );
        finalDisplayableCard = {
          ...newBaseDisplayable,
          currentRarity: newRarity, // Apply calculated rarity
          rarityReason: newRarityReason,
        };
        newCardsArray.unshift(finalDisplayableCard); // Add to the beginning
        cardChangedOrAdded = true;
      } else {
        // Card doesn't exist and no creator function was provided (e.g., for profile live updates)
        // This means no change to the array if the card wasn't found.
        return { updatedCards: prevCards, cardChangedOrAdded: false };
      }

      return {
        updatedCards: newCardsArray,
        cardChangedOrAdded,
        finalCard: finalDisplayableCard,
      };
    },
    [calculateDynamicCardRarity] // calculateDynamicCardRarity is a stable import
  );
  // --- END REFACTORED HELPER ---

  const handleMarketStatusChange = useCallback(
    (
      symbol: string,
      status: MarketStatusDisplayHook,
      message: string | null,
      timestamp: number | null
    ) => {
      setMarketStatuses((prev) => ({
        ...prev,
        [symbol]: { status, message, timestamp },
      }));
    },
    []
  );

  const transformProfileDBRowToStaticData = useCallback(
    (dbData: ProfileDBRow): ProfileCardStaticData => {
      return {
        db_id: dbData.id,
        sector: dbData.sector,
        industry: dbData.industry,
        country: dbData.country,
        exchange_full_name: dbData.exchange_full_name,
        website: dbData.website,
        description: dbData.description,
        ceo: dbData.ceo,
        full_address: [
          dbData.address,
          dbData.city,
          dbData.state,
          dbData.zip,
          dbData.country,
        ]
          .filter(Boolean)
          .join(", "),
        phone: dbData.phone,
        formatted_full_time_employees:
          dbData.full_time_employees?.toLocaleString(),
        profile_last_updated: dbData.modified_at
          ? format(parseISO(dbData.modified_at), "MMM d, yy")
          : undefined,
        currency: dbData.currency,
        formatted_ipo_date: dbData.ipo_date
          ? format(parseISO(dbData.ipo_date), "MMMM d, yyyy")
          : undefined,
        is_etf: dbData.is_etf,
        is_adr: dbData.is_adr,
        is_fund: dbData.is_fund,
      };
    },
    []
  );

  const handleStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      setActiveCards((prevActiveCards) => {
        const result = updateOrAddCard<ProfileCardData, ProfileDBRow>(
          prevActiveCards,
          updatedProfileDBRow.symbol,
          "profile",
          updatedProfileDBRow,
          (existingConcrete, newProfileDBData, existingDisplayable) => {
            const typedExistingConcrete = existingConcrete as
              | ProfileCardData
              | undefined; // Should exist for profile static update
            if (!typedExistingConcrete) {
              // This should ideally not happen if a profile card is expected to be there for an update
              console.warn(
                `Profile card for ${newProfileDBData.symbol} not found for static update.`
              );
              // Create a new one if absolutely necessary, though profile cards are added via useCardActions
              return {
                id: `${newProfileDBData.symbol}-profile-${Date.now()}`,
                type: "profile",
                symbol: newProfileDBData.symbol,
                companyName: newProfileDBData.company_name,
                logoUrl: newProfileDBData.image,
                createdAt: Date.now(),
                staticData: transformProfileDBRowToStaticData(newProfileDBData),
                liveData: {}, // Initial empty live data
                backData: {
                  description:
                    newProfileDBData.description ||
                    `Profile for ${
                      newProfileDBData.company_name || newProfileDBData.symbol
                    }.`,
                },
              } as ProfileCardData;
            }

            const newStaticData =
              transformProfileDBRowToStaticData(newProfileDBData);
            return {
              ...typedExistingConcrete,
              companyName: newProfileDBData.company_name, // Update top-level common fields
              logoUrl: newProfileDBData.image,
              staticData: newStaticData,
              backData: {
                // Ensure backData is also updated
                ...typedExistingConcrete.backData,
                description:
                  newProfileDBData.description ||
                  existingDisplayable?.backData.description || // Fallback to existing description
                  `Profile for ${
                    newProfileDBData.company_name || newProfileDBData.symbol
                  }.`,
              },
            };
          }
          // No newDisplayableCardCreator for static profile updates, as they only modify existing cards.
        );
        // Could add a toast for profile static data updates if desired.
        return result.cardChangedOrAdded
          ? result.updatedCards
          : prevActiveCards;
      });
    },
    [setActiveCards, updateOrAddCard, transformProfileDBRowToStaticData, toast]
  );

  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  const processQuoteData = useCallback(
    (quoteData: CombinedQuoteData, source: "fetch" | "realtime") => {
      const apiTimestampMillis = quoteData.api_timestamp * 1000;
      if (isNaN(apiTimestampMillis)) {
        console.warn(
          `processQuoteData (${quoteData.symbol}): Invalid API timestamp received.`
        );
        return;
      }

      setActiveCards((prevActiveCards) => {
        let cardsOverallNeedUpdate = false;
        let currentCardsState = [...prevActiveCards];

        // --- Update Price Card ---
        const priceResult = updateOrAddCard<PriceCardData, CombinedQuoteData>(
          currentCardsState,
          quoteData.symbol,
          "price",
          quoteData,
          (existingConcrete, newQuoteData, existingDisplayable) => {
            const typedExistingConcrete = existingConcrete as
              | PriceCardData
              | undefined;

            // Stale data check
            if (
              source === "realtime" &&
              typedExistingConcrete?.faceData.timestamp &&
              apiTimestampMillis < typedExistingConcrete.faceData.timestamp
            ) {
              return typedExistingConcrete; // Return existing data if incoming is stale
            }

            const newFaceData = createPriceCardFaceDataFromQuote(
              newQuoteData,
              apiTimestampMillis
            );
            const newBackSpecificData =
              createPriceCardBackDataFromQuote(newQuoteData);

            return {
              id:
                typedExistingConcrete?.id ||
                `${newQuoteData.symbol}-price-${Date.now()}`,
              type: "price",
              symbol: newQuoteData.symbol,
              createdAt: typedExistingConcrete?.createdAt || Date.now(),
              companyName:
                newQuoteData.companyName ??
                typedExistingConcrete?.companyName ??
                existingDisplayable?.companyName,
              logoUrl:
                newQuoteData.logoUrl ??
                typedExistingConcrete?.logoUrl ??
                existingDisplayable?.logoUrl,
              faceData: newFaceData,
              backData: {
                description:
                  typedExistingConcrete?.backData.description ||
                  existingDisplayable?.backData.description ||
                  `Price data for ${newQuoteData.symbol}`,
                ...newBackSpecificData,
              },
            };
          },
          (concretePriceData) => {
            // newDisplayableCardCreator
            // This reuses the existing createDisplayablePriceCard but adapts its output
            // We need the full ConcreteCardData (PriceCardData in this case)
            // calculateDynamicCardRarity will be called by updateOrAddCard later
            return {
              ...(concretePriceData as PriceCardData), // This IS PriceCardData
              isFlipped: false, // Default state
              // Rarity to be added by updateOrAddCard
            } as DisplayableLivePriceCard;
          }
        );

        currentCardsState = priceResult.updatedCards;
        if (priceResult.cardChangedOrAdded) {
          cardsOverallNeedUpdate = true;
          const finalPriceCard = priceResult.finalCard as
            | DisplayableLivePriceCard
            | undefined;
          if (finalPriceCard) {
            const isNew = !prevActiveCards.find(
              (c) => c.id === finalPriceCard.id
            );
            if (
              isNew &&
              source === "fetch" &&
              finalPriceCard.faceData.price != null
            ) {
              setTimeout(
                () =>
                  toast({
                    title: `Card Loaded: ${finalPriceCard.symbol}`,
                    description: `$${finalPriceCard.faceData.price?.toFixed(
                      2
                    )}`,
                  }),
                0
              );
            } else if (
              !isNew &&
              priceResult.cardChangedOrAdded &&
              source === "realtime" &&
              finalPriceCard.faceData.price != null
            ) {
              setTimeout(
                () =>
                  toast({
                    title: `Live Update: ${finalPriceCard.symbol}`,
                    description: `$${finalPriceCard.faceData.price?.toFixed(
                      2
                    )} (${
                      finalPriceCard.faceData.changePercentage?.toFixed(2) ??
                      "N/A"
                    }) ${
                      finalPriceCard.currentRarity &&
                      finalPriceCard.currentRarity !== "Common"
                        ? `Rarity: ${finalPriceCard.currentRarity}`
                        : ""
                    }`,
                  }),
                0
              );
            }
          }
        }

        // --- Update Profile Card's LiveData (if profile card exists) ---
        const existingProfileCardIndex = currentCardsState.findIndex(
          (c) => c.symbol === quoteData.symbol && c.type === "profile"
        );
        if (existingProfileCardIndex !== -1) {
          const newProfileLiveData = createProfileCardLiveDataFromQuote(
            quoteData,
            apiTimestampMillis
          );
          const profileResult = updateOrAddCard<
            ProfileCardData,
            ProfileCardLiveData
          >(
            currentCardsState,
            quoteData.symbol,
            "profile",
            newProfileLiveData,
            (existingConcrete, newLiveData) => {
              const typedExistingConcrete = existingConcrete as ProfileCardData; // Assumed to exist
              if (
                source === "realtime" &&
                typedExistingConcrete.liveData.timestamp &&
                apiTimestampMillis < typedExistingConcrete.liveData.timestamp
              ) {
                return typedExistingConcrete; // Stale data
              }
              return {
                ...typedExistingConcrete,
                liveData: newLiveData,
              };
            }
            // No new card creator for profile live updates; profile card must exist
          );
          currentCardsState = profileResult.updatedCards;
          if (profileResult.cardChangedOrAdded) cardsOverallNeedUpdate = true;
          // Optional: Add toast for profile live data update if significant
        }
        return cardsOverallNeedUpdate ? currentCardsState : prevActiveCards;
      });
    },
    [toast, setActiveCards, updateOrAddCard] // updateOrAddCard is now a dependency
  );

  const stockDataHandlers = SYMBOLS_TO_SUBSCRIBE_LIST.map((symbol) => (
    <StockDataHandler
      key={symbol}
      symbol={symbol}
      onQuoteReceived={processQuoteData}
      onStaticProfileUpdate={handleStaticProfileUpdate}
      onMarketStatusChange={handleMarketStatusChange}
    />
  ));

  const renderMarketStatuses = () => {
    const entries = Object.entries(marketStatuses);
    if (entries.length === 0) {
      return (
        <p>
          Market Status: Initializing for {SYMBOLS_TO_SUBSCRIBE_LIST.join(", ")}
          ...
        </p>
      );
    }
    return entries.map(([symbol, data]) => (
      <div key={symbol} className="text-xs mb-1">
        <strong>{symbol}:</strong> {data.status}
        {data.message && (
          <span className="italic text-muted-foreground">
            {" "}
            ({String(data.message)})
          </span>
        )}
        {data.timestamp &&
          !isNaN(new Date(data.timestamp * 1000).getTime()) && (
            <span className="block text-muted-foreground/80">
              Last Data: {format(new Date(data.timestamp * 1000), "PP p")}
            </span>
          )}
      </div>
    ));
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      {stockDataHandlers}
      <div className="text-center p-2 bg-card border text-card-foreground rounded-md text-sm shadow max-h-32 overflow-y-auto">
        {renderMarketStatuses()}
      </div>
      <ActiveCardsSection
        activeCards={activeCards}
        setActiveCards={setActiveCards}
      />
    </div>
  );
}
