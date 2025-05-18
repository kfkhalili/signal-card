// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import type { AddCardFormValues } from "@/components/workspace/AddCardForm";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";
import type { ExchangeMarketStatusRecord } from "@/types/market.types";

import {
  getCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import "@/components/game/cards/initializers";

import {
  getCardUpdateHandler,
  type CardUpdateContext,
  type CardUpdateEventType,
} from "@/components/game/cardUpdateHandler.types";
import "@/components/game/cards/updateHandlerInitializer";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

interface UseWorkspaceManagerProps {
  isPremiumUser: boolean;
}

interface AddCardOptions {
  requestingCardId?: string;
}

export function useWorkspaceManager({
  isPremiumUser,
}: UseWorkspaceManagerProps) {
  const { toast } = useToast();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >(WORKSPACE_LOCAL_STORAGE_KEY, INITIAL_ACTIVE_CARDS);

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() =>
    Array.isArray(initialCardsFromStorage)
      ? (initialCardsFromStorage
          .map(rehydrateCardFromStorage)
          .filter(Boolean) as DisplayableCard[])
      : INITIAL_ACTIVE_CARDS
  );

  const [workspaceSymbolForRegularUser, setWorkspaceSymbolForRegularUser] =
    useState<string | null>(null);
  const [isAddingCardInProgress, setIsAddingCardInProgress] =
    useState<boolean>(false);

  const [exchangeStatuses, setExchangeStatuses] = useState<
    Record<string, ExchangeMarketStatusRecord>
  >({});

  useEffect(() => {
    if (!isPremiumUser && activeCards.length > 0) {
      setWorkspaceSymbolForRegularUser(activeCards[0].symbol);
    } else if (activeCards.length === 0) {
      setWorkspaceSymbolForRegularUser(null);
    }
  }, [activeCards, isPremiumUser]);

  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  const uniqueSymbolsInWorkspace = useMemo(() => {
    const symbols = new Set<string>();
    activeCards.forEach((card) => symbols.add(card.symbol));
    return Array.from(symbols);
  }, [activeCards]);

  const addCardToWorkspace = useCallback(
    async (values: AddCardFormValues, options?: AddCardOptions) => {
      setIsAddingCardInProgress(true);
      let determinedSymbol = values.symbol;
      const cardType = values.cardType;
      const requestingCardId = options?.requestingCardId;

      if (!isPremiumUser && workspaceSymbolForRegularUser) {
        determinedSymbol = workspaceSymbolForRegularUser;
      }

      const existingCardIndex = activeCards.findIndex(
        (card) => card.symbol === determinedSymbol && card.type === cardType
      );

      if (existingCardIndex !== -1) {
        const existingCard = activeCards[existingCardIndex];
        if (requestingCardId && existingCard.id !== requestingCardId) {
          setActiveCards((prevCards) => {
            const currentCards = [...prevCards];
            const sourceCardActualIndex = currentCards.findIndex(
              (c) => c.id === requestingCardId
            );
            const targetCardActualIndex = currentCards.findIndex(
              (c) => c.id === existingCard.id
            );
            if (
              sourceCardActualIndex !== -1 &&
              targetCardActualIndex !== -1 &&
              targetCardActualIndex !== sourceCardActualIndex + 1
            ) {
              const [cardToMove] = currentCards.splice(
                targetCardActualIndex,
                1
              );
              const insertAtIndex =
                targetCardActualIndex < sourceCardActualIndex
                  ? sourceCardActualIndex
                  : sourceCardActualIndex + 1;
              currentCards.splice(insertAtIndex, 0, cardToMove);
              setTimeout(
                () =>
                  toast({
                    title: "Card Reordered",
                    description: `${
                      existingCard.companyName || existingCard.symbol
                    } ${existingCard.type} card moved.`,
                  }),
                0
              );
              return currentCards;
            }
            return prevCards;
          });
        } else {
          setTimeout(
            () =>
              toast({
                title: "Card Exists",
                description: `A ${cardType} card for ${determinedSymbol} is already in your workspace.`,
              }),
            0
          );
        }
        setIsAddingCardInProgress(false);
        return;
      }

      const initializer = getCardInitializer(cardType);
      if (!initializer) {
        toast({
          title: "System Error",
          description: `Unsupported card type requested: ${cardType}`,
          variant: "destructive",
        });
        setIsAddingCardInProgress(false);
        return;
      }

      setTimeout(
        () =>
          toast({ title: `Adding ${determinedSymbol} ${cardType} card...` }),
        0
      );

      let newCardToAdd: DisplayableCard | null = null;
      try {
        const initContext: CardInitializationContext = {
          symbol: determinedSymbol,
          supabase,
          toast,
          activeCards,
        };
        newCardToAdd = await initializer(initContext);

        if (newCardToAdd) {
          const { rarity, reason } = calculateDynamicCardRarity(newCardToAdd);
          newCardToAdd = {
            ...newCardToAdd,
            currentRarity: rarity,
            rarityReason: reason,
          };

          setActiveCards((prev) => {
            const updatedCards = [...prev];
            if (requestingCardId) {
              const sourceIndex = updatedCards.findIndex(
                (c) => c.id === requestingCardId
              );
              if (sourceIndex !== -1)
                updatedCards.splice(sourceIndex + 1, 0, newCardToAdd!);
              else updatedCards.push(newCardToAdd!);
            } else {
              updatedCards.push(newCardToAdd!);
            }
            return updatedCards;
          });

          const isPriceCard = newCardToAdd.type === "price";
          const isPriceCardShell =
            isPriceCard &&
            (newCardToAdd as PriceCardData).faceData.price === null;

          if (!isPriceCardShell) {
            setTimeout(
              () =>
                toast({
                  title: "Card Added!",
                  description: `${determinedSymbol} ${cardType} card added to workspace.`,
                }),
              0
            );
          }
        }
      } catch (err: any) {
        toast({
          title: "Error Adding Card",
          description: err.message || `Could not add ${cardType} card.`,
          variant: "destructive",
        });
      } finally {
        setIsAddingCardInProgress(false);
      }
    },
    [
      activeCards,
      supabase,
      toast,
      isPremiumUser,
      workspaceSymbolForRegularUser,
      setActiveCards,
    ]
  );

  const handleLiveQuoteUpdate = useCallback(
    (leanQuoteData: LiveQuoteIndicatorDBRow, source: "fetch" | "realtime") => {
      // if (process.env.NODE_ENV === 'development') {
      //   console.log(`[useWorkspaceManager] handleLiveQuoteUpdate for ${leanQuoteData.symbol}. Source: ${source}. Price: ${leanQuoteData.current_price}`, JSON.stringify(leanQuoteData));
      // }

      const updateContext: CardUpdateContext = { toast };
      const eventType: CardUpdateEventType = "LIVE_QUOTE_UPDATE";

      setActiveCards((prevActiveCards) => {
        let overallChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (card.symbol === leanQuoteData.symbol) {
            const handler = getCardUpdateHandler(card.type, eventType);
            if (handler) {
              const {
                isFlipped,
                currentRarity,
                rarityReason,
                isLikedByCurrentUser,
                currentUserLikeId,
                likeCount,
                commentCount,
                collectionCount,
                isSavedByCurrentUser,
                ...concreteCardData
              } = card;

              const updatedConcreteData = handler(
                concreteCardData as ConcreteCardData,
                leanQuoteData,
                card,
                updateContext
              );

              if (updatedConcreteData !== concreteCardData) {
                const tempForRarityCalc = {
                  ...updatedConcreteData,
                  isFlipped,
                } as DisplayableCard;
                const { rarity: newRarity, reason: newRarityReason } =
                  calculateDynamicCardRarity(tempForRarityCalc);

                if (
                  JSON.stringify(updatedConcreteData) !==
                    JSON.stringify(concreteCardData) ||
                  newRarity !== currentRarity ||
                  newRarityReason !== rarityReason
                ) {
                  overallChanged = true;
                  const newCard = {
                    ...card,
                    ...(updatedConcreteData as any),
                    currentRarity: newRarity,
                    rarityReason: newRarityReason,
                  };

                  if (
                    newCard.type === "price" &&
                    source === "realtime" &&
                    (newCard as PriceCardData).faceData.price !== null
                  ) {
                    const oldPrice = (card as PriceCardData).faceData.price;
                    const newPrice = (newCard as PriceCardData).faceData.price;
                    if (oldPrice !== newPrice) {
                      // setTimeout( // Toasting can be noisy for frequent updates
                      //   () =>
                      //     toast({
                      //       title: `Live Update: ${newCard.symbol}`,
                      //       description: `$${newPrice?.toFixed(2)} (${
                      //         (
                      //           newCard as PriceCardData
                      //         ).faceData.changePercentage?.toFixed(2) ?? "N/A"
                      //       }%) ${
                      //         newCard.currentRarity &&
                      //         newCard.currentRarity !== "Common"
                      //           ? `Rarity: ${newCard.currentRarity}`
                      //           : ""
                      //       }`,
                      //     }),
                      //   0
                      // );
                    }
                  }
                  return newCard;
                }
              }
            }
          }
          return card;
        });
        return overallChanged ? updatedCards : prevActiveCards;
      });
    },
    [setActiveCards, toast]
  );

  const handleStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      const updateContext: CardUpdateContext = { toast };
      const eventType: CardUpdateEventType = "STATIC_PROFILE_UPDATE";

      setActiveCards((prevActiveCards) => {
        let overallChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (card.symbol === updatedProfileDBRow.symbol) {
            const universalHandler = getCardUpdateHandler(card.type, eventType);
            if (universalHandler) {
              const {
                isFlipped,
                currentRarity,
                rarityReason,
                isLikedByCurrentUser,
                currentUserLikeId,
                likeCount,
                commentCount,
                collectionCount,
                isSavedByCurrentUser,
                ...concreteCardData
              } = card;
              const updatedConcreteData = universalHandler(
                concreteCardData as ConcreteCardData,
                updatedProfileDBRow,
                card,
                updateContext
              );
              if (updatedConcreteData !== concreteCardData) {
                const tempForRarityCalc = {
                  ...updatedConcreteData,
                  isFlipped,
                } as DisplayableCard;
                const { rarity: newRarity, reason: newRarityReason } =
                  calculateDynamicCardRarity(tempForRarityCalc);
                if (
                  JSON.stringify(updatedConcreteData) !==
                    JSON.stringify(concreteCardData) ||
                  newRarity !== currentRarity ||
                  newRarityReason !== rarityReason
                ) {
                  overallChanged = true;
                  if (card.type === "profile") {
                    setTimeout(
                      () =>
                        toast({
                          title: `Profile Updated: ${updatedProfileDBRow.symbol}`,
                          description: "Company details have been refreshed.",
                        }),
                      0
                    );
                  }
                  return {
                    ...card,
                    ...(updatedConcreteData as any),
                    currentRarity: newRarity,
                    rarityReason: newRarityReason,
                  };
                }
              }
            }
          }
          return card;
        });
        return overallChanged ? updatedCards : prevActiveCards;
      });
    },
    [setActiveCards, toast]
  );

  const handleExchangeStatusUpdate = useCallback(
    (status: ExchangeMarketStatusRecord) => {
      setExchangeStatuses((prev) => ({
        ...prev,
        [status.exchange_code]: status,
      }));
    },
    []
  );

  const clearWorkspace = useCallback(() => {
    setActiveCards(INITIAL_ACTIVE_CARDS);
    setWorkspaceSymbolForRegularUser(null);
    setCardsInLocalStorage(INITIAL_ACTIVE_CARDS);
    setTimeout(
      () =>
        toast({
          title: "Workspace Cleared",
          description: "You can now start fresh with any symbol.",
        }),
      0
    );
  }, [
    setActiveCards,
    setCardsInLocalStorage,
    toast,
    setWorkspaceSymbolForRegularUser,
  ]);

  const stockDataCallbacks = useMemo(
    () => ({
      onProfileUpdate: handleStaticProfileUpdate,
      onLiveQuoteUpdate: handleLiveQuoteUpdate,
      onExchangeStatusUpdate: handleExchangeStatusUpdate,
    }),
    [
      handleStaticProfileUpdate,
      handleLiveQuoteUpdate,
      handleExchangeStatusUpdate,
    ]
  );

  return {
    activeCards,
    setActiveCards,
    workspaceSymbolForRegularUser,
    isAddingCardInProgress,
    addCardToWorkspace,
    clearWorkspace,
    stockDataCallbacks,
    uniqueSymbolsInWorkspace,
    exchangeStatuses,
  };
}
