// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import "@/components/game/cards/rehydrators";
import useLocalStorage from "@/hooks/use-local-storage";
import { format, parseISO } from "date-fns";

import type {
  DisplayableCard,
  DisplayableProfileCard,
  DisplayableCardState,
  ConcreteCardData,
  DisplayableLivePriceCard, // Added for clarity
} from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData,
} from "@/components/game/cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardLiveData,
  ProfileCardStaticData,
  ProfileCardBackDataType,
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
  createDisplayablePriceCard,
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
        let cardUpdatedOverall = false;
        const newCards = prevActiveCards.map(
          (card: DisplayableCard): DisplayableCard => {
            if (
              card.type === "profile" &&
              card.symbol === updatedProfileDBRow.symbol
            ) {
              const existingDisplayableProfileCard =
                card as DisplayableProfileCard;
              const newStaticData =
                transformProfileDBRowToStaticData(updatedProfileDBRow);
              const newBackDataDescription =
                updatedProfileDBRow.description ||
                `Profile for ${
                  updatedProfileDBRow.company_name || updatedProfileDBRow.symbol
                }.`;

              let profileDataPointsChanged = false;
              if (
                JSON.stringify(existingDisplayableProfileCard.staticData) !==
                JSON.stringify(newStaticData)
              )
                profileDataPointsChanged = true;
              if (
                existingDisplayableProfileCard.companyName !==
                updatedProfileDBRow.company_name
              )
                profileDataPointsChanged = true;
              if (
                existingDisplayableProfileCard.logoUrl !==
                updatedProfileDBRow.image
              )
                profileDataPointsChanged = true;
              if (
                existingDisplayableProfileCard.backData.description !==
                newBackDataDescription
              )
                profileDataPointsChanged = true;

              // Construct the card with updated static data to pass for rarity calculation
              const tempCardForRarity: DisplayableProfileCard = {
                ...existingDisplayableProfileCard,
                companyName: updatedProfileDBRow.company_name,
                logoUrl: updatedProfileDBRow.image,
                staticData: newStaticData,
                backData: {
                  ...existingDisplayableProfileCard.backData,
                  description: newBackDataDescription,
                },
              };
              const { rarity, reason } =
                calculateDynamicCardRarity(tempCardForRarity);

              if (
                existingDisplayableProfileCard.currentRarity !== rarity ||
                existingDisplayableProfileCard.rarityReason !== reason
              ) {
                profileDataPointsChanged = true;
              }

              if (profileDataPointsChanged) {
                cardUpdatedOverall = true;
                return {
                  ...tempCardForRarity, // This already has the updated static data
                  currentRarity: rarity,
                  rarityReason: reason,
                };
              }
            }
            return card;
          }
        );

        return cardUpdatedOverall ? newCards : prevActiveCards;
      });
    },
    [transformProfileDBRowToStaticData, setActiveCards]
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

      const newPriceCardFaceData = createPriceCardFaceDataFromQuote(
        quoteData,
        apiTimestampMillis
      );
      const newPriceCardBackData = createPriceCardBackDataFromQuote(quoteData);
      const newProfileCardLiveData = createProfileCardLiveDataFromQuote(
        quoteData,
        apiTimestampMillis
      );

      setActiveCards((prevActiveCards) => {
        let cardsNeedUpdate = false;
        const updatedCards = prevActiveCards.map(
          (card: DisplayableCard): DisplayableCard => {
            let modifiedCard = card;

            if (card.type === "price" && card.symbol === quoteData.symbol) {
              const existingPriceCard = card as DisplayableLivePriceCard; // More specific type

              if (
                source === "realtime" &&
                existingPriceCard.faceData.timestamp &&
                apiTimestampMillis < existingPriceCard.faceData.timestamp
              ) {
                return card;
              }

              // Construct a temporary DisplayableLivePriceCard with all new data for rarity calculation
              const tempCardForRarity: DisplayableLivePriceCard = {
                // Core PriceCardData fields
                id: existingPriceCard.id,
                type: existingPriceCard.type,
                symbol: existingPriceCard.symbol,
                createdAt: existingPriceCard.createdAt,
                companyName:
                  quoteData.companyName ?? existingPriceCard.companyName,
                logoUrl: quoteData.logoUrl ?? existingPriceCard.logoUrl,
                faceData: newPriceCardFaceData,
                backData: {
                  description: existingPriceCard.backData.description,
                  ...newPriceCardBackData,
                },
                // DisplayableCardState fields from existing card
                isFlipped: existingPriceCard.isFlipped,
                // currentRarity and rarityReason will be overridden by calculation
                currentRarity: existingPriceCard.currentRarity,
                rarityReason: existingPriceCard.rarityReason,
              };
              const { rarity: newRarity, reason: newRarityReason } =
                calculateDynamicCardRarity(tempCardForRarity);

              let priceCardDataChanged = false;
              if (
                JSON.stringify(existingPriceCard.faceData) !==
                JSON.stringify(newPriceCardFaceData)
              )
                priceCardDataChanged = true;
              if (
                existingPriceCard.backData.marketCap !==
                newPriceCardBackData.marketCap
              )
                priceCardDataChanged = true;
              if (
                existingPriceCard.backData.sma50d !==
                newPriceCardBackData.sma50d
              )
                priceCardDataChanged = true;
              if (
                existingPriceCard.backData.sma200d !==
                newPriceCardBackData.sma200d
              )
                priceCardDataChanged = true;
              if (
                existingPriceCard.companyName !==
                (quoteData.companyName ?? existingPriceCard.companyName)
              )
                priceCardDataChanged = true;
              if (
                existingPriceCard.logoUrl !==
                (quoteData.logoUrl ?? existingPriceCard.logoUrl)
              )
                priceCardDataChanged = true;
              if (existingPriceCard.currentRarity !== newRarity)
                priceCardDataChanged = true;
              if (existingPriceCard.rarityReason !== newRarityReason)
                priceCardDataChanged = true;

              if (priceCardDataChanged) {
                cardsNeedUpdate = true;
                modifiedCard = {
                  ...existingPriceCard,
                  companyName:
                    quoteData.companyName ?? existingPriceCard.companyName,
                  logoUrl: quoteData.logoUrl ?? existingPriceCard.logoUrl,
                  faceData: newPriceCardFaceData,
                  backData: {
                    description: existingPriceCard.backData.description,
                    ...newPriceCardBackData,
                  },
                  currentRarity: newRarity,
                  rarityReason: newRarityReason,
                };
              }
              return modifiedCard;
            }

            if (card.type === "profile" && card.symbol === quoteData.symbol) {
              const existingProfileCard = card as DisplayableProfileCard;
              if (
                source === "realtime" &&
                existingProfileCard.liveData.timestamp &&
                apiTimestampMillis < existingProfileCard.liveData.timestamp
              ) {
                return card;
              }
              if (
                JSON.stringify(existingProfileCard.liveData) !==
                JSON.stringify(newProfileCardLiveData)
              ) {
                cardsNeedUpdate = true;
                // Construct a temporary DisplayableProfileCard for rarity calculation
                const tempProfileCardForRarity: DisplayableProfileCard = {
                  ...existingProfileCard, // Includes isFlipped and current rarity from DisplayableCardState
                  liveData: newProfileCardLiveData,
                };
                const { rarity, reason } = calculateDynamicCardRarity(
                  tempProfileCardForRarity
                );
                modifiedCard = {
                  ...tempProfileCardForRarity,
                  currentRarity: rarity,
                  rarityReason: reason,
                };
              }
              return modifiedCard;
            }
            return card;
          }
        );

        const existingPriceCardIndex = updatedCards.findIndex(
          (c) => c.type === "price" && c.symbol === quoteData.symbol
        );

        if (existingPriceCardIndex === -1) {
          cardsNeedUpdate = true;
          let newDisplayablePriceCard = createDisplayablePriceCard(
            quoteData,
            apiTimestampMillis
          );
          // newDisplayablePriceCard is already DisplayableLivePriceCard (PriceCardData & DisplayableCardState)
          // So it can be passed directly to calculateDynamicCardRarity
          const { rarity, reason } = calculateDynamicCardRarity(
            newDisplayablePriceCard
          );
          newDisplayablePriceCard = {
            ...newDisplayablePriceCard,
            currentRarity: rarity,
            rarityReason: reason,
          };

          updatedCards.unshift(newDisplayablePriceCard);
          if (quoteData.current_price != null && source === "fetch") {
            setTimeout(
              () =>
                toast({
                  title: `Card Loaded: ${quoteData.symbol}`,
                  description: `$${quoteData.current_price.toFixed(2)}`,
                }),
              0
            );
          }
        } else if (source === "realtime" && quoteData.current_price != null) {
          // Check if the card actually updated to show toast
          const originalCard = prevActiveCards.find(
            (c) => c.id === updatedCards[existingPriceCardIndex].id
          );
          const updatedCard = updatedCards[existingPriceCardIndex];
          if (JSON.stringify(originalCard) !== JSON.stringify(updatedCard)) {
            setTimeout(
              () =>
                toast({
                  title: `Live Update: ${updatedCard.symbol}`,
                  description: `$${(
                    updatedCard as DisplayableLivePriceCard
                  ).faceData.price?.toFixed(2)} (${
                    (
                      updatedCard as DisplayableLivePriceCard
                    ).faceData.changePercentage?.toFixed(2) ?? "N/A"
                  }) ${
                    updatedCard.currentRarity &&
                    updatedCard.currentRarity !== "Common"
                      ? `Rarity: ${updatedCard.currentRarity}`
                      : ""
                  }`,
                }),
              0
            );
          }
        }

        return cardsNeedUpdate ? updatedCards : prevActiveCards;
      });
    },
    [toast, setActiveCards]
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
