// src/components/game/ActiveCardsSection.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayableCard } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast"; // Renamed to avoid conflict
import type { BaseCardSocialInteractions } from "./cards/base-card/base-card.types";
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions";
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions";
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";

import { createClient } from "../../lib/supabase/client";
import { useCardActions } from "@/hooks/useCardActions"; // Import the new hook

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface ActiveCardsSectionProps {
  activeCards: DisplayableCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
  onTakeSnapshot: (cardId?: string) => void;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  onTakeSnapshot,
}) => {
  const { toast } = useAppToast(); // Use the aliased import
  const supabase = createClient(); // Create Supabase client instance

  // Use the new hook for card actions
  const { addProfileCardFromContext } = useCardActions({
    activeCards,
    setActiveCards,
    toast,
    supabase,
  });

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
      toast({
        title: "Card Removed",
        description: "The card has been removed from view.",
      });
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast, setActiveCards]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  // Memoize interaction handlers to prevent unnecessary re-renders of ActiveCardsPresentational
  const socialInteractionsForCards: BaseCardSocialInteractions = React.useMemo(
    () => ({
      onLike: (ctx) =>
        toast({ title: "Liked!", description: `You liked ${ctx.symbol}.` }),
      onComment: (ctx) =>
        toast({ title: "Comment", description: `Comment on ${ctx.symbol}.` }),
      onSave: (ctx) => onTakeSnapshot(ctx.id), // onTakeSnapshot comes from props
      onShare: (ctx) =>
        toast({ title: "Shared!", description: `Shared ${ctx.symbol}.` }),
    }),
    [toast, onTakeSnapshot]
  );

  const priceSpecificInteractionHandlers: PriceSpecificInteractionsForContainer =
    React.useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);

  const profileSpecificInteractionHandlers: ProfileCardInteractionCallbacks =
    React.useMemo(() => getProfileCardInteractionHandlers(toast), [toast]);

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onToggleFlipCard={(id: string) =>
        setActiveCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isFlipped: !c.isFlipped } : c))
        )
      }
      onDeleteCardRequest={handleDeleteRequest}
      socialInteractions={socialInteractionsForCards}
      priceSpecificInteractions={priceSpecificInteractionHandlers}
      profileSpecificInteractions={profileSpecificInteractionHandlers}
      onHeaderIdentityClick={addProfileCardFromContext} // Use the action from the hook
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
