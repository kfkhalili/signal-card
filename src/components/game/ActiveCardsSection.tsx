// src/components/game/ActiveCardsSection.tsx
import React, { useCallback, useState, useMemo, useEffect } from "react"; // Added useEffect
import type { DisplayableCard } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
  CardType as APICardType,
} from "./cards/base-card/base-card.types";
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions";
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions";
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";
import { useAuth } from "@/contexts/AuthContext";
import { CommentDialog } from "@/components/comments/CommentDialog";

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
    id: string;
  };
  isNew: boolean;
}

interface LikeApiResponse {
  like: {
    id: string;
    snapshot_id: string;
    user_id: string;
    liked_at: string;
  };
  message: string;
  isAlreadyLiked?: boolean;
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

interface CommentingCardInfo {
  snapshotId: string;
  symbol: string;
  name?: string | null;
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
  const [isCommentDialogOpen, setIsCommentDialogOpen] =
    useState<boolean>(false);
  const [commentingCardInfo, setCommentingCardInfo] =
    useState<CommentingCardInfo | null>(null);

  // Log when activeCards prop changes to see its content
  useEffect(() => {
    console.log(
      "[ActiveCardsSection] activeCards prop updated:",
      activeCards.map((c) => ({
        id: c.id,
        symbol: c.symbol,
        liked: c.isLikedByCurrentUser,
      }))
    );
  }, [activeCards]);

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

