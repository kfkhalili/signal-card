// src/components/game/ActiveCardsSection.tsx
import React, { useCallback, useState, useMemo } from "react";
import type { DisplayableCard, ConcreteCardData } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
  CardType as APICardType, // Renaming for clarity if local CardType exists
} from "./cards/base-card/base-card.types";
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions";
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions";
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";
import { useAuth } from "@/contexts/AuthContext";

// Types needed for API request bodies (mirroring those in the API routes)
import type { PriceCardData as APIPriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData as APIProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

type APICardDataSnapshot = APIPriceCardData | APIProfileCardData;

interface EnsureSnapshotRequestBody {
  cardType: APICardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: APICardDataSnapshot;
  rarityLevel?: string | null;
  rarityReason?: string | null;
}

interface SnapshotEnsureResponse {
  snapshot: {
    id: string; // This is the snapshot_id
    // include other fields if needed from card_snapshots
  };
  isNew: boolean;
}

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
  profileSpecificInteractions?: ProfileCardInteractionCallbacks;
  priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  profileSpecificInteractions,
  priceSpecificInteractions,
  onHeaderIdentityClick,
}) => {
  const { toast } = useAppToast();
  const { user, isLoading: isLoadingAuth } = useAuth();

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
            title: "Card Removed",
            description: "The card has been removed from your workspace.",
          }),
        0
      );
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast, setActiveCards]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  // Helper to get a snapshot_id by ensuring the snapshot exists globally
  const ensureGlobalSnapshot = async (
    card: DisplayableCard
  ): Promise<string | null> => {
    const { isFlipped, currentRarity, rarityReason, ...cardDataForSnapshot } =
      card;

    const requestBody: EnsureSnapshotRequestBody = {
      cardType: card.type as APICardType,
      symbol: card.symbol,
      companyName: card.companyName,
      logoUrl: card.logoUrl,
      cardDataSnapshot: cardDataForSnapshot as APICardDataSnapshot,
      rarityLevel: currentRarity,
      rarityReason: rarityReason,
    };

    try {
      const response = await fetch("/api/snapshots/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = (await response.json()) as SnapshotEnsureResponse;
      if (!response.ok) {
        throw new Error(
          (result as any).error ||
            `Failed to ensure snapshot (status ${response.status})`
        );
      }
      if (result.isNew) {
        console.log(
          `Global snapshot created for ${card.symbol}: ${result.snapshot.id}`
        );
      } else {
        console.log(
          `Existing global snapshot found for ${card.symbol}: ${result.snapshot.id}`
        );
      }
      return result.snapshot.id;
    } catch (error: any) {
      console.error("Error ensuring global snapshot:", error);
      toast({
        title: "Snapshot Error",
        description: error.message || "Could not process card snapshot.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleLikeCard = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth) {
        toast({ title: "Authenticating...", description: "Please wait." });
        return;
      }
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to like cards.",
          variant: "destructive",
        });
        return;
      }

      const cardToLike = activeCards.find((c) => c.id === context.id);
      if (!cardToLike) {
        toast({
          title: "Error",
          description: "Card not found in workspace.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Processing Like...",
        description: `Preparing ${cardToLike.symbol}...`,
      });
      const snapshotId = await ensureGlobalSnapshot(cardToLike);

      if (!snapshotId) return; // Error handled by ensureGlobalSnapshot

      try {
        const likeResponse = await fetch("/api/snapshots/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId }),
        });
        const likeResult = await likeResponse.json();

        if (
          !likeResponse.ok &&
          !(likeResponse.status === 200 && likeResult.isAlreadyLiked)
        ) {
          throw new Error(
            likeResult.error ||
              `Failed to like snapshot (status ${likeResponse.status})`
          );
        }

        if (likeResult.isAlreadyLiked) {
          toast({
            title: "Already Liked",
            description: `You've already liked this state of ${cardToLike.symbol}.`,
          });
        } else {
          toast({
            title: "Liked!",
            description: `You liked ${cardToLike.symbol} ${cardToLike.type}.`,
          });
        }
      } catch (error: any) {
        console.error("Error liking snapshot:", error);
        toast({
          title: "Like Failed",
          description: error.message || "Could not like the snapshot.",
          variant: "destructive",
        });
      }
    },
    [activeCards, user, isLoadingAuth, toast, ensureGlobalSnapshot]
  );

  const handleCaptureCardToCollection = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth) {
        toast({ title: "Authenticating...", description: "Please wait." });
        return;
      }
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to collect cards.",
          variant: "destructive",
        });
        return;
      }

      const cardToCollect = activeCards.find((c) => c.id === context.id);
      if (!cardToCollect) {
        toast({
          title: "Error",
          description: "Card not found in workspace.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Collecting Card...",
        description: `Saving ${cardToCollect.symbol} to your collection...`,
      });
      const snapshotId = await ensureGlobalSnapshot(cardToCollect);

      if (!snapshotId) return; // Error handled by ensureGlobalSnapshot

      try {
        // Now, explicitly add this snapshotId to the user's collection
        const addResponse = await fetch("/api/collections/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshotId /*, userNotes: "Optional notes here" */,
          }),
        });
        const addResult = await addResponse.json();

        if (
          !addResponse.ok &&
          !(
            addResponse.status === 200 &&
            addResult.message?.includes("already in collection")
          )
        ) {
          throw new Error(
            addResult.error ||
              `Failed to add to collection (status ${addResponse.status})`
          );
        }

        if (addResult.message?.includes("already in collection")) {
          toast({
            title: "Already Collected",
            description: `${cardToCollect.symbol} ${cardToCollect.type} is already in your collection.`,
          });
        } else {
          toast({
            title: "Collected!",
            description: `${cardToCollect.symbol} ${cardToCollect.type} added to your collection.`,
          });
        }
      } catch (error: any) {
        console.error("Error adding to collection:", error);
        toast({
          title: "Collection Failed",
          description: error.message || "Could not add card to collection.",
          variant: "destructive",
        });
      }
    },
    [activeCards, user, isLoadingAuth, toast, ensureGlobalSnapshot]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeCard,
      onComment: (ctx) => {
        // Placeholder for future comment functionality
        toast({
          title: "Comment (Not Implemented)",
          description: `Commenting on ${ctx.symbol}... This feature is coming soon!`,
        });
        // When implemented:
        // 1. const card = activeCards.find(c => c.id === ctx.id);
        // 2. if (card) { const snapshotId = await ensureGlobalSnapshot(card); }
        // 3. if (snapshotId) { /* Open comment modal, then POST to /api/snapshots/comment */ }
      },
      onSave: handleCaptureCardToCollection, // This is the "Collect" action
      onShare: (ctx) =>
        toast({
          title: "Share Action (Not Implemented)",
          description: `Shared ${ctx.symbol}.`,
        }),
    }),
    [toast, handleCaptureCardToCollection, handleLikeCard, activeCards] // ensureGlobalSnapshot removed, it's called within handlers
  );

  const finalPriceSpecificInteractions =
    priceSpecificInteractions ||
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);
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
      priceSpecificInteractions={finalPriceSpecificInteractions}
      profileSpecificInteractions={finalProfileSpecificInteractions}
      onHeaderIdentityClick={onHeaderIdentityClick}
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
