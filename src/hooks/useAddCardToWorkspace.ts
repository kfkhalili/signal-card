// Hook to add cards to workspace from anywhere in the app
// This allows Compass and other pages to add cards without needing the full workspace manager

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { AddCardFormValues } from "@/components/workspace/AddCardForm";

/**
 * Hook to add cards to workspace from any page.
 * If called from outside workspace, navigates to workspace and adds the card(s).
 * If called from workspace, uses the workspace manager directly.
 */
export function useAddCardToWorkspace() {
  const router = useRouter();

  const addCard = useCallback(
    async (symbol: string, cardTypes: CardType[] = ["profile"]) => {
      // Store the card to add in sessionStorage
      // The workspace page will check for this and add it on mount
      // Ensure non-empty array for type safety
      const safeCardTypes = cardTypes.length > 0 ? cardTypes : ["profile"];
      const cardToAdd: AddCardFormValues = {
        symbol: symbol.toUpperCase(),
        cardTypes: safeCardTypes as [CardType, ...CardType[]],
      };

      sessionStorage.setItem("pendingCardToAdd", JSON.stringify(cardToAdd));

      // Navigate to workspace
      router.push("/workspace");
    },
    [router]
  );

  const addCards = useCallback(
    async (cards: { symbol: string; cardTypes?: CardType[] }[]) => {
      // Store multiple cards to add in sessionStorage
      // The workspace page will check for this and add them on mount
      const cardsToAdd: AddCardFormValues[] = cards.map((card) => {
        const safeCardTypes =
          card.cardTypes && card.cardTypes.length > 0
            ? card.cardTypes
            : ["profile"];
        return {
          symbol: card.symbol.toUpperCase(),
          cardTypes: safeCardTypes as [CardType, ...CardType[]],
        };
      });

      sessionStorage.setItem(
        "pendingCardsToAdd",
        JSON.stringify(cardsToAdd)
      );

      // Navigate to workspace
      router.push("/workspace");
    },
    [router]
  );

  return { addCard, addCards };
}

