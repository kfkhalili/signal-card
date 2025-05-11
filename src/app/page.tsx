// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import useLocalStorage from "@/hooks/use-local-storage";
import { format, parseISO } from "date-fns";

import type {
  DisplayableCard,
  DisplayableCardState,
} from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData,
  PriceCardSnapshotSpecificBackData,
  PriceCardSnapshotData,
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

  const transformProfileDBRowToStaticData = (
    dbData: ProfileDBRow
  ): ProfileCardStaticData => {
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
        ? format(parseISO(dbData.modified_at), "MMM d, yyyy")
        : undefined,
      currency: dbData.currency,
      formatted_ipo_date: dbData.ipo_date
        ? format(parseISO(dbData.ipo_date), "MMMM d, yyyy")
        : undefined,
      is_etf: dbData.is_etf,
      is_adr: dbData.is_adr,
      is_fund: dbData.is_fund,
    };
  };

  const handleStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      setActiveCards((prevActiveCards) => {
        let cardUpdated = false;
        const newCards = prevActiveCards.map((card: DisplayableCard) => {
          if (
            card.type === "profile" &&
            card.symbol === updatedProfileDBRow.symbol
          ) {
            const existingProfileCard = card as ProfileCardData &
              DisplayableCardState;
            const newStaticData =
              transformProfileDBRowToStaticData(updatedProfileDBRow);
            const newBackData: ProfileCardBackDataType = {
              ...existingProfileCard.backData,
              description:
                newStaticData.description ||
                `Profile for ${
                  updatedProfileDBRow.company_name || updatedProfileDBRow.symbol
                }.`,
            };

            if (
              JSON.stringify(existingProfileCard.staticData) !==
                JSON.stringify(newStaticData) ||
              existingProfileCard.companyName !==
                updatedProfileDBRow.company_name ||
              existingProfileCard.logoUrl !== updatedProfileDBRow.image ||
              JSON.stringify(existingProfileCard.backData) !==
                JSON.stringify(newBackData)
            ) {
              cardUpdated = true;
              return {
                ...existingProfileCard,
                companyName: updatedProfileDBRow.company_name,
                logoUrl: updatedProfileDBRow.image,
                staticData: newStaticData,
                backData: newBackData,
              } as ProfileCardData & DisplayableCardState;
            }
          }
          return card;
        });
        return cardUpdated ? newCards : prevActiveCards;
      });
    },
    []
  );

  const rehydrateCard = useCallback(
    (cardFromStorage: any): DisplayableCard | null => {
      if (
        !cardFromStorage ||
        typeof cardFromStorage.id !== "string" ||
        !cardFromStorage.type ||
        !cardFromStorage.symbol
      )
        return null;
      let finalCreatedAt: number;
      if (typeof cardFromStorage.createdAt === "string")
        finalCreatedAt = new Date(cardFromStorage.createdAt).getTime();
      else if (typeof cardFromStorage.createdAt === "number")
        finalCreatedAt = cardFromStorage.createdAt;
      else finalCreatedAt = Date.now();

      const commonProps: DisplayableCardState & {
        id: string;
        symbol: string;
        createdAt: number;
        companyName?: string | null;
        logoUrl?: string | null;
      } = {
        id: cardFromStorage.id as string,
        symbol: cardFromStorage.symbol as string,
        isFlipped:
          typeof cardFromStorage.isFlipped === "boolean"
            ? cardFromStorage.isFlipped
            : false,
        createdAt: finalCreatedAt,
        companyName: cardFromStorage.companyName ?? null,
        logoUrl: cardFromStorage.logoUrl ?? null,
      };

      if (cardFromStorage.type === "price") {
        const originalFaceData = cardFromStorage.faceData || {};
        const timestamp =
          typeof originalFaceData.timestamp === "string"
            ? new Date(originalFaceData.timestamp).getTime()
            : typeof originalFaceData.timestamp === "number" &&
              !isNaN(originalFaceData.timestamp)
            ? originalFaceData.timestamp
            : null;

        const rehydratedFaceData: PriceCardFaceData = {
          timestamp: timestamp,
          price: originalFaceData.price ?? null,
          dayChange: originalFaceData.dayChange ?? null,
          changePercentage: originalFaceData.changePercentage ?? null,
          dayHigh: originalFaceData.dayHigh ?? null,
          dayLow: originalFaceData.dayLow ?? null,
          dayOpen: originalFaceData.dayOpen ?? null,
          previousClose: originalFaceData.previousClose ?? null,
          volume: originalFaceData.volume ?? null,
          yearHigh: originalFaceData.yearHigh ?? null,
          yearLow: originalFaceData.yearLow ?? null,
        };
        const originalBackData = cardFromStorage.backData || {};
        const rehydratedBackData: PriceCardSpecificBackData = {
          description: originalBackData.description,
          marketCap: originalBackData.marketCap ?? null,
          sma50d: originalBackData.sma50d ?? null,
          sma200d: originalBackData.sma200d ?? null,
        };
        return {
          ...commonProps,
          type: "price",
          faceData: rehydratedFaceData,
          backData: rehydratedBackData,
        };
      } else if (cardFromStorage.type === "price_snapshot") {
        const snapshotTime =
          typeof cardFromStorage.snapshotTime === "string"
            ? new Date(cardFromStorage.snapshotTime).getTime()
            : typeof cardFromStorage.snapshotTime === "number" &&
              !isNaN(cardFromStorage.snapshotTime)
            ? cardFromStorage.snapshotTime
            : Date.now();

        const originalSnapshotBackData = cardFromStorage.backData || {};
        const rehydratedSnapshotBackData: PriceCardSnapshotSpecificBackData = {
          description: originalSnapshotBackData.description,
          discoveredReason: originalSnapshotBackData.discoveredReason,
        };
        return {
          ...commonProps,
          type: "price_snapshot",
          capturedPrice: cardFromStorage.capturedPrice ?? 0,
          snapshotTime,
          yearHighAtCapture: cardFromStorage.yearHighAtCapture ?? null,
          yearLowAtCapture: cardFromStorage.yearLowAtCapture ?? null,
          backData: rehydratedSnapshotBackData,
        };
      } else if (cardFromStorage.type === "profile") {
        const staticDataFromStorage = cardFromStorage.staticData || {};
        const rehydratedBackData: ProfileCardBackDataType = {
          description:
            staticDataFromStorage.description ||
            `Profile for ${cardFromStorage.symbol || "unknown symbol"}`,
        };
        return {
          ...commonProps,
          type: "profile",
          staticData: staticDataFromStorage,
          liveData: {},
          backData: rehydratedBackData,
        } as ProfileCardData & DisplayableCardState;
      }
      return null;
    },
    []
  );

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >("finSignal-activeCards-v6", INITIAL_ACTIVE_CARDS);

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() =>
    Array.isArray(initialCardsFromStorage)
      ? (initialCardsFromStorage
          .map(rehydrateCard)
          .filter(Boolean) as DisplayableCard[])
      : INITIAL_ACTIVE_CARDS
  );

  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  const processQuoteData = useCallback(
    (quoteData: CombinedQuoteData, source: "fetch" | "realtime") => {
      const apiTimestampMillis = quoteData.api_timestamp * 1000;
      if (isNaN(apiTimestampMillis)) return;

      const newPriceCardFaceData: PriceCardFaceData = {
        timestamp: apiTimestampMillis,
        price: quoteData.current_price,
        changePercentage: quoteData.change_percentage ?? null,
        dayChange: quoteData.day_change ?? null,
        dayLow: quoteData.day_low ?? null,
        dayHigh: quoteData.day_high ?? null,
        volume: quoteData.volume ?? null,
        dayOpen: quoteData.day_open ?? null,
        previousClose: quoteData.previous_close ?? null,
        yearHigh: quoteData.year_high ?? null,
        yearLow: quoteData.year_low ?? null,
      };
      const newPriceCardBackData: PriceCardSpecificBackData = {
        marketCap: quoteData.market_cap ?? null,
        sma50d: quoteData.sma_50d ?? null,
        sma200d: quoteData.sma_200d ?? null,
      };
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
        const updatedCards = prevActiveCards.map((card: DisplayableCard) => {
          if (card.type === "price" && card.symbol === quoteData.symbol) {
            const existingPriceCard = card as PriceCardData &
              DisplayableCardState;
            if (
              source === "realtime" &&
              existingPriceCard.faceData.timestamp &&
              apiTimestampMillis < existingPriceCard.faceData.timestamp
            )
              return card;
            if (
              JSON.stringify(existingPriceCard.faceData) !==
                JSON.stringify(newPriceCardFaceData) ||
              JSON.stringify(existingPriceCard.backData) !==
                JSON.stringify(newPriceCardBackData) ||
              existingPriceCard.companyName !==
                (quoteData.companyName ?? existingPriceCard.companyName) ||
              existingPriceCard.logoUrl !==
                (quoteData.logoUrl ?? existingPriceCard.logoUrl)
            ) {
              cardsNeedUpdate = true;
              return {
                ...existingPriceCard,
                companyName:
                  quoteData.companyName ?? existingPriceCard.companyName,
                logoUrl: quoteData.logoUrl ?? existingPriceCard.logoUrl,
                faceData: newPriceCardFaceData,
                backData: {
                  ...existingPriceCard.backData,
                  ...newPriceCardBackData,
                },
              } as PriceCardData & DisplayableCardState;
            }
          }
          if (card.type === "profile" && card.symbol === quoteData.symbol) {
            const existingProfileCard = card as ProfileCardData &
              DisplayableCardState;
            if (
              existingProfileCard.liveData.timestamp &&
              apiTimestampMillis < existingProfileCard.liveData.timestamp
            )
              return card;
            if (
              JSON.stringify(existingProfileCard.liveData) !==
              JSON.stringify(newProfileCardLiveData)
            ) {
              cardsNeedUpdate = true;
              return {
                ...existingProfileCard,
                liveData: newProfileCardLiveData,
              } as ProfileCardData & DisplayableCardState;
            }
          }
          return card;
        });

        const existingPriceCardIndex = updatedCards.findIndex(
          (c) => c.type === "price" && c.symbol === quoteData.symbol
        );
        if (existingPriceCardIndex === -1) {
          cardsNeedUpdate = true;
          const newPriceCard: PriceCardData & DisplayableCardState = {
            id: `${quoteData.symbol}-live-price-${Date.now()}`,
            type: "price",
            symbol: quoteData.symbol,
            createdAt: Date.now(),
            companyName: quoteData.companyName ?? null,
            logoUrl: quoteData.logoUrl ?? null,
            faceData: newPriceCardFaceData,
            backData: newPriceCardBackData,
            isFlipped: false,
          };
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
        return cardsNeedUpdate ? updatedCards : prevActiveCards;
      });
    },
    [toast]
  );

  const handleTakeSnapshot = useCallback(
    (sourceCardId?: string) => {
      // Renamed to sourceCardId for clarity
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
          // Ensure full type
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
            discoveredReason: `Snapshot of ${
              livePriceCard.symbol
            } from ${new Date(
              livePriceCard.faceData.timestamp!
            ).toLocaleString()}`,
            description: `Snapshot of ${
              livePriceCard.symbol
            } price: $${livePriceCard.faceData.price?.toFixed(2)}.`,
          },
          isFlipped: false,
        };

        setActiveCards((prev) => {
          const cards = [...prev];
          if (sourceCardIndex !== -1) {
            cards.splice(sourceCardIndex + 1, 0, newSnapshot);
          } else {
            cards.unshift(newSnapshot); // Fallback
          }
          return cards as DisplayableCard[];
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
          description: "Card not found to take a snapshot.",
          variant: "destructive",
        });
      }
    },
    [activeCards, toast] // Removed setActiveCards from deps, it's stable
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
          <span className="italic"> ({String(data.message)})</span>
        )}
        {data.timestamp &&
          !isNaN(new Date(data.timestamp * 1000).getTime()) && (
            <span className="block">
              {" "}
              Last Data: {format(new Date(data.timestamp * 1000), "PP p")}{" "}
            </span>
          )}
      </div>
    ));
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      {stockDataHandlers}
      <div className="text-center p-2 bg-muted text-muted-foreground rounded-md text-sm shadow max-h-32 overflow-y-auto">
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
