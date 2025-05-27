// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DisplayableCard,
  ConcreteCardData,
  DisplayableCardState,
} from "@/components/game/types";
import type { AddCardFormValues } from "@/components/workspace/AddCardForm";

import type {
  OnGenericInteraction,
  InteractionPayload,
  RequestNewCardInteraction,
  NavigateExternalInteraction,
  FilterWorkspaceDataInteraction,
  TriggerCardActionInteraction,
  CardType,
} from "@/components/game/cards/base-card/base-card.types.ts";

import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  LiveQuoteIndicatorDBRow,
  FinancialStatementDBRow,
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

// Define StoredCardRaw more appropriately for JSON serialization
// It can be a record of known primitive types or nested structures of the same.
// For simplicity, if the exact structure of stored cards is complex and varies,
// using a less specific but not 'any' type might be a pragmatic first step,
// to be refined later if possible.
// A common approach is to define it based on what JSON.stringify produces.
// For now, let's use a base type that can hold common card properties.
interface BaseStoredCard {
  id: string;
  type: CardType; // Use the CardType union
  symbol: string;
  createdAt: number;
  isFlipped: boolean;
  companyName?: string | null;
  logoUrl?: string | null;
  // Other fields are card-specific and would be part of `cardFromStorage` in rehydrateCardFromStorage
  // This StoredCardRaw is for the array stored in localStorage.
  // The individual items will be Records, but the array itself is of these base items.
  [key: string]: unknown; // Allows for additional card-specific properties
}
type StoredCardRawArray = BaseStoredCard[];

interface UseWorkspaceManagerProps {
  isPremiumUser: boolean;
}

const getConcreteCardData = (card: DisplayableCard): ConcreteCardData => {
  const cardClone = { ...card };
  delete (cardClone as Partial<DisplayableCardState>).isFlipped;
  return cardClone as ConcreteCardData;
};

