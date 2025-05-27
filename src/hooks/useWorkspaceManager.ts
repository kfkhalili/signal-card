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
import type { RevenueCardData } from "@/components/game/cards/revenue-card/revenue-card.types"; // New
import type { OnGenericInteraction } from "@/components/game/cards/base-card/base-card.types";

import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  LiveQuoteIndicatorDBRow,
  FinancialStatementDBRow, // New
} from "@/lib/supabase/realtime-service";

import type { Database } from "@/lib/supabase/database.types";
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

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

// Type for raw card data stored in local storage
type StoredCardRaw = Record<string, unknown>;

interface UseWorkspaceManagerProps {
  isPremiumUser: boolean;
}

interface AddCardOptions {
  requestingCardId?: string;
}

// Helper to get the concrete data part of a displayable card
const getConcreteCardData = (card: DisplayableCard): ConcreteCardData => {
  const cardClone = { ...card };
  // Remove UI state properties to get the core data structure
  delete (cardClone as Partial<DisplayableCardState>).isFlipped;
  return cardClone as ConcreteCardData;
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
    // Persist active cards to local storage whenever they change.
    // The `StoredCardRaw[]` cast is because local storage stores plain objects.
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
          // Logic to reorder card if it exists and is requested from another card
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
                  ? sourceCardActualIndex // If target was before source, insert at source's original position
                  : sourceCardActualIndex + 1; // If target was after source, insert after source
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
            return prevCards; // No reorder needed or possible
          });
        } else {
          // Card already exists and no specific reordering context
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
          // activeCards, // Removed as per self-containment principle for initializers
        };
        newCardToAdd = await initializer(initContext);

        if (newCardToAdd) {
          setActiveCards((prev) => {
            const updatedCards = [...prev];
            if (requestingCardId) {
              const sourceIndex = updatedCards.findIndex(
                (c) => c.id === requestingCardId
              );
              if (sourceIndex !== -1 && newCardToAdd) {
                updatedCards.splice(sourceIndex + 1, 0, newCardToAdd);
              } else if (newCardToAdd) {
                // Fallback if source card not found or no requesting card ID
                updatedCards.push(newCardToAdd);
              }
            } else if (newCardToAdd) {
              updatedCards.push(newCardToAdd);
            }
            return updatedCards;
          });

          // Toast for successful addition, unless it's a shell price card
          if (newCardToAdd) {
            const isPriceCardShell =
              newCardToAdd.type === "price" &&
              (newCardToAdd as PriceCardData).liveData?.price === null;

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
      activeCards, // Dependency for checking existing cards and reordering
      supabase,
      toast,
      isPremiumUser,
      workspaceSymbolForRegularUser,
      setActiveCards, // To update the state
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
      // Future: Handle other interaction targets or types
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
              const concreteCardDataForHandler = getConcreteCardData(card);
              const updatedConcreteData = handler(
                concreteCardDataForHandler,
                leanQuoteData,
                card, // Pass the full displayable card for context
                updateContext
              );
              if (updatedConcreteData !== concreteCardDataForHandler) {
                if (
                  JSON.stringify(updatedConcreteData) !==
                  JSON.stringify(concreteCardDataForHandler)
                ) {
                  overallChanged = true;
                  return { ...card, ...updatedConcreteData }; // Retain isFlipped by spreading card first
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
            // This handler can be called for any card type that might use profile info (e.g., PriceCard, RevenueCard)
            const handler = getCardUpdateHandler(card.type, eventType);
            if (handler) {
              const concreteCardDataForHandler = getConcreteCardData(card);
              const updatedConcreteData = handler(
                concreteCardDataForHandler,
                updatedProfileDBRow,
                card,
                updateContext
              );
              if (updatedConcreteData !== concreteCardDataForHandler) {
                if (
                  JSON.stringify(updatedConcreteData) !==
                  JSON.stringify(concreteCardDataForHandler)
                ) {
                  overallChanged = true;
                  if (card.type === "profile") {
                    // Specific toast for profile card itself
                    setTimeout(
                      () =>
                        toast({
                          title: `Profile Updated: ${updatedProfileDBRow.symbol}`,
                          description: "Company details have been refreshed.",
                        }),
                      0
                    );
                  }
                  return { ...card, ...updatedConcreteData };
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

  // New handler for financial statement updates
  const handleFinancialStatementUpdate = useCallback(
    (updatedStatementDBRow: FinancialStatementDBRow) => {
      const updateContext: CardUpdateContext = { toast };
      const eventType: CardUpdateEventType = "FINANCIAL_STATEMENT_UPDATE";

      setActiveCards((prevActiveCards) => {
        let overallChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (
            card.symbol === updatedStatementDBRow.symbol &&
            card.type === "revenue"
          ) {
            const handler = getCardUpdateHandler(card.type, eventType);
            if (handler) {
              const concreteCardDataForHandler = getConcreteCardData(
                card
              ) as RevenueCardData;
              const updatedConcreteData = handler(
                concreteCardDataForHandler,
                updatedStatementDBRow,
                card,
                updateContext
              );
              if (updatedConcreteData !== concreteCardDataForHandler) {
                if (
                  JSON.stringify(updatedConcreteData) !==
                  JSON.stringify(concreteCardDataForHandler)
                ) {
                  overallChanged = true;
                  return { ...card, ...updatedConcreteData };
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
    [] // No dependencies, setExchangeStatuses is stable
  );

  const clearWorkspace = useCallback(() => {
    setActiveCards(INITIAL_ACTIVE_CARDS);
    setWorkspaceSymbolForRegularUser(null);
    setCardsInLocalStorage([]); // Also clear from local storage
    setTimeout(
      () =>
        toast({
          title: "Workspace Cleared",
          description: "You can now start fresh with any symbol.",
        }),
      0
    );
  }, [
    setActiveCards, // Dependency
    setCardsInLocalStorage, // Dependency
    toast, // Dependency
    setWorkspaceSymbolForRegularUser, // Dependency
  ]);

  const stockDataCallbacks = useMemo(
    () => ({
      onProfileUpdate: handleStaticProfileUpdate,
      onLiveQuoteUpdate: handleLiveQuoteUpdate,
      onExchangeStatusUpdate: handleExchangeStatusUpdate,
      onFinancialStatementUpdate: handleFinancialStatementUpdate, // Add new callback
    }),
    [
      handleStaticProfileUpdate,
      handleLiveQuoteUpdate,
      handleExchangeStatusUpdate,
      handleFinancialStatementUpdate, // Add to dependencies
    ]
  );

  return {
    activeCards,
    setActiveCards, // Expose setActiveCards for direct manipulation if needed (e.g., reordering)
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
