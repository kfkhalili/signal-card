// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import useLocalStorage from "@/hooks/use-local-storage";
import { format, parseISO } from "date-fns";

import type {
  DisplayableCard,
  DisplayableProfileCard,
} from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData,
  PriceCardSnapshotData,
} from "@/components/game/cards/price-card/price-card.types";
import type { DisplayableCardState } from "@/components/game/types";
import type {
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

import "@/components/game/cards/rehydrators";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import {
  createPriceCardFaceDataFromQuote,
  createPriceCardBackDataFromQuote,
  createDisplayablePriceCard,
} from "@/components/game/cards/price-card/priceCardUtils";

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
  >("finSignal-activeCards-v6", INITIAL_ACTIVE_CARDS);

  // Declare activeCards and setActiveCards state first
  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() =>
    Array.isArray(initialCardsFromStorage)
      ? (initialCardsFromStorage
          .map(rehydrateCardFromStorage)
          .filter(Boolean) as DisplayableCard[])
      : INITIAL_ACTIVE_CARDS
  );

  // Now define useCallback hooks that might use setActiveCards or activeCards

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
    [] // No dependency on setActiveCards or activeCards
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
    [] // No dependency on setActiveCards or activeCards
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
                card as DisplayableProfileCard; // Type assertion after guard

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

              if (profileDataPointsChanged) {
                cardUpdatedOverall = true;
                const updatedCard: DisplayableProfileCard = {
                  ...existingDisplayableProfileCard,
                  companyName: updatedProfileDBRow.company_name,
                  logoUrl: updatedProfileDBRow.image,
                  staticData: newStaticData,
                  backData: {
                    ...existingDisplayableProfileCard.backData,
                    description: newBackDataDescription,
                  },
                };
                return updatedCard;
              }
            }
            return card;
          }
        );

        if (cardUpdatedOverall) {
          return newCards;
        }
        return prevActiveCards;
      });
    },
    [transformProfileDBRowToStaticData, setActiveCards] // Now setActiveCards is declared before this
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

      const newPriceCardFaceData: PriceCardFaceData =
        createPriceCardFaceDataFromQuote(quoteData, apiTimestampMillis);
      const newPriceCardBackData: PriceCardSpecificBackData =
        createPriceCardBackDataFromQuote(quoteData);

      const newProfileCardLiveData: ProfileCardLiveData = {
        price: quoteData.current_price,
        dayChange: quoteData.day_change ?? null,
        changePercentage: quoteData.change_percentage ?? null,
        dayHigh: quoteData.day_high ?? null,
        dayLow: quoteData.day_low ?? null,
        timestamp: apiTimestampMillis,
        volume: quoteData.volume ?? null,
      };

      setActiveCards((prevActiveCards) => {
        let cardsNeedUpdate = false;
        const updatedCards = prevActiveCards.map(
          (card: DisplayableCard): DisplayableCard => {
            if (card.type === "price" && card.symbol === quoteData.symbol) {
              const existingPriceCard = card as PriceCardData &
                DisplayableCardState;
              if (
                source === "realtime" &&
                existingPriceCard.faceData.timestamp &&
                apiTimestampMillis < existingPriceCard.faceData.timestamp
              )
                return card;

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

              if (priceCardDataChanged) {
                cardsNeedUpdate = true;
                const updatedPriceCard: PriceCardData & DisplayableCardState = {
                  ...existingPriceCard,
                  companyName:
                    quoteData.companyName ?? existingPriceCard.companyName,
                  logoUrl: quoteData.logoUrl ?? existingPriceCard.logoUrl,
                  faceData: newPriceCardFaceData,
                  backData: {
                    description: existingPriceCard.backData.description,
                    ...newPriceCardBackData,
                  },
                };
                return updatedPriceCard;
              }
            }
            if (card.type === "profile" && card.symbol === quoteData.symbol) {
              const existingDisplayableProfileCard =
                card as DisplayableProfileCard;
              if (
                source === "realtime" &&
                existingDisplayableProfileCard.liveData.timestamp &&
                apiTimestampMillis <
                  existingDisplayableProfileCard.liveData.timestamp
              )
                return card;
              if (
                JSON.stringify(existingDisplayableProfileCard.liveData) !==
                JSON.stringify(newProfileCardLiveData)
              ) {
                cardsNeedUpdate = true;
                const updatedProfileCard: DisplayableProfileCard = {
                  ...existingDisplayableProfileCard,
                  liveData: newProfileCardLiveData,
                };
                return updatedProfileCard;
              }
            }
            return card;
          }
        );

        const existingPriceCardIndex = updatedCards.findIndex(
          (c) => c.type === "price" && c.symbol === quoteData.symbol
        );
        if (existingPriceCardIndex === -1) {
          cardsNeedUpdate = true;
          const newPriceCard = createDisplayablePriceCard(
            quoteData,
            apiTimestampMillis
          );
          updatedCards.unshift(newPriceCard);
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
          const priceCard = updatedCards[
            existingPriceCardIndex
          ] as PriceCardData & DisplayableCardState;
          if (
            priceCard.faceData.price !== quoteData.current_price ||
            priceCard.faceData.changePercentage !== quoteData.change_percentage
          ) {
            setTimeout(
              () =>
                toast({
                  title: `Live Update: ${quoteData.symbol}`,
                  description: `$${quoteData.current_price.toFixed(2)} (${
                    newPriceCardFaceData.changePercentage?.toFixed(2) ?? "N/A"
                  }%)`,
                }),
              0
            );
          }
        }

        if (cardsNeedUpdate) {
          return updatedCards;
        }
        return prevActiveCards;
      });
    },
    [toast, setActiveCards] // Now setActiveCards is declared before this
  );

  const handleTakeSnapshot = useCallback(
    (sourceCardId?: string) => {
      const sourceCardIndex = activeCards.findIndex(
        (c) => c.id === sourceCardId
      );
      const cardToSnapshot =
        sourceCardIndex !== -1 ? activeCards[sourceCardIndex] : undefined;

      if (cardToSnapshot && cardToSnapshot.type === "price") {
        const livePriceCard = cardToSnapshot as PriceCardData &
          DisplayableCardState;
        const currentTime = Date.now();
        const newSnapshot: PriceCardSnapshotData & DisplayableCardState = {
          id: `snap-${livePriceCard.id}-${currentTime}`,
          type: "price_snapshot",
          symbol: livePriceCard.symbol,
          createdAt: currentTime,
          companyName: livePriceCard.companyName,
          logoUrl: livePriceCard.logoUrl,
          capturedPrice: livePriceCard.faceData.price!,
          snapshotTime: livePriceCard.faceData.timestamp!,
          yearHighAtCapture: livePriceCard.faceData.yearHigh,
          yearLowAtCapture: livePriceCard.faceData.yearLow,
          backData: {
            description: `Snapshot of ${
              livePriceCard.symbol
            } price: $${livePriceCard.faceData.price?.toFixed(
              2
            )}. Captured on ${new Date(
              livePriceCard.faceData.timestamp!
            ).toLocaleString()}`,
            discoveredReason: `Snapshot from live card event.`,
          },
          isFlipped: false,
        };

        setActiveCards((prev) => {
          const cards = [...prev];
          if (sourceCardIndex !== -1) {
            cards.splice(
              sourceCardIndex + 1,
              0,
              newSnapshot as DisplayableCard
            );
          } else {
            cards.unshift(newSnapshot as DisplayableCard);
          }
          return cards;
        });
        toast({
          title: "Snapshot Created!",
          description: `Snapshot for ${livePriceCard.symbol} taken.`,
        });
      } else if (cardToSnapshot && cardToSnapshot.type === "price_snapshot") {
        toast({
          title: "Info",
          description: "This is already a snapshot.",
          variant: "default",
        });
      } else if (cardToSnapshot) {
        toast({
          title: "Info",
          description: `Snapshots can only be taken of Price Cards. This is a ${cardToSnapshot.type} card.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Snapshot Error",
          description:
            "Card not found to take a snapshot from, or no source ID provided.",
          variant: "destructive",
        });
      }
    },
    [activeCards, toast, setActiveCards] // Now setActiveCards is declared before this
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
        onTakeSnapshot={handleTakeSnapshot}
      />
    </div>
  );
}
