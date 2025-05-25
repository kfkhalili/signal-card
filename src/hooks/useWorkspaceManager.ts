// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type {
  DisplayableCard,
  ConcreteCardData,
  DisplayableCardState,
} from "@/components/game/types";
import type { AddCardFormValues } from "@/components/workspace/AddCardForm";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { OnGenericInteraction } from "@/components/game/cards/base-card/base-card.types";

import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";

type ExchangeMarketStatusRecord =
  Database["public"]["Tables"]["exchange_market_status"]["Row"];

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
import { Database } from "@/lib/supabase/database.types";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

type StoredCardRaw = Record<string, unknown>;

interface UseWorkspaceManagerProps {
  isPremiumUser: boolean;
}

interface AddCardOptions {
  requestingCardId?: string;
}

const getConcreteCardData = (card: DisplayableCard): ConcreteCardData => {
  const tempCard = { ...card };
  const stateKeys: (keyof DisplayableCardState)[] = [
    "isFlipped",
    "currentRarity",
    "rarityReason",
    "isLikedByCurrentUser",
    "currentUserLikeId",
    "likeCount",
    "commentCount",
    "isSavedByCurrentUser",
    "collectionCount",
  ];
  for (const key of stateKeys) {
    delete (tempCard as Partial<DisplayableCardState>)[key];
  }
  return tempCard as ConcreteCardData;
};

export function useWorkspaceManager({
  isPremiumUser,
}: UseWorkspaceManagerProps) {
  const { toast } = useToast();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [rawCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    StoredCardRaw[]
  >(WORKSPACE_LOCAL_STORAGE_KEY, []);

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() => {
    if (Array.isArray(rawCardsFromStorage)) {
      const rehydrated = rawCardsFromStorage
        .map(rehydrateCardFromStorage)
        .filter((card): card is DisplayableCard => card !== null);
      return rehydrated;
    }
    return INITIAL_ACTIVE_CARDS;
  });

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
    setCardsInLocalStorage(activeCards as unknown as StoredCardRaw[]);
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

          // Corrected shell card check
          const isPriceCard = newCardToAdd.type === "price";
          let isPriceCardShell = false;
          if (isPriceCard) {
            const priceCardData = newCardToAdd as PriceCardData;
            // A shell card is one where liveData.price is null
            // It should still have a liveData object.
            if (
              priceCardData.liveData &&
              priceCardData.liveData.price === null
            ) {
              isPriceCardShell = true;
            } else if (!priceCardData.liveData) {
              // This case indicates a malformed card if it's supposed to be a PriceCard
              console.error(
                "Price card is missing liveData object:",
                priceCardData
              );
              isPriceCardShell = true; // Treat as shell or error state
            }
            // If liveData.price is a number, it's not a shell.
          }

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
          // If it IS a shell card, the "Price Card Added (Shell)" toast
          // would have been shown by the `initializePriceCard` function.
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Could not add ${cardType} card.`;
        toast({
          title: "Error Adding Card",
          description: errorMessage,
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

  const onGenericInteraction: OnGenericInteraction = useCallback(
    async (payload) => {
      if (payload.interactionTarget === "card") {
        const { sourceCardSymbol, targetType, sourceCardId } = payload;

        const values: AddCardFormValues = {
          symbol: sourceCardSymbol,
          cardType: targetType,
        };

        await addCardToWorkspace(values, { requestingCardId: sourceCardId });
      }
    },
    [addCardToWorkspace]
  );

  const handleLiveQuoteUpdate = useCallback(
    (leanQuoteData: LiveQuoteIndicatorDBRow) => {
      const updateContext: CardUpdateContext = { toast };
      const eventType: CardUpdateEventType = "LIVE_QUOTE_UPDATE";

      setActiveCards((prevActiveCards) => {
        let overallChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (card.symbol === leanQuoteData.symbol) {
            const handler = getCardUpdateHandler(card.type, eventType);
            if (handler) {
              const { isFlipped, currentRarity, rarityReason } = card;
              const concreteCardDataForHandler = getConcreteCardData(card);

              const updatedConcreteData = handler(
                concreteCardDataForHandler,
                leanQuoteData,
                card,
                updateContext
              );

              if (updatedConcreteData !== concreteCardDataForHandler) {
                const tempForRarityCalc = {
                  ...updatedConcreteData,
                  isFlipped,
                } as DisplayableCard;
                const { rarity: newRarity, reason: newRarityReason } =
                  calculateDynamicCardRarity(tempForRarityCalc);

                if (
                  JSON.stringify(updatedConcreteData) !==
                    JSON.stringify(concreteCardDataForHandler) ||
                  newRarity !== currentRarity ||
                  newRarityReason !== rarityReason
                ) {
                  overallChanged = true;
                  const newCard: DisplayableCard = {
                    ...(card as DisplayableCard),
                    ...updatedConcreteData,
                    currentRarity: newRarity,
                    rarityReason: newRarityReason,
                  };
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
              const { isFlipped, currentRarity, rarityReason } = card;
              const concreteCardDataForHandler = getConcreteCardData(card);

              const updatedConcreteData = universalHandler(
                concreteCardDataForHandler,
                updatedProfileDBRow,
                card,
                updateContext
              );
              if (updatedConcreteData !== concreteCardDataForHandler) {
                const tempForRarityCalc = {
                  ...updatedConcreteData,
                  isFlipped,
                } as DisplayableCard;
                const { rarity: newRarity, reason: newRarityReason } =
                  calculateDynamicCardRarity(tempForRarityCalc);
                if (
                  JSON.stringify(updatedConcreteData) !==
                    JSON.stringify(concreteCardDataForHandler) ||
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
                  const newCard: DisplayableCard = {
                    ...(card as DisplayableCard),
                    ...updatedConcreteData,
                    currentRarity: newRarity,
                    rarityReason: newRarityReason,
                  };
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
    setCardsInLocalStorage([]);
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
    onGenericInteraction,
  };
}
