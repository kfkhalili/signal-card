// src/components/game/ActiveCardsSection.tsx
import React, { useCallback, useState, useMemo } from "react";
import type { DisplayableCard } from "./types"; // Ensure this path is correct
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards"; // Ensure this path is correct
import { useToast as useAppToast } from "@/hooks/use-toast"; // Ensure this path is correct
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types"; // Ensure path is correct
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions"; // Ensure path is correct
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions"; // Ensure path is correct
import type {
  ProfileCardInteractionCallbacks,
  // ProfileCardData, // Not directly used here
} from "./cards/profile-card/profile-card.types"; // Ensure path is correct
import type {
  PriceCardInteractionCallbacks,
  // PriceCardData, // Not directly used here
} from "./cards/price-card/price-card.types"; // Ensure path is correct

import { createClient as createSupabaseFrontendClient } from "@/lib/supabase/client"; // Ensure path is correct
import { useCardActions } from "@/hooks/useCardActions"; // Ensure path is correct
import { useAuth } from "@/contexts/AuthContext"; // Ensure path is correct

// Define the shape for price-specific interactions passed to GameCard/PriceCardContainer
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
  // Add the missing prop for profile-specific interactions
  profileSpecificInteractions?: ProfileCardInteractionCallbacks; // <<< ADDED THIS LINE
  // Price specific interactions are already generated internally, but if they were passed from parent:
  priceSpecificInteractions?: PriceSpecificInteractionsForContainer; // Keep if needed, or remove if always internal
  // onHeaderIdentityClick is generated internally by useCardActions
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  profileSpecificInteractions, // Destructure the new prop
  priceSpecificInteractions, // Keep destructuring if it might be passed
}) => {
  const { toast } = useAppToast();
  const supabaseFrontendClient = createSupabaseFrontendClient();
  const { user, isLoading: isLoadingAuth } = useAuth();

  const { addProfileCardFromContext } = useCardActions({
    activeCards,
    setActiveCards,
    toast,
    supabase: supabaseFrontendClient,
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
      setTimeout(
        () =>
          toast({
            // Defer toast
            title: "Card Removed",
            description: "The card has been removed from view.",
          }),
        0
      );
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast, setActiveCards]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  const handleCaptureCardToCollection = useCallback(
    async (context: CardActionContext) => {
      // ... (implementation as before, ensure toast calls are deferred if needed)
    },
    [user, isLoadingAuth, activeCards, toast] // Dependencies
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: (ctx) =>
        setTimeout(
          () =>
            toast({
              title: "Liked!",
              description: `You liked ${ctx.symbol}. (Not implemented)`,
            }),
          0
        ),
      onComment: (ctx) =>
        setTimeout(
          () =>
            toast({
              title: "Comment Action",
              description: `Comment on ${ctx.symbol}. (Not implemented)`,
            }),
          0
        ),
      onSave: handleCaptureCardToCollection, // This is async, toasts are handled inside
      onShare: (ctx) =>
        setTimeout(
          () =>
            toast({
              title: "Share Action",
              description: `Shared ${ctx.symbol}. (Not implemented)`,
            }),
          0
        ),
    }),
    [toast, handleCaptureCardToCollection]
  );

  // Price specific interactions are generated here, but could also be passed in via props
  const priceSpecificInteractionHandlers: PriceSpecificInteractionsForContainer =
    priceSpecificInteractions ||
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);

  // Profile specific interactions are now primarily passed in via props
  // If not passed, could fallback to a default set (like for price)
  const finalProfileSpecificInteractions =
    profileSpecificInteractions ||
    useMemo(() => getProfileCardInteractionHandlers(toast), [toast]);

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
      profileSpecificInteractions={finalProfileSpecificInteractions} // <<< PASSING IT DOWN
      onHeaderIdentityClick={addProfileCardFromContext} // This comes from useCardActions
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