export function useWorkspaceManager({
  isPremiumUser,
}: UseWorkspaceManagerProps) {
  const { toast } = useToast();
  const supabase: SupabaseClient<Database> = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  const [rawCardsFromStorage, setCardsInLocalStorage] =
    useLocalStorage<StoredCardRawArray>(WORKSPACE_LOCAL_STORAGE_KEY, []); // Use the new array type

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() => {
    if (Array.isArray(rawCardsFromStorage)) {
      const rehydrated: DisplayableCard[] = rawCardsFromStorage
        .map((card): DisplayableCard | null => {
          // Ensure card is treated as Record<string, unknown> for rehydrateCardFromStorage
          return rehydrateCardFromStorage(card as Record<string, unknown>);
        })
        .filter((card): card is DisplayableCard => card !== null); // Correctly filter out nulls
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
    // When persisting, we cast to unknown first, then to StoredCardRawArray
    // This satisfies TypeScript that the array elements match the expected stored type.
    setCardsInLocalStorage(activeCards as unknown as StoredCardRawArray);
  }, [activeCards, setCardsInLocalStorage]);

  const uniqueSymbolsInWorkspace = useMemo(() => {
    const symbols = new Set<string>();
    activeCards.forEach((card) => symbols.add(card.symbol));
    return Array.from(symbols);
  }, [activeCards]);

  const addCardToWorkspace = useCallback(
    async (
      values: AddCardFormValues,
      options?: { requestingCardId?: string }
    ) => {
      setIsAddingCardInProgress(true);
      let determinedSymbol = values.symbol;
      const cardTypeFromForm = values.cardType; // Renamed to avoid conflict
      const requestingCardId = options?.requestingCardId;

      if (!isPremiumUser && workspaceSymbolForRegularUser) {
        determinedSymbol = workspaceSymbolForRegularUser;
      }

      const existingCardIndex = activeCards.findIndex(
        (card) =>
          card.symbol === determinedSymbol && card.type === cardTypeFromForm
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
                description: `A ${cardTypeFromForm} card for ${determinedSymbol} is already in your workspace.`,
              }),
            0
          );
        }
        setIsAddingCardInProgress(false);
        return;
      }

      const initializer = getCardInitializer(cardTypeFromForm);
      if (!initializer) {
        toast({
          title: "System Error",
          description: `Unsupported card type requested: ${cardTypeFromForm}`,
          variant: "destructive",
        });
        setIsAddingCardInProgress(false);
        return;
      }

      setTimeout(
        () =>
          toast({
            title: `Adding ${determinedSymbol} ${cardTypeFromForm} card...`,
          }),
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
          setActiveCards((prev) => {
            const updatedCards = [...prev];
            if (requestingCardId) {
              const sourceIndex = updatedCards.findIndex(
                (c) => c.id === requestingCardId
              );
              if (sourceIndex !== -1 && newCardToAdd !== null) {
                // Check newCardToAdd is not null
                updatedCards.splice(sourceIndex + 1, 0, newCardToAdd);
              } else if (newCardToAdd !== null) {
                // Check newCardToAdd is not null
                updatedCards.push(newCardToAdd);
              }
            } else if (newCardToAdd !== null) {
              // Check newCardToAdd is not null
              updatedCards.push(newCardToAdd);
            }
            return updatedCards;
          });

          // Type assertion for shell card check
          const newCardDataForShellCheck = newCardToAdd as DisplayableCard & {
            liveData?: { price?: number | null };
          };

          const isShellPriceCard =
            newCardToAdd.type === "price" &&
            newCardDataForShellCheck.liveData?.price === null;

          if (!isShellPriceCard) {
            setTimeout(
              () =>
                toast({
                  title: "Card Added!",
                  description: `${determinedSymbol} ${cardTypeFromForm} card added to workspace.`,
                }),
              0
            );
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Could not add ${cardTypeFromForm} card.`;
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
    async (payload: InteractionPayload) => {
      switch (payload.intent) {
        case "REQUEST_NEW_CARD": {
          const requestPayload = payload as RequestNewCardInteraction;
          const values: AddCardFormValues = {
            symbol: requestPayload.sourceCardSymbol,
            cardType: requestPayload.targetCardType,
          };
          await addCardToWorkspace(values, {
            requestingCardId: requestPayload.sourceCardId,
          });
          break;
        }
        case "NAVIGATE_EXTERNAL": {
          const navigatePayload = payload as NavigateExternalInteraction;
          if (navigatePayload.url) {
            window.open(navigatePayload.url, "_blank", "noopener,noreferrer");
            toast({
              title: "Navigating",
              description: `Opening ${
                navigatePayload.navigationTargetName || "link"
              }...`,
            });
          } else {
            toast({
              title: "Navigation Error",
              description: "No URL provided.",
              variant: "destructive",
            });
          }
          break;
        }
        case "FILTER_WORKSPACE_DATA": {
          const filterPayload = payload as FilterWorkspaceDataInteraction;
          toast({
            title: "Filter Action Triggered",
            description: `Filter by ${filterPayload.filterField}: ${filterPayload.filterValue}. (Actual filtering TBD)`,
          });
          break;
        }
        case "TRIGGER_CARD_ACTION": {
          const actionPayload = payload as TriggerCardActionInteraction;
          toast({
            title: `Card Action: ${actionPayload.sourceCardSymbol}`,
            description: `Action: ${
              actionPayload.actionName
            }, Data: ${JSON.stringify(
              actionPayload.actionData || {}
            )}. (Handler TBD)`,
          });
          break;
        }
        default: {
          // This default case handles any intents not explicitly covered.
          // The 'never' type helps ensure all defined intents are handled,
          // but since payload can be any of the union members, we need a type assertion
          // for the unhandled case's message if we want to access payload.intent.
          const unhandledPayload = payload as { intent: string };
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "Unhandled interaction payload intent:",
              unhandledPayload.intent,
              payload
            );
          }
          toast({
            title: "Unknown Interaction",
            description: `An interaction of type "${unhandledPayload.intent}" occurred but is not handled.`,
            variant: "default",
          });
        }
      }
    },
    [addCardToWorkspace, toast]
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
                card, // Pass the full DisplayableCard
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

  const handleStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      const updateContext: CardUpdateContext = { toast };
      const eventType: CardUpdateEventType = "STATIC_PROFILE_UPDATE";

      setActiveCards((prevActiveCards) => {
        let overallChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (card.symbol === updatedProfileDBRow.symbol) {
            const handler = getCardUpdateHandler(card.type, eventType);
            if (handler) {
              const concreteCardDataForHandler = getConcreteCardData(card);
              const updatedConcreteData = handler(
                concreteCardDataForHandler,
                updatedProfileDBRow,
                card, // Pass the full DisplayableCard
                updateContext
              );
              if (updatedConcreteData !== concreteCardDataForHandler) {
                if (
                  JSON.stringify(updatedConcreteData) !==
                  JSON.stringify(concreteCardDataForHandler)
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

  const handleFinancialStatementUpdate = useCallback(
    (updatedStatementDBRow: FinancialStatementDBRow) => {
      const updateContext: CardUpdateContext = { toast };
      const eventType: CardUpdateEventType = "FINANCIAL_STATEMENT_UPDATE";

      setActiveCards((prevActiveCards) => {
        let overallChanged = false;
        const updatedCards = prevActiveCards.map((card) => {
          if (card.symbol === updatedStatementDBRow.symbol) {
            const handler = getCardUpdateHandler(card.type, eventType);
            if (handler) {
              const concreteCardDataForHandler = getConcreteCardData(card);
              const updatedConcreteData = handler(
                concreteCardDataForHandler,
                updatedStatementDBRow,
                card, // Pass the full DisplayableCard
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
      onFinancialStatementUpdate: handleFinancialStatementUpdate,
    }),
    [
      handleStaticProfileUpdate,
      handleLiveQuoteUpdate,
      handleExchangeStatusUpdate,
      handleFinancialStatementUpdate,
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