  const ensureGlobalSnapshot = useCallback(
    async (card: DisplayableCard): Promise<string | null> => {
      const {
        isFlipped,
        currentRarity,
        rarityReason,
        isLikedByCurrentUser,
        currentUserLikeId,
        ...cardDataForSnapshot
      } = card;
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
        return result.snapshot.id;
      } catch (error: any) {
        console.error("Error ensuring global snapshot:", error);
        toast({
          title: "Snapshot Error",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [toast]
  );

  const handleLikeOrUnlikeCard = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth || !user) {
        toast({ title: "Authentication Required", variant: "destructive" });
        return;
      }

      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        toast({
          title: "Error",
          description: "Card not found.",
          variant: "destructive",
        });
        return;
      }
      const cardToToggleLike = activeCards[cardIndex];
      console.log(
        `[ActiveCardsSection] handleLikeOrUnlikeCard for ${cardToToggleLike.symbol}. Current liked state: ${cardToToggleLike.isLikedByCurrentUser}`
      );

      const snapshotId = await ensureGlobalSnapshot(cardToToggleLike);
      if (!snapshotId) return;

      if (cardToToggleLike.isLikedByCurrentUser) {
        // --- UNLIKE ---
        try {
          const unlikeResponse = await fetch("/api/snapshots/like", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshotId }),
          });
          if (!unlikeResponse.ok && unlikeResponse.status !== 404) {
            // Allow 404 for "already unliked"
            const errorResult = await unlikeResponse.json();
            throw new Error(
              errorResult.error ||
                `Failed to unlike (status ${unlikeResponse.status})`
            );
          }
          toast({
            title: "Unliked!",
            description: `You unliked ${cardToToggleLike.symbol}.`,
          });
          setActiveCards((prev) => {
            const newCards = prev.map((c, idx) =>
              idx === cardIndex
                ? {
                    ...c,
                    isLikedByCurrentUser: false,
                    currentUserLikeId: undefined,
                  }
                : c
            );
            console.log(
              `[ActiveCardsSection] After UNLIKE, card ${context.symbol} state:`,
              newCards[cardIndex]?.isLikedByCurrentUser
            );
            return newCards;
          });
        } catch (error: any) {
          toast({
            title: "Unlike Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        // --- LIKE ---
        try {
          const likeResponse = await fetch("/api/snapshots/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshotId }),
          });
          const likeResult = (await likeResponse.json()) as LikeApiResponse;

          if (
            !likeResponse.ok &&
            !(likeResponse.status === 200 && likeResult.isAlreadyLiked)
          ) {
            throw new Error(
              (likeResult as any).error ||
                `Failed to like (status ${likeResponse.status})`
            );
          }

          const likeId = likeResult.like?.id;
          toast({
            title: "Liked!",
            description: `You liked ${cardToToggleLike.symbol}.`,
          });
          setActiveCards((prev) => {
            const newCards = prev.map((c, idx) =>
              idx === cardIndex
                ? {
                    ...c,
                    isLikedByCurrentUser: true,
                    currentUserLikeId: likeId,
                  }
                : c
            );
            console.log(
              `[ActiveCardsSection] After LIKE, card ${context.symbol} state:`,
              newCards[cardIndex]?.isLikedByCurrentUser
            );
            return newCards;
          });
        } catch (error: any) {
          toast({
            title: "Like Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    },
    [
      activeCards,
      user,
      isLoadingAuth,
      toast,
      ensureGlobalSnapshot,
      setActiveCards,
    ]
  );

  const handleCaptureCardToCollection = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth || !user) {
        toast({ title: "Authentication Required", variant: "destructive" });
        return;
      }
      const cardToCollect = activeCards.find((c) => c.id === context.id);
      if (!cardToCollect) {
        toast({
          title: "Error",
          description: "Card not found.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Collecting Card...",
        description: `Saving ${cardToCollect.symbol}...`,
      });
      const snapshotId = await ensureGlobalSnapshot(cardToCollect);
      if (!snapshotId) return;
      try {
        const addResponse = await fetch("/api/collections/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId }),
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
            description: `${cardToCollect.symbol} is already in your collection.`,
          });
        } else {
          toast({
            title: "Collected!",
            description: `${cardToCollect.symbol} added to your collection.`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Collection Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [activeCards, user, isLoadingAuth, toast, ensureGlobalSnapshot]
  );

  const handleCommentClick = useCallback(
    async (context: CardActionContext) => {
      if (!user) {
        toast({ title: "Authentication Required", variant: "destructive" });
        return;
      }
      const cardForComment = activeCards.find((c) => c.id === context.id);
      if (!cardForComment) {
        toast({
          title: "Error",
          description: "Card not found.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Loading Comments...",
        description: `Fetching details for ${cardForComment.symbol}...`,
      });
      const snapshotId = await ensureGlobalSnapshot(cardForComment);
      if (snapshotId) {
        setCommentingCardInfo({
          snapshotId,
          symbol: cardForComment.symbol,
          name: cardForComment.companyName,
        });
        setIsCommentDialogOpen(true);
      } else {
        toast({
          title: "Error",
          description: "Could not prepare comment section.",
          variant: "destructive",
        });
      }
    },
    [user, activeCards, toast, ensureGlobalSnapshot]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: handleCommentClick,
      onSave: handleCaptureCardToCollection,
      onShare: (ctx) => toast({ title: "Share Action (Not Implemented)" }),
    }),
    [
      handleLikeOrUnlikeCard,
      handleCommentClick,
      handleCaptureCardToCollection,
      toast,
    ]
  );

  const finalPriceSpecificInteractions =
    priceSpecificInteractions ||
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);
  const finalProfileSpecificInteractions =
    profileSpecificInteractions ||
    useMemo(() => getProfileCardInteractionHandlers(toast), [toast]);

  return (
    <>
      <ActiveCardsPresentational
        cards={activeCards} // This prop will trigger the useEffect above when it changes
        onToggleFlipCard={(id: string) =>
          setActiveCards((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, isFlipped: !c.isFlipped } : c
            )
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
      {commentingCardInfo && (
        <CommentDialog
          isOpen={isCommentDialogOpen}
          onOpenChange={(isOpen) => {
            setIsCommentDialogOpen(isOpen);
            if (!isOpen) setCommentingCardInfo(null);
          }}
          snapshotId={commentingCardInfo.snapshotId}
          cardSymbol={commentingCardInfo.symbol}
          cardName={commentingCardInfo.name}
        />
      )}
    </>
  );
};

export default ActiveCardsSection;
