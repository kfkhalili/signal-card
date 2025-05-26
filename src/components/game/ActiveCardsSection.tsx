// src/components/game/ActiveCardsSection.tsx
"use client";

import React, { useCallback, useState } from "react";
import type { DisplayableCard } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast";
import type {
  CardActionContext,
  OnGenericInteraction,
} from "./cards/base-card/base-card.types";

interface ActiveCardsSectionProps {
  activeCards: DisplayableCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  onGenericInteraction: OnGenericInteraction;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  onGenericInteraction,
}) => {
  const { toast } = useAppToast();

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);

  const handleDeleteRequest = useCallback((cardId: string): void => {
    setCardIdToConfirmDelete(cardId);
  }, []);

  const confirmDeletion = useCallback((): void => {
    if (cardIdToConfirmDelete) {
      setActiveCards((prevCards) =>
        prevCards.filter((card) => card.id !== cardIdToConfirmDelete)
      );
      setTimeout(() => toast({ title: "Card Removed" }), 0);
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast, setActiveCards]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  return (
    <>
      <ActiveCardsPresentational
        cards={activeCards}
        onToggleFlipCard={(id: string) =>
          setActiveCards((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, isFlipped: !c.isFlipped } : c
            )
          )
        }
        onDeleteCardRequest={handleDeleteRequest}
        cardIdToConfirmDelete={cardIdToConfirmDelete}
        onGenericInteraction={onGenericInteraction}
        onConfirmDeletion={confirmDeletion}
        onCancelDeletion={cancelDeletion}
      />
    </>
  );
};

export default ActiveCardsSection;
