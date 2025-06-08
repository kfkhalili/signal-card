// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { fromPromise, Result } from "neverthrow";
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
} from "@/components/game/cards/base-card/base-card.types";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  LiveQuoteIndicatorDBRow,
  FinancialStatementDBRow,
} from "@/lib/supabase/realtime-service";
import type { Database } from "@/lib/supabase/database.types";
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

type ExchangeMarketStatusRecord =
  Database["public"]["Tables"]["exchange_market_status"]["Row"];

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

interface BaseStoredCard {
  id: string;
  type: CardType;
  symbol: string;
  createdAt: number;
  isFlipped: boolean;
  companyName?: string | null;
  logoUrl?: string | null;
  [key: string]: unknown;
}
type StoredCardRawArray = BaseStoredCard[];

const INITIAL_RAW_CARDS: StoredCardRawArray = [];

interface SymbolSuggestion {
  value: string;
  label: string;
}

const getConcreteCardData = (card: DisplayableCard): ConcreteCardData => {
  const cardClone = { ...card };
  delete (cardClone as Partial<DisplayableCardState>).isFlipped;
  return cardClone as ConcreteCardData;
};

export function useWorkspaceManager() {
  const { toast } = useToast();
  const { supabase } = useAuth(); // Get supabase client from AuthContext

  const [rawCardsFromStorage, setCardsInLocalStorage] =
    useLocalStorage<StoredCardRawArray>(
      WORKSPACE_LOCAL_STORAGE_KEY,
      INITIAL_RAW_CARDS
    );

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() => {
    if (Array.isArray(rawCardsFromStorage)) {
      return (
        rawCardsFromStorage
          .map((cardObject) =>
            rehydrateCardFromStorage(cardObject as Record<string, unknown>)
          )
          .filter((card): card is DisplayableCard => card !== null) ||
        INITIAL_ACTIVE_CARDS
      );
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
  const [supportedSymbols, setSupportedSymbols] = useState<SymbolSuggestion[]>(
    []
  );

  useEffect(() => {
    const fetchAllSymbols = async () => {
      if (!supabase) return;
      const result = await fromPromise(
        supabase
          .from("supported_symbols")
          .select("symbol")
          .eq("is_active", true)
          .order("symbol", { ascending: true }),
        (e) => e as Error
      );

      result.match(
        (response) => {
          if (response.data) {
            const symbols = response.data.map((s) => ({
              value: s.symbol,
              label: s.symbol,
            }));
            setSupportedSymbols(symbols);
          }
        },
        (error) => {
          console.error("Failed to fetch supported symbols:", error);
        }
      );
    };

    fetchAllSymbols();
  }, [supabase]);

  useEffect(() => {
    if (activeCards.length > 0) {
      setWorkspaceSymbolForRegularUser(activeCards[0].symbol);
    } else if (activeCards.length === 0) {
      setWorkspaceSymbolForRegularUser(null);
    }
  }, [activeCards]);

  useEffect(() => {
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

      if (!supabase) {
        toast({
          title: "Service Unavailable",
          description:
            "Cannot add card(s): Data service is not properly initialized.",
          variant: "destructive",
        });
        setIsAddingCardInProgress(false);
        return;
      }

      const determinedSymbol = values.symbol;
      const cardTypesToAttempt = values.cardTypes;
      const requestingCardId = options?.requestingCardId;

      let cardsAddedCount = 0;
      let cardsReorderedCount = 0;
      const duplicateMessages: string[] = [];
      const errorMessages: string[] = [];

      toast({
        title: `Processing ${cardTypesToAttempt.length} card request(s) for ${determinedSymbol}...`,
      });

      for (const individualCardType of cardTypesToAttempt) {
        const existingCardIndex = activeCards.findIndex(
          (card) =>
            card.symbol === determinedSymbol && card.type === individualCardType
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
                cardsReorderedCount++;
                return currentCards;
              }
              return prevCards;
            });
          } else {
            duplicateMessages.push(
              `${determinedSymbol} ${individualCardType} card already exists.`
            );
          }
          continue;
        }

        const initializer = getCardInitializer(individualCardType);
        if (!initializer) {
          errorMessages.push(
            `Unsupported card type: ${individualCardType} for ${determinedSymbol}.`
          );
          continue;
        }

        const initContext: CardInitializationContext = {
          symbol: determinedSymbol,
          supabase,
          toast,
          activeCards,
        };

        const result: Result<DisplayableCard, Error> = await initializer(
          initContext
        );

        result.match(
          (newCardToAdd) => {
            setActiveCards((prev) => {
              const updatedCards = [...prev];
              if (requestingCardId) {
                const sourceIndex = updatedCards.findIndex(
                  (c) => c.id === requestingCardId
                );
                if (sourceIndex !== -1) {
                  updatedCards.splice(sourceIndex + 1, 0, newCardToAdd);
                } else {
                  updatedCards.push(newCardToAdd);
                }
              } else {
                updatedCards.push(newCardToAdd);
              }
              return updatedCards;
            });
            cardsAddedCount++;
          },
          (error) => {
            const errorMessage = `Could not add ${individualCardType} card for ${determinedSymbol}: ${error.message}`;
            errorMessages.push(errorMessage);
          }
        );
      }

      if (cardsAddedCount > 0) {
        toast({
          title: "Cards Added",
          description: `${cardsAddedCount} new card(s) for ${determinedSymbol} added to workspace.`,
        });
      }
      if (cardsReorderedCount > 0) {
        toast({
          title: "Cards Reordered",
          description: `${cardsReorderedCount} existing card(s) moved.`,
        });
      }
      if (duplicateMessages.length > 0) {
        toast({
          title: "Duplicates Found",
          description: duplicateMessages.join(" "),
          variant: "default",
        });
      }
      if (errorMessages.length > 0) {
        toast({
          title: "Errors Adding Cards",
          description: errorMessages.join(" "),
          variant: "destructive",
        });
      }
      if (
        cardsAddedCount === 0 &&
        cardsReorderedCount === 0 &&
        duplicateMessages.length === 0 &&
        errorMessages.length === 0
      ) {
        toast({
          title: "No Action Taken",
          description: "No new cards were added or reordered.",
        });
      }

      setIsAddingCardInProgress(false);
    },
    [activeCards, supabase, toast, setActiveCards]
  );

  const onGenericInteraction: OnGenericInteraction = useCallback(
    async (payload: InteractionPayload) => {
      switch (payload.intent) {
        case "REQUEST_NEW_CARD": {
          const requestPayload = payload as RequestNewCardInteraction;
          const values: AddCardFormValues = {
            symbol: requestPayload.sourceCardSymbol,
            cardTypes: [requestPayload.targetCardType],
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
                card,
                updateContext
              );
              if (
                JSON.stringify(updatedConcreteData) !==
                JSON.stringify(concreteCardDataForHandler)
              ) {
                overallChanged = true;
                return { ...card, ...updatedConcreteData };
              }
            }
          }
          return card;
        });
        return overallChanged ? updatedCards : prevActiveCards;
      });
    },
    [toast, setActiveCards]
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
                card,
                updateContext
              );
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
          return card;
        });
        return overallChanged ? updatedCards : prevActiveCards;
      });
    },
    [toast, setActiveCards]
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
                card,
                updateContext
              );
              if (
                JSON.stringify(updatedConcreteData) !==
                JSON.stringify(concreteCardDataForHandler)
              ) {
                overallChanged = true;
                return { ...card, ...updatedConcreteData };
              }
            }
          }
          return card;
        });
        return overallChanged ? updatedCards : prevActiveCards;
      });
    },
    [toast, setActiveCards]
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
    setTimeout(
      () =>
        toast({
          title: "Workspace Cleared",
          description: "You can now start fresh with any symbol.",
        }),
      0
    );
  }, [toast, setActiveCards, setWorkspaceSymbolForRegularUser]);

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
    supportedSymbols,
  };
}
