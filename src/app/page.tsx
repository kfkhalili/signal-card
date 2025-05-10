// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import useLocalStorage from "@/hooks/use-local-storage";
import { format } from "date-fns";

import type { DisplayableCard } from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData, // description is now optional here
  PriceCardSnapshotData,
  PriceCardSnapshotSpecificBackData, // description is now optional here
} from "@/components/game/cards/price-card/price-card.types";

import {
  useStockData,
  type CombinedQuoteData,
  type MarketStatusDisplayHook,
} from "@/hooks/useStockData";

import ActiveCardsSection from "@/components/game/active-cards-section";
import { useToast } from "@/hooks/use-toast";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const SYMBOL_TO_SUBSCRIBE: string = "AAPL";

export type PageMarketStatusDisplay = MarketStatusDisplayHook;

export default function FinSignalGamePage() {
  const { toast } = useToast();

  const rehydrateCard = useCallback(
    (cardFromStorage: any): DisplayableCard | null => {
      if (
        !cardFromStorage ||
        typeof cardFromStorage.id !== "string" ||
        !cardFromStorage.type ||
        !cardFromStorage.symbol
      ) {
        return null;
      }
      let finalCreatedAt: number;
      if (typeof cardFromStorage.createdAt === "string") {
        finalCreatedAt = new Date(cardFromStorage.createdAt).getTime();
      } else if (typeof cardFromStorage.createdAt === "number") {
        finalCreatedAt = cardFromStorage.createdAt;
      } else {
        finalCreatedAt = Date.now();
      }

      const commonProps = {
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
        let timestamp = originalFaceData.timestamp;
        if (typeof timestamp === "string")
          timestamp = new Date(timestamp).getTime();
        else if (typeof timestamp !== "number" || isNaN(timestamp))
          timestamp = null;
        const rehydratedFaceData: PriceCardFaceData = {
          timestamp,
          price: originalFaceData.price ?? null,
          dayChange: originalFaceData.dayChange ?? null,
          changePercentage: originalFaceData.changePercentage ?? null,
          dayHigh: originalFaceData.dayHigh ?? null,
          dayLow: originalFaceData.dayLow ?? null,
          dayOpen: originalFaceData.dayOpen ?? null,
          previousClose: originalFaceData.previousClose ?? null,
          volume: originalFaceData.volume ?? null,
        };
        const originalBackData = cardFromStorage.backData || {};
        const rehydratedBackData: PriceCardSpecificBackData = {
          description: originalBackData.description, // Changed from explanation
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
        let snapshotTime = cardFromStorage.snapshotTime;
        if (typeof snapshotTime === "string")
          snapshotTime = new Date(snapshotTime).getTime();
        else if (typeof snapshotTime !== "number" || isNaN(snapshotTime))
          snapshotTime = Date.now();
        const originalSnapshotBackData = cardFromStorage.backData || {};
        const rehydratedSnapshotBackData: PriceCardSnapshotSpecificBackData = {
          description: originalSnapshotBackData.description, // Changed from explanation
          discoveredReason: originalSnapshotBackData.discoveredReason,
        };
        return {
          ...commonProps,
          type: "price_snapshot",
          capturedPrice: cardFromStorage.capturedPrice ?? 0,
          snapshotTime,
          backData: rehydratedSnapshotBackData,
        };
      }
      return null;
    },
    []
  );

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >("finSignal-activeCards-v3", INITIAL_ACTIVE_CARDS);
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
      if (isNaN(apiTimestampMillis)) {
        return;
      }

      const newFaceData: PriceCardFaceData = {
        timestamp: apiTimestampMillis,
        price: quoteData.current_price,
        changePercentage: quoteData.change_percentage ?? null,
        dayChange: quoteData.day_change ?? null,
        dayLow: quoteData.day_low ?? null,
        dayHigh: quoteData.day_high ?? null,
        volume: quoteData.volume ?? null,
        dayOpen: quoteData.day_open ?? null,
        previousClose: quoteData.previous_close ?? null,
      };

      // The static description is now in PriceCardContent.
      // The `description` field in `newBackData` can be omitted if not used,
      // or used for a dynamic description if ever needed.
      const newBackData: PriceCardSpecificBackData = {
        // description: "Some dynamic description if needed", // Or omit if always static
        marketCap: quoteData.market_cap ?? null,
        sma50d: quoteData.sma_50d ?? null,
        sma200d: quoteData.sma_200d ?? null,
      };

      setActiveCards((prevActiveCards) => {
        const currentCards = Array.isArray(prevActiveCards)
          ? prevActiveCards
          : [];
        const existingCardIndex = currentCards.findIndex(
          (c) => c.type === "price" && c.symbol === quoteData.symbol
        );

        if (existingCardIndex !== -1) {
          const existingPriceCard = currentCards[
            existingCardIndex
          ] as PriceCardData & { isFlipped: boolean };
          if (
            source === "realtime" &&
            existingPriceCard.faceData.timestamp &&
            apiTimestampMillis <= existingPriceCard.faceData.timestamp &&
            quoteData.current_price === existingPriceCard.faceData.price
          ) {
            return prevActiveCards;
          }
          const updatedCard: PriceCardData & { isFlipped: boolean } = {
            ...existingPriceCard,
            companyName: quoteData.companyName ?? existingPriceCard.companyName,
            logoUrl: quoteData.logoUrl ?? existingPriceCard.logoUrl,
            faceData: newFaceData,
            backData: {
              // Ensure backData is updated, respecting optional description
              ...existingPriceCard.backData, // Preserve existing backData fields
              ...newBackData, // Overlay with new marketCap, SMAs (description might be undefined)
            },
          };
          const newCards = [...currentCards];
          newCards[existingCardIndex] = updatedCard;
          if (source === "realtime" && quoteData.current_price != null) {
            setTimeout(
              () =>
                toast({
                  title: "Live Card Updated!",
                  description: `${
                    quoteData.symbol
                  }: $${quoteData.current_price.toFixed(2)}`,
                }),
              0
            );
          }
          return newCards;
        } else {
          const newPriceCard: DisplayableCard = {
            id: `${quoteData.symbol}-live-price-${Date.now()}`,
            type: "price",
            symbol: quoteData.symbol,
            createdAt: Date.now(),
            companyName: quoteData.companyName ?? null,
            logoUrl: quoteData.logoUrl ?? null,
            faceData: newFaceData,
            backData: newBackData,
            isFlipped: false,
          };
          if (quoteData.current_price != null) {
            setTimeout(
              () =>
                toast({
                  title: "Live Card Loaded!",
                  description: `${
                    quoteData.symbol
                  }: $${quoteData.current_price.toFixed(2)}`,
                }),
              0
            );
          }
          return [
            newPriceCard,
            ...currentCards.filter(
              (c) => !(c.type === "price" && c.symbol === quoteData.symbol)
            ),
          ];
        }
      });
    },
    [toast, setActiveCards]
  );

  const { marketStatus, marketStatusMessage, lastApiTimestamp, profileData } =
    useStockData({
      symbol: SYMBOL_TO_SUBSCRIBE,
      onQuoteReceived: processQuoteData,
    });

  useEffect(() => {
    if (profileData) {
      setActiveCards((prevActiveCards) => {
        let hasChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (card.type === "price" && card.symbol === profileData.symbol) {
            const priceCard = card as PriceCardData & { isFlipped: boolean };
            const currentCompanyName = priceCard.companyName ?? null;
            const currentLogoUrl = priceCard.logoUrl ?? null;
            const newCompanyName = profileData.company_name ?? null;
            const newLogoUrl = profileData.image ?? null;
            if (
              currentCompanyName !== newCompanyName ||
              currentLogoUrl !== newLogoUrl
            ) {
              hasChanged = true;
              return {
                ...priceCard,
                companyName: newCompanyName,
                logoUrl: newLogoUrl,
              };
            }
          }
          return card;
        });
        if (hasChanged) return updatedCards;
        return prevActiveCards;
      });
    }
  }, [profileData, setActiveCards]);

  const handleTakeSnapshot = useCallback(
    (cardId?: string) => {
      const cardToSnapshot = activeCards.find((c) => c.id === cardId);
      if (cardToSnapshot) {
        if (cardToSnapshot.type === "price") {
          const livePriceCard = cardToSnapshot as PriceCardData & {
            isFlipped: boolean;
          };
          const currentTime = Date.now();
          const newSnapshot: DisplayableCard = {
            id: `snap-${livePriceCard.id}-${currentTime}`,
            type: "price_snapshot",
            symbol: livePriceCard.symbol,
            createdAt: currentTime,
            companyName: livePriceCard.companyName,
            logoUrl: livePriceCard.logoUrl,
            capturedPrice: livePriceCard.faceData.price!,
            snapshotTime: livePriceCard.faceData.timestamp!,
            backData: {
              // description is now optional and handled statically by PriceCardContent for snapshots too
              discoveredReason: `Snapshot of ${
                livePriceCard.symbol
              } from ${new Date(
                livePriceCard.faceData.timestamp!
              ).toLocaleString()}`,
            },
            isFlipped: false,
          };
          setActiveCards((prev) => [newSnapshot, ...prev]);
          toast({
            title: "Snapshot Created!",
            description: `Snapshot for ${livePriceCard.symbol} taken.`,
          });
        } else if (cardToSnapshot.type === "price_snapshot") {
          toast({
            title: "Info",
            description: "This is already a snapshot.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Snapshot Error",
          description: "Card not found to take a snapshot.",
          variant: "destructive",
        });
      }
    },
    [activeCards, setActiveCards, toast]
  );

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="text-center p-2 bg-muted text-muted-foreground rounded-md text-sm shadow">
        <p>
          Status: <span className="font-semibold">{marketStatus}</span>
          {marketStatusMessage && (
            <span className="text-xs block italic">
              ({String(marketStatusMessage)})
            </span>
          )}
        </p>
        {(marketStatus === "Open" ||
          marketStatus === "Closed" ||
          marketStatus === "Delayed" ||
          marketStatus === "Live") &&
          lastApiTimestamp &&
          !isNaN(new Date(lastApiTimestamp * 1000).getTime()) && (
            <p className="text-xs block mt-1">
              Last API Data: {format(new Date(lastApiTimestamp * 1000), "PP p")}
            </p>
          )}
      </div>
      <ActiveCardsSection
        activeCards={activeCards}
        setActiveCards={setActiveCards}
        onTakeSnapshot={handleTakeSnapshot}
      />
    </div>
  );
}
