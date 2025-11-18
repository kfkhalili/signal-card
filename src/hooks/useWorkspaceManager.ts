// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { type DragEndEvent } from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { useAuth } from "@/contexts/AuthContext";
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
import type { CustomCardData } from "@/components/game/cards/custom-card/custom-card.types";
import { useSubscriptionManager } from "@/hooks/useSubscriptionManager";

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
  displayCompanyName?: string | null;
  logoUrl?: string | null;
  [key: string]: unknown;
}
type StoredCardRawArray = BaseStoredCard[];

const INITIAL_RAW_CARDS: StoredCardRawArray = [];

interface SymbolSuggestion {
  value: string;
  label: string; // Combination of symbol and name for searching.
  companyName: string;
}

export interface SelectedDataItem {
  id: string;
  sourceCardId: string;
  sourceCardSymbol: string;
  label: string;
  value: string | number | React.ReactNode;
  unit?: string;
  isMonetary?: boolean;
  currency?: string | null;
  isValueAsPercentage?: boolean;
}

type SortKey = "symbol" | "type" | "createdAt" | "manual";
type SortOrder = "asc" | "desc";
export interface SortConfig {
  key: SortKey;
  order: SortOrder;
}

const getConcreteCardData = (card: DisplayableCard): ConcreteCardData => {
  const cardClone = { ...card };
  delete (cardClone as Partial<DisplayableCardState>).isFlipped;
  return cardClone as ConcreteCardData;
};

