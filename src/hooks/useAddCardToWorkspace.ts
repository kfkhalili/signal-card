// Hook to add cards to workspace from anywhere in the app
// This allows Compass and other pages to add cards without needing the full workspace manager

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { getCardInitializer, type CardInitializationContext } from "@/components/game/cardInitializer.types";
import "@/components/game/cards/initializers";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { DisplayableCard } from "@/components/game/types";
import { Result } from "neverthrow";

const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

/**
 * Reads current workspace cards from localStorage
 */
function getCurrentWorkspaceCards(): DisplayableCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(WORKSPACE_LOCAL_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((cardObject) =>
        rehydrateCardFromStorage(cardObject as Record<string, unknown>)
      )
      .filter((card): card is DisplayableCard => card !== null);
  } catch (error) {
    console.warn("[useAddCardToWorkspace] Failed to read workspace cards:", error);
    return [];
  }
}

/**
 * Saves workspace cards to localStorage and triggers update event
 */
function saveWorkspaceCards(cards: DisplayableCard[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    // Convert DisplayableCard to storage format (remove isFlipped)
    const cardsToStore = cards.map((card) => {
      const { isFlipped, ...cardData } = card;
      return cardData;
    });

    localStorage.setItem(
      WORKSPACE_LOCAL_STORAGE_KEY,
      JSON.stringify(cardsToStore)
    );

    // Trigger storage event so workspace page can update if it's open
    window.dispatchEvent(new Event("local-storage"));
  } catch (error) {
    console.error("[useAddCardToWorkspace] Failed to save workspace cards:", error);
  }
}

/**
 * Hook to add cards to workspace from any page.
 * Adds cards directly to localStorage without navigation.
 */
export function useAddCardToWorkspace() {
  const { supabase } = useAuth();

  const addCard = useCallback(
    async (symbol: string, cardTypes: CardType[] = ["profile"]) => {
      if (!supabase) {
        console.warn("[useAddCardToWorkspace] No supabase client available");
        return;
      }

      // Ensure non-empty array for type safety
      const safeCardTypes = cardTypes.length > 0 ? cardTypes : ["profile"];
      const determinedSymbol = symbol.toUpperCase();

      // Get current workspace cards
      const currentCards = getCurrentWorkspaceCards();

      // Initialize and add each card type
      const newCards: DisplayableCard[] = [];

      for (const cardType of safeCardTypes as CardType[]) {
        // Check if card already exists
        const existingCard = currentCards.find(
          (card) => card.symbol === determinedSymbol && card.type === cardType
        );

        if (existingCard) {
          // Card already exists, skip
          continue;
        }

        // Get card initializer
        const initializer = getCardInitializer(cardType);
        if (!initializer) {
          console.warn(
            `[useAddCardToWorkspace] Unsupported card type: ${cardType} for ${determinedSymbol}`
          );
          continue;
        }

        // Initialize card
        const initContext: CardInitializationContext = {
          symbol: determinedSymbol,
          supabase,
          activeCards: currentCards,
        };

        const result: Result<DisplayableCard, Error> = await initializer(
          initContext
        );

        result.match(
          (newCard) => {
            newCards.push(newCard);
          },
          (error) => {
            console.error(
              `[useAddCardToWorkspace] Could not add ${cardType} card for ${determinedSymbol}:`,
              error.message
            );
          }
        );
      }

      // Add new cards to workspace (prepend to beginning)
      if (newCards.length > 0) {
        const updatedCards = [...newCards, ...currentCards];
        saveWorkspaceCards(updatedCards);
      }
    },
    [supabase]
  );

  const addCards = useCallback(
    async (cards: { symbol: string; cardTypes?: CardType[] }[]) => {
      if (!supabase) {
        console.warn("[useAddCardToWorkspace] No supabase client available");
        return;
      }

      // Get current workspace cards
      let currentCards = getCurrentWorkspaceCards();
      const newCards: DisplayableCard[] = [];

      // Process each card
      for (const card of cards) {
        const safeCardTypes =
          card.cardTypes && card.cardTypes.length > 0
            ? card.cardTypes
            : ["profile"];
        const determinedSymbol = card.symbol.toUpperCase();

        for (const cardType of safeCardTypes) {
          // Check if card already exists
          const existingCard = currentCards.find(
            (c) => c.symbol === determinedSymbol && c.type === cardType
          );

          if (existingCard) {
            continue;
          }

          // Get card initializer
          const initializer = getCardInitializer(cardType as CardType);
          if (!initializer) {
            console.warn(
              `[useAddCardToWorkspace] Unsupported card type: ${cardType} for ${determinedSymbol}`
            );
            continue;
          }

          // Initialize card
          const initContext: CardInitializationContext = {
            symbol: determinedSymbol,
            supabase,
            activeCards: currentCards,
          };

          const result: Result<DisplayableCard, Error> = await initializer(
            initContext
          );

          result.match(
            (newCard) => {
              newCards.push(newCard);
              // Update currentCards to include the new card for next iteration
              currentCards = [newCard, ...currentCards];
            },
            (error) => {
              console.error(
                `[useAddCardToWorkspace] Could not add ${cardType} card for ${determinedSymbol}:`,
                error.message
              );
            }
          );
        }
      }

      // Save all new cards to workspace
      if (newCards.length > 0) {
        const updatedCards = [...newCards, ...getCurrentWorkspaceCards()];
        saveWorkspaceCards(updatedCards);
      }
    },
    [supabase]
  );

  return { addCard, addCards };
}

