// src/components/game/ActiveCardsSection.tsx
"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DisplayableCard, ConcreteCardData } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
  CardType as APICardType,
} from "./cards/base-card/base-card.types";
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions";
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions";
import type {
  ProfileCardInteractionCallbacks,
  ProfileCardData,
} from "./cards/profile-card/profile-card.types"; // Import ProfileCardData
import type {
  PriceCardInteractionCallbacks,
  PriceCardData,
} from "./cards/price-card/price-card.types"; // Import PriceCardData
import { useAuth } from "@/contexts/AuthContext";
import { CommentDialog } from "@/components/comments/CommentDialog";
import type { DisplayableCardState } from "./types"; // Import DisplayableCardState

export interface EnsureSnapshotRequestBody {
  cardType: APICardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: ConcreteCardData;
  rarityLevel?: string | null;
  rarityReason?: string | null;
}

export interface SnapshotEnsureResponse {
  snapshot: {
    id: string;
  };
  isNew: boolean;
  raceCondition?: boolean;
}

export interface LikeApiResponse {
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
  const pathname = usePathname();

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] =
    useState<boolean>(false);
  const [commentingCardInfo, setCommentingCardInfo] =
    useState<CommentingCardInfo | null>(null);

  useEffect(() => {
    console.debug(
      "[ActiveCardsSection] activeCards prop updated:",
      activeCards.map((c) => ({
        id: c.id,
        symbol: c.symbol,
        type: c.type,
        liked: c.isLikedByCurrentUser,
        rarity: c.currentRarity,
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
      // Destructure DisplayableCardState properties to exclude them from the core snapshot data
      // and to use currentRarity and rarityReason directly.
      const {
        isFlipped,
        currentRarity,
        rarityReason,
        isLikedByCurrentUser,
        currentUserLikeId,
        ...restOfCardData
      } = card;

      let actualCardDataSnapshot: ConcreteCardData;

      // Use card.type (which comes from DisplayableCard) for discrimination
      if (card.type === "price") {
        // 'restOfCardData' should now be PriceCardData, but cast for type safety
        // This ensures that 'actualCardDataSnapshot' conforms to PriceCardData structure
        const priceCardData = restOfCardData as Omit<
          PriceCardData,
          keyof DisplayableCardState
        >;
        actualCardDataSnapshot = {
          id: priceCardData.id,
          type: "price",
          symbol: priceCardData.symbol,
          createdAt: priceCardData.createdAt,
          companyName: priceCardData.companyName,
          logoUrl: priceCardData.logoUrl,
          faceData: priceCardData.faceData,
          backData: priceCardData.backData,
          // Ensure no DisplayableCardState properties are accidentally included
        };
      } else if (card.type === "profile") {
        // 'restOfCardData' should now be ProfileCardData, cast for type safety
        const profileCardData = restOfCardData as Omit<
          ProfileCardData,
          keyof DisplayableCardState
        >;
        actualCardDataSnapshot = {
          id: profileCardData.id,
          type: "profile",
          symbol: profileCardData.symbol,
          createdAt: profileCardData.createdAt,
          companyName: profileCardData.companyName,
          logoUrl: profileCardData.logoUrl,
          staticData: profileCardData.staticData,
          liveData: profileCardData.liveData,
          backData: profileCardData.backData,
          websiteUrl: profileCardData.websiteUrl,
          // Ensure no DisplayableCardState properties are accidentally included
        };
      } else {
        // This 'else' block is for types not explicitly handled.
        // 'card.type' will correctly refer to the type property of the 'card' parameter.
        const unknownCardType = (card as any).type; // Use 'any' for logging the potentially unknown type
        console.error("Unknown card type for snapshot:", unknownCardType);
        toast({
          title: "Snapshot Error",
          description: `Unknown card type: ${unknownCardType}. Cannot create snapshot.`,
          variant: "destructive",
        });
        return null;
      }

      const requestBody: EnsureSnapshotRequestBody = {
        cardType: card.type, // This is from DisplayableCard, so it's "price" | "profile" | ...
        symbol: card.symbol,
        companyName: card.companyName,
        logoUrl: card.logoUrl,
        cardDataSnapshot: actualCardDataSnapshot, // This is now strictly ConcreteCardData
        rarityLevel: currentRarity, // From the destructuring of 'card'
        rarityReason: rarityReason, // From the destructuring of 'card'
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

      const snapshotId = await ensureGlobalSnapshot(cardToToggleLike);
      if (!snapshotId) return;

      if (cardToToggleLike.isLikedByCurrentUser) {
        try {
          const unlikeResponse = await fetch("/api/snapshots/like", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshotId }),
          });
          if (!unlikeResponse.ok && unlikeResponse.status !== 404) {
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
          setActiveCards((prev) =>
            prev.map((c, idx) =>
              idx === cardIndex
                ? {
                    ...c,
                    isLikedByCurrentUser: false,
                    currentUserLikeId: undefined,
                  }
                : c
            )
          );
        } catch (error: any) {
          toast({
            title: "Unlike Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
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
          toast({
            title: "Liked!",
            description: `You liked ${cardToToggleLike.symbol}.`,
          });
          setActiveCards((prev) =>
            prev.map((c, idx) =>
              idx === cardIndex
                ? {
                    ...c,
                    isLikedByCurrentUser: true,
                    currentUserLikeId: likeResult.like?.id,
                  }
                : c
            )
          );
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
        description: `Workspaceing details for ${cardForComment.symbol}...`,
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
      onShare: async (context: CardActionContext) => {
        const cardToShare = activeCards.find((c) => c.id === context.id);
        if (!cardToShare) {
          toast({
            title: "Error",
            description: "Card not found for sharing.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Generating Share Link...",
          description: `Please wait for ${cardToShare.symbol}.`,
        });
        const snapshotId = await ensureGlobalSnapshot(cardToShare);

        if (snapshotId) {
          const baseUrl =
            typeof window !== "undefined" ? window.location.origin : "";
          const shareUrl = `${baseUrl}/history/${cardToShare.symbol.toLowerCase()}/${cardToShare.type.toLowerCase()}?highlight_snapshot=${snapshotId}`;

          try {
            await navigator.clipboard.writeText(shareUrl);
            toast({
              title: "Link Copied!",
              description: (
                <div className="flex flex-col gap-1">
                  <span>Share link copied to clipboard.</span>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="mt-1 p-1 text-xs bg-muted border border-border rounded w-full"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              ),
              duration: 10000,
            });
          } catch (err) {
            console.error("Failed to copy share link:", err);
            toast({
              title: "Share Link (Manual Copy)",
              description: (
                <div className="flex flex-col gap-1">
                  <span>Please copy this link:</span>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="mt-1 p-1 text-xs bg-muted border border-border rounded w-full"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              ),
              duration: 15000,
              variant: "default",
            });
          }
        } else {
          toast({
            title: "Share Error",
            description: "Could not generate share link.",
            variant: "destructive",
          });
        }
      },
    }),
    [
      handleLikeOrUnlikeCard,
      handleCommentClick,
      handleCaptureCardToCollection,
      toast,
      activeCards,
      ensureGlobalSnapshot,
      pathname,
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
        cards={activeCards}
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
