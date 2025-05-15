// src/components/game/ActiveCardsSection.tsx
"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import type {
  DisplayableCard,
  ConcreteCardData,
  DisplayableCardState,
} from "./types";
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
import { createClient } from "@/lib/supabase/client"; // For client-side calls

// API Types (ensure these are accurate or imported from a shared location)
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
  snapshot: { id: string /* other fields */ };
  isNew: boolean;
  raceCondition?: boolean;
}

export interface LikeApiResponse {
  like: { id: string; snapshot_id: string; user_id: string; liked_at: string };
  message: string;
  isAlreadyLiked?: boolean;
}

// Type for the stats we'll fetch for a snapshot
interface SnapshotSocialStats {
  likeCount: number;
  commentCount: number;
  collectionCount: number;
  isLikedByCurrentUser: boolean;
  currentUserLikeId?: string;
  isSavedByCurrentUser: boolean;
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
  const supabase = useMemo(() => createClient(), []);

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] =
    useState<boolean>(false);
  const [commentingCardInfo, setCommentingCardInfo] =
    useState<CommentingCardInfo | null>(null);

  // Ensure ensureGlobalSnapshot is defined as before...
  const ensureGlobalSnapshot = useCallback(
    async (card: DisplayableCard): Promise<string | null> => {
      const {
        isFlipped,
        currentRarity,
        rarityReason,
        isLikedByCurrentUser,
        currentUserLikeId,
        likeCount,
        commentCount,
        collectionCount,
        isSavedByCurrentUser, // Exclude these new state fields
        ...restOfCardData
      } = card;

      let actualCardDataSnapshot: ConcreteCardData;
      if (card.type === "price") {
        const priceSpecificData = restOfCardData as any; // Cast carefully
        actualCardDataSnapshot = {
          id: priceSpecificData.id,
          type: "price",
          symbol: priceSpecificData.symbol,
          createdAt: priceSpecificData.createdAt,
          companyName: priceSpecificData.companyName,
          logoUrl: priceSpecificData.logoUrl,
          faceData: priceSpecificData.faceData,
          backData: priceSpecificData.backData,
        };
      } else if (card.type === "profile") {
        const profileSpecificData = restOfCardData as any; // Cast carefully
        actualCardDataSnapshot = {
          id: profileSpecificData.id,
          type: "profile",
          symbol: profileSpecificData.symbol,
          createdAt: profileSpecificData.createdAt,
          companyName: profileSpecificData.companyName,
          logoUrl: profileSpecificData.logoUrl,
          staticData: profileSpecificData.staticData,
          liveData: profileSpecificData.liveData,
          backData: profileSpecificData.backData,
          websiteUrl: profileSpecificData.websiteUrl,
        };
      } else {
        const unknownCardType = (card as any).type;
        console.error("Unknown card type for snapshot:", unknownCardType);
        toast({
          title: "Snapshot Error",
          description: `Unknown card type: ${unknownCardType}.`,
          variant: "destructive",
        });
        return null;
      }

      const requestBody: EnsureSnapshotRequestBody = {
        cardType: card.type,
        symbol: card.symbol,
        companyName: card.companyName,
        logoUrl: card.logoUrl,
        cardDataSnapshot: actualCardDataSnapshot,
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
        if (!response.ok)
          throw new Error(
            (result as any).error ||
              `Failed to ensure snapshot (status ${response.status})`
          );
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

  // New function to fetch all social stats for a snapshot
  const fetchSnapshotSocialStats = useCallback(
    async (
      snapshotId: string,
      currentUserId?: string
    ): Promise<SnapshotSocialStats | null> => {
      if (!supabase) return null;
      try {
        const [likes, comments, collections, userLike, userSave] =
          await Promise.all([
            supabase
              .from("snapshot_likes")
              .select("id", { count: "exact", head: true })
              .eq("snapshot_id", snapshotId),
            supabase
              .from("snapshot_comments")
              .select("id", { count: "exact", head: true })
              .eq("snapshot_id", snapshotId),
            supabase
              .from("user_collections")
              .select("id", { count: "exact", head: true })
              .eq("snapshot_id", snapshotId),
            currentUserId
              ? supabase
                  .from("snapshot_likes")
                  .select("id")
                  .eq("snapshot_id", snapshotId)
                  .eq("user_id", currentUserId)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            currentUserId
              ? supabase
                  .from("user_collections")
                  .select("id")
                  .eq("snapshot_id", snapshotId)
                  .eq("user_id", currentUserId)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

        if (likes.error)
          console.warn(
            `Error fetching like count for ${snapshotId}:`,
            likes.error.message
          );
        if (comments.error)
          console.warn(
            `Error fetching comment count for ${snapshotId}:`,
            comments.error.message
          );
        if (collections.error)
          console.warn(
            `Error fetching collection count for ${snapshotId}:`,
            collections.error.message
          );
        if (userLike.error)
          console.warn(
            `Error fetching user like for ${snapshotId}:`,
            userLike.error.message
          );
        if (userSave.error)
          console.warn(
            `Error fetching user save for ${snapshotId}:`,
            userSave.error.message
          );

        return {
          likeCount: likes.count || 0,
          commentCount: comments.count || 0,
          collectionCount: collections.count || 0,
          isLikedByCurrentUser: !!userLike.data,
          currentUserLikeId: userLike.data?.id,
          isSavedByCurrentUser: !!userSave.data,
        };
      } catch (error) {
        console.error(
          `Error fetching social stats for snapshot ${snapshotId}:`,
          error
        );
        toast({
          title: "Stats Error",
          description: "Could not fetch latest social stats.",
          variant: "destructive",
        });
        return null;
      }
    },
    [supabase, toast]
  );

  // --- Modified Interaction Handlers ---

  const handleLikeOrUnlikeCard = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth || !user) {
        /* ... auth check ... */ return;
      }
      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        /* ... card not found ... */ return;
      }

      const cardToToggleLike = activeCards[cardIndex];
      const snapshotId = await ensureGlobalSnapshot(cardToToggleLike);
      if (!snapshotId) return;

      const originalIsLiked = cardToToggleLike.isLikedByCurrentUser;
      const apiCall = originalIsLiked
        ? fetch("/api/snapshots/like", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshotId }),
          })
        : fetch("/api/snapshots/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshotId }),
          });

      try {
        const response = await apiCall;
        const result = await response.json();
        if (
          !response.ok &&
          !(
            response.status === 200 &&
            (result as LikeApiResponse).isAlreadyLiked
          ) &&
          response.status !== 404
        ) {
          throw new Error(
            (result as any).error ||
              `Like/Unlike failed (status ${response.status})`
          );
        }

        toast({
          title: originalIsLiked ? "Unliked!" : "Liked!",
          description: `You ${originalIsLiked ? "unliked" : "liked"} ${
            cardToToggleLike.symbol
          }.`,
        });

        // Fetch all stats and update card
        const stats = await fetchSnapshotSocialStats(snapshotId, user.id);
        if (stats) {
          setActiveCards((prev) =>
            prev.map((c, idx) => (idx === cardIndex ? { ...c, ...stats } : c))
          );
        } else {
          // Fallback if stats fetch fails, just toggle local like state
          setActiveCards((prev) =>
            prev.map((c, idx) =>
              idx === cardIndex
                ? {
                    ...c,
                    isLikedByCurrentUser: !originalIsLiked,
                    currentUserLikeId: originalIsLiked
                      ? undefined
                      : (result as LikeApiResponse).like?.id,
                  }
                : c
            )
          );
        }
      } catch (error: any) {
        toast({
          title: originalIsLiked ? "Unlike Failed" : "Like Failed",
          description: error.message,
          variant: "destructive",
        });
        // No explicit revert here, as fetchSnapshotSocialStats will provide the source of truth or we use a simpler toggle.
      }
    },
    [
      activeCards,
      user,
      isLoadingAuth,
      toast,
      ensureGlobalSnapshot,
      setActiveCards,
      fetchSnapshotSocialStats,
    ]
  );

  const handleCaptureCardToCollection = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth || !user) {
        /* ... auth check ... */ return;
      }
      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        /* ... card not found ... */ return;
      }

      const cardToCollect = activeCards[cardIndex];
      const snapshotId = await ensureGlobalSnapshot(cardToCollect);
      if (!snapshotId) return;

      toast({
        title: "Saving to Collection...",
        description: `Snapshot for ${cardToCollect.symbol}...`,
      });
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

        toast({
          title: addResult.message?.includes("already in collection")
            ? "Already Collected"
            : "Collected!",
          description: `${cardToCollect.symbol} ${
            addResult.message?.includes("already in collection")
              ? "is already"
              : "added to"
          } your collection.`,
        });

        // Fetch all stats and update card
        const stats = await fetchSnapshotSocialStats(snapshotId, user.id);
        if (stats) {
          setActiveCards((prev) =>
            prev.map((c, idx) => (idx === cardIndex ? { ...c, ...stats } : c))
          );
        } else {
          // Fallback if stats fetch fails
          setActiveCards(
            (prev) =>
              prev.map((c, idx) =>
                idx === cardIndex ? { ...c, isSavedByCurrentUser: true } : c
              ) // Simple optimistic
          );
        }
      } catch (error: any) {
        toast({
          title: "Collection Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [
      activeCards,
      user,
      isLoadingAuth,
      toast,
      ensureGlobalSnapshot,
      setActiveCards,
      fetchSnapshotSocialStats,
    ]
  );

  const handleCommentClick = useCallback(
    async (context: CardActionContext) => {
      if (!user) {
        /* ... auth check ... */ return;
      }
      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        /* ... card not found ... */ return;
      }

      const cardForComment = activeCards[cardIndex];
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
        // Optionally, fetch and update comment count for this card here too
        const stats = await fetchSnapshotSocialStats(snapshotId, user.id);
        if (stats) {
          setActiveCards((prev) =>
            prev.map((c, idx) =>
              idx === cardIndex ? { ...c, commentCount: stats.commentCount } : c
            )
          );
        }
      } else {
        toast({
          title: "Error",
          description: "Could not prepare comment section.",
          variant: "destructive",
        });
      }
    },
    [
      user,
      activeCards,
      toast,
      ensureGlobalSnapshot,
      setActiveCards,
      fetchSnapshotSocialStats,
    ]
  );

  // This callback is for when a comment is successfully posted from CommentDialog
  // We need to update the specific card's comment count.
  const onCommentDialogPosted = async (targetSnapshotId: string) => {
    const stats = await fetchSnapshotSocialStats(targetSnapshotId, user?.id);
    if (stats) {
      setActiveCards((prev) =>
        prev.map((c) => {
          // This assumes the card ID in activeCards might not be the snapshot ID
          // If we ensure it IS the snapshot ID after ensureGlobalSnapshot, this logic can be simpler.
          // For now, we re-fetch stats for the specific snapshotId.
          // A better way would be to find the card in activeCards that corresponds to this snapshotId
          // if its ID was updated to be the snapshotId.
          // This part needs careful consideration of how card IDs are managed vs snapshot IDs.

          // Let's assume for now that after ensureGlobalSnapshot, the card's ID in activeCards
          // might still be its original workspace ID, not necessarily the snapshotId.
          // So, we'll just refetch stats for the snapshotId and apply it to the card that opened the dialog.
          // This is a simplification. A more robust solution would map workspace card IDs to snapshot IDs.
          if (
            commentingCardInfo &&
            commentingCardInfo.snapshotId === targetSnapshotId
          ) {
            const cardIndex = activeCards.findIndex(
              (ac) =>
                ac.symbol === commentingCardInfo.symbol &&
                ac.type === (commentingCardInfo.name ? "profile" : "price")
            ); // This is a guess
            if (cardIndex !== -1) {
              return {
                ...activeCards[cardIndex],
                commentCount: stats.commentCount,
              };
            }
          }
          return c; // Fallback
        })
      );
    }
  };

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: handleCommentClick,
      onSave: handleCaptureCardToCollection,
      onShare: async (context: CardActionContext) => {
        // ... (share logic as before, using ensureGlobalSnapshot)
        const cardToShare = activeCards.find((c) => c.id === context.id);
        if (!cardToShare) {
          /* ... */ return;
        }
        toast({ title: "Generating Share Link..." });
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
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="mt-1 p-1 text-xs bg-muted border rounded w-full"
                  onFocus={(e) => e.target.select()}
                />
              ),
              duration: 10000,
            });
          } catch (err) {
            toast({
              title: "Share Link (Manual Copy)",
              description: (
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="mt-1 p-1 text-xs bg-muted border rounded w-full"
                  onFocus={(e) => e.target.select()}
                />
              ),
              duration: 15000,
              variant: "default",
            });
          }
        } else {
          toast({ title: "Share Error", variant: "destructive" });
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
      pathname /* fetchSnapshotSocialStats is part of handlers */,
    ]
  );

  const finalPriceSpecificInteractions =
    priceSpecificInteractions ||
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);
  const finalProfileSpecificInteractions =
    profileSpecificInteractions ||
    useMemo(() => getProfileCardInteractionHandlers(toast), [toast]);

  // The rest of the component (delete confirmation, Presentational component) remains the same
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
            if (!isOpen) {
              // When dialog closes, if a comment was made, the count might need refresh
              // The CommentDialog's internal onSubmitComment could call a prop function
              // that then triggers a stats refresh for the specific snapshotId here.
              // For now, we rely on the next interaction or page load for history view.
              // For workspace, we'd need to update the activeCard.
              if (commentingCardInfo.snapshotId) {
                // Check if snapshotId exists
                onCommentDialogPosted(commentingCardInfo.snapshotId);
              }
              setCommentingCardInfo(null);
            }
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
