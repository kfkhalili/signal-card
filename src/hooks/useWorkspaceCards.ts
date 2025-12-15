// Hook to check workspace cards from outside the workspace page
// Used by symbol analysis page to determine if cards already exist

import { useState, useEffect, useMemo } from "react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

interface BaseStoredCard {
  id: string;
  type: CardType;
  symbol: string;
  createdAt: number;
  [key: string]: unknown;
}

/**
 * Reads workspace cards from localStorage
 * Returns empty array if no cards exist or on error
 */
function getWorkspaceCardsFromStorage(): BaseStoredCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(WORKSPACE_LOCAL_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[useWorkspaceCards] Failed to read workspace cards:", error);
    return [];
  }
}

/**
 * Hook to check if a symbol has cards in the workspace
 * Listens to localStorage changes to update in real-time
 * @param symbol - The symbol to check
 * @returns Object with hasCards boolean and existingCardTypes array
 */
export function useWorkspaceCards(symbol: string) {
  const [workspaceCards, setWorkspaceCards] = useState<BaseStoredCard[]>(() => {
    return getWorkspaceCardsFromStorage();
  });

  // Listen for localStorage changes (from workspace page or other tabs)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | Event) => {
      if (event instanceof StorageEvent) {
        if (event.key === WORKSPACE_LOCAL_STORAGE_KEY || event.key === null) {
          setWorkspaceCards(getWorkspaceCardsFromStorage());
        }
      } else if (event.type === "local-storage") {
        // Custom event from useLocalStorage hook
        setWorkspaceCards(getWorkspaceCardsFromStorage());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, []);

  const symbolCards = useMemo(() => {
    const upperSymbol = symbol.toUpperCase();
    return workspaceCards.filter(
      (card) => card.symbol.toUpperCase() === upperSymbol
    );
  }, [workspaceCards, symbol]);

  const existingCardTypes = useMemo(() => {
    return symbolCards.map((card) => card.type);
  }, [symbolCards]);

  const hasCards = existingCardTypes.length > 0;

  return {
    hasCards,
    existingCardTypes,
    symbolCards,
  };
}

/**
 * Removes cards for a symbol from workspace
 * @param symbol - The symbol whose cards should be removed
 * @returns true if cards were removed, false otherwise
 */
export function removeSymbolFromWorkspace(symbol: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const cards = getWorkspaceCardsFromStorage();
    const upperSymbol = symbol.toUpperCase();
    const filteredCards = cards.filter(
      (card) => card.symbol.toUpperCase() !== upperSymbol
    );

    localStorage.setItem(
      WORKSPACE_LOCAL_STORAGE_KEY,
      JSON.stringify(filteredCards)
    );

    // Trigger storage event so workspace page and analysis page can update
    // Use "local-storage" event to match useAddCardToWorkspace pattern
    window.dispatchEvent(new Event("local-storage"));

    return filteredCards.length < cards.length;
  } catch (error) {
    console.error("[removeSymbolFromWorkspace] Failed to remove cards:", error);
    return false;
  }
}