export function useWorkspaceManager() {
  const { toast } = useToast();
  const { supabase } = useAuth();

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

  const [isAddingCardInProgress, setIsAddingCardInProgress] =
    useState<boolean>(false);
  const [exchangeStatuses, setExchangeStatuses] = useState<
    Record<string, ExchangeMarketStatusRecord>
  >({});
  const [supportedSymbols, setSupportedSymbols] = useState<SymbolSuggestion[]>(
    []
  );

  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedDataItems, setSelectedDataItems] = useState<
    SelectedDataItem[]
  >([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    order: "desc",
  });

  const displayedCards = useMemo(() => {
    const cardsToSort = [...activeCards];
    cardsToSort.sort((a, b) => {
      const { key, order } = sortConfig;

      if (key === "manual") {
        return 0; // Keep the existing user-defined order
      }

      if (key === "createdAt") {
        return order === "asc"
          ? a.createdAt - b.createdAt
          : b.createdAt - a.createdAt;
      }

      const valA = (key === "symbol" ? a.symbol : a.type).toLowerCase();
      const valB = (key === "symbol" ? b.symbol : b.type).toLowerCase();

      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;

      return b.createdAt - a.createdAt;
    });
    return cardsToSort;
  }, [activeCards, sortConfig]);

  useEffect(() => {
    const fetchAllSymbols = async () => {
      if (!supabase) return;

      const symbolsResult = await fromPromise(
        supabase
          .from("supported_symbols")
          .select("symbol")
          .eq("is_active", true),
        (e) => e as Error
      );

      if (symbolsResult.isErr() || !symbolsResult.value.data) {
        console.error(
          "Failed to fetch supported symbols:",
          symbolsResult.isErr() && symbolsResult.error
        );
        return;
      }

      const symbolStrings = symbolsResult.value.data.map((s) => s.symbol);

      const profilesResult = await fromPromise(
        supabase
          .from("profiles")
          .select("symbol, display_company_name")
          .in("symbol", symbolStrings),
        (e) => e as Error
      );

      if (profilesResult.isErr() || !profilesResult.value.data) {
        console.error(
          "Failed to fetch profiles for symbols:",
          profilesResult.isErr() && profilesResult.error
        );
        // Fallback to symbols only if profiles fail
        const symbolOnlySuggestions = symbolStrings
          .map((s) => ({
            value: s,
            label: s,
            companyName: "Name not available",
          }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setSupportedSymbols(symbolOnlySuggestions);
        return;
      }

      const companyNamesMap = new Map<string, string>();
      profilesResult.value.data.forEach((p) => {
        if (p.symbol && p.display_company_name) {
          companyNamesMap.set(p.symbol, p.display_company_name);
        }
      });

      const suggestions: SymbolSuggestion[] = symbolStrings
        .map((symbol) => {
          const companyName = companyNamesMap.get(symbol) ?? "Unknown Company";
          return {
            value: symbol,
            companyName,
            label: `${symbol} ${companyName}`,
          };
        })
        .sort((a, b) => a.value.localeCompare(b.value));

      setSupportedSymbols(suggestions);
    };

    fetchAllSymbols();
  }, [supabase]);

  useEffect(() => {
    setCardsInLocalStorage(activeCards as unknown as StoredCardRawArray);
  }, [activeCards, setCardsInLocalStorage]);

  const uniqueSymbolsInWorkspace = useMemo(() => {
    const symbols = new Set<string>();
    activeCards.forEach((card) => {
      if (card.type !== "custom") {
        symbols.add(card.symbol);
      }
    });
    return Array.from(symbols);
  }, [activeCards]);

  const handleToggleItemSelection = useCallback(
    (item: SelectedDataItem) => {
      setSelectedDataItems((prev) => {
        const isSelected = prev.some((p) => p.id === item.id);
        if (isSelected) {
          return prev.filter((p) => p.id !== item.id);
        } else {
          if (prev.length >= 20) {
            toast({
              title: "Selection Limit Reached",
              description: "A custom card can hold up to 20 items.",
              variant: "default",
            });
            return prev;
          }
          return [...prev, item];
        }
      });
    },
    [toast]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = displayedCards.findIndex((c) => c.id === active.id);
        const newIndex = displayedCards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          setActiveCards(arrayMove(displayedCards, oldIndex, newIndex));
          setSortConfig({ key: "manual", order: "asc" });
        }
      }
    },
    [displayedCards]
  );

  const createCustomStaticCard = useCallback(
    (narrative: string, description: string) => {
      if (selectedDataItems.length === 0) {
        toast({
          title: "No Items Selected",
          description:
            "Please select one or more data points to create a card.",
          variant: "destructive",
        });
        return;
      }

      const firstItem = selectedDataItems[0];
      const sourceCard = activeCards.find(
        (c) => c.id === firstItem.sourceCardId
      );

      const newCustomCard: CustomCardData & DisplayableCardState = {
        id: `custom-${Date.now()}`,
        type: "custom",
        symbol: sourceCard?.symbol ?? "CUSTOM",
        companyName: sourceCard?.companyName ?? narrative,
        displayCompanyName:
          sourceCard?.displayCompanyName ??
          sourceCard?.companyName ??
          narrative,
        logoUrl: sourceCard?.logoUrl ?? null,
        createdAt: Date.now(),
        isFlipped: false,
        websiteUrl: null,
        backData: {
          description:
            description ||
            `A custom card for ${sourceCard?.companyName ?? "a company"}.`,
        },
        narrative: narrative,
        items: selectedDataItems,
      };

      setActiveCards((prev) => [newCustomCard, ...prev]);

      toast({
        title: "Custom Card Created",
        description: `Successfully created "${narrative}".`,
      });

      setSelectedDataItems([]);
      setIsSelectionMode(false);
    },
    [activeCards, selectedDataItems, toast]
  );

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
                  updatedCards.unshift(newCardToAdd);
                }
              } else {
                updatedCards.unshift(newCardToAdd);
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
    [activeCards, supabase, toast]
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
    [toast]
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
                return { ...card, ...updatedConcreteData };
              }
            }
          }
          return card;
        });
        return overallChanged ? updatedCards : prevActiveCards;
      });
    },
    [toast]
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
    [toast]
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
    setTimeout(
      () =>
        toast({
          title: "Workspace Cleared",
          description: "You can now start fresh with any symbol.",
        }),
      0
    );
  }, [toast]);

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

  // CRITICAL: Centralized subscription manager with reference counting
  // This prevents the bug where deleting one card removes a subscription
  // that other cards still need (e.g., deleting revenue card removes
  // financial-statements subscription even though solvency and cashuse cards still need it)
  useSubscriptionManager(activeCards);

  return {
    activeCards: displayedCards,
    setActiveCards,
    isAddingCardInProgress,
    addCardToWorkspace,
    clearWorkspace,
    stockDataCallbacks,
    uniqueSymbolsInWorkspace,
    exchangeStatuses,
    onGenericInteraction,
    supportedSymbols,
    isSelectionMode,
    setIsSelectionMode,
    selectedDataItems,
    handleToggleItemSelection,
    createCustomStaticCard,
    sortConfig,
    setSortConfig,
    onDragEnd,
  };
}
