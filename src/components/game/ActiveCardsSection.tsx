// src/components/game/ActiveCardsSection.tsx
"use client";

import React, { useCallback, useState, useMemo } from "react";
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
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";
import { useAuth } from "@/contexts/AuthContext";
import { CommentDialog } from "@/components/comments/CommentDialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  snapshot: { id: string };
  isNew: boolean;
  raceCondition?: boolean;
}

export interface LikeApiResponse {
  like: { id: string; snapshot_id: string; user_id: string; liked_at: string };
  message: string;
  isAlreadyLiked?: boolean;
}

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
  workspaceCardId: string;
  type: APICardType;
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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] =
    useState<boolean>(false);
  const [commentingCardInfo, setCommentingCardInfo] =
    useState<CommentingCardInfo | null>(null);

  const ensureGlobalSnapshot = useCallback(
    async (card: DisplayableCard): Promise<string | null> => {
      const { currentRarity, rarityReason, ...restOfCardData } = card;

      let actualCardDataSnapshot: ConcreteCardData;
      if (card.type === "price") {
        const priceSpecificData = restOfCardData as any;
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
        const profileSpecificData = restOfCardData as any;
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
              .select("id", { count: "exact", head: true }) // Fetching count of user_collections entries for this snapshot
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
              ? supabase // Check if this user has this snapshot in their collection
                  .from("user_collections")
                  .select("id") // just need to know if it exists
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
          isSavedByCurrentUser: !!userSave.data, // True if userSave.data exists
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

  const handleLikeOrUnlikeCard = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth || !user) {
        toast({
          title: "Please log in to like cards.",
          variant: "destructive",
        });
        return;
      }
      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        toast({ title: "Card not found.", variant: "destructive" });
        return;
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

        const stats = await fetchSnapshotSocialStats(snapshotId, user.id);
        if (stats) {
          setActiveCards((prev) =>
            prev.map((c) => (c.id === context.id ? { ...c, ...stats } : c))
          );
        } else {
          // Fallback optimistic update
          setActiveCards((prev) =>
            prev.map((c) =>
              c.id === context.id
                ? {
                    ...c,
                    isLikedByCurrentUser: !originalIsLiked,
                    currentUserLikeId: originalIsLiked
                      ? undefined
                      : (result as LikeApiResponse).like?.id,
                    likeCount: originalIsLiked
                      ? Math.max(0, (c.likeCount || 1) - 1)
                      : (c.likeCount || 0) + 1,
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

  const handleToggleSaveToCollection = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth || !user) {
        toast({
          title: "Please log in to manage collections.",
          variant: "destructive",
        });
        return;
      }
      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        toast({ title: "Card not found.", variant: "destructive" });
        return;
      }

      const cardToToggleSave = activeCards[cardIndex];
      const snapshotId = await ensureGlobalSnapshot(cardToToggleSave);
      if (!snapshotId) return;

      const originalIsSaved = cardToToggleSave.isSavedByCurrentUser;

      if (originalIsSaved) {
        // UN-SAVE card from collection
        toast({
          title: "Removing from Collection...",
          description: `Snapshot for ${cardToToggleSave.symbol}...`,
        });
        try {
          // We need the user_collections.id to delete.
          // Since we don't store it on the activeCard, we first fetch it.
          const { data: collectionEntry, error: fetchError } = await supabase
            .from("user_collections")
            .select("id")
            .eq("user_id", user.id)
            .eq("snapshot_id", snapshotId)
            .single();

          if (fetchError || !collectionEntry) {
            throw new Error(
              fetchError?.message ||
                "Could not find card in collection to remove."
            );
          }

          const removeResponse = await fetch(
            `/api/collections/remove/${collectionEntry.id}`,
            {
              method: "DELETE",
            }
          );
          const removeResult = await removeResponse.json();
          if (!removeResponse.ok) {
            throw new Error(
              removeResult.error ||
                `Failed to remove from collection (status ${removeResponse.status})`
            );
          }
          toast({
            title: "Removed!",
            description: `${cardToToggleSave.symbol} removed from your collection.`,
          });
        } catch (error: any) {
          toast({
            title: "Removal Failed",
            description: error.message,
            variant: "destructive",
          });
          // No optimistic update for removal error, rely on fetchSnapshotSocialStats to correct
        }
      } else {
        // SAVE card to collection
        toast({
          title: "Saving to Collection...",
          description: `Snapshot for ${cardToToggleSave.symbol}...`,
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
            description: `${cardToToggleSave.symbol} ${
              addResult.message?.includes("already in collection")
                ? "is already"
                : "added to"
            } your collection.`,
          });
        } catch (error: any) {
          toast({
            title: "Collection Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }

      // Always refetch stats to update UI correctly
      const stats = await fetchSnapshotSocialStats(snapshotId, user.id);
      if (stats) {
        setActiveCards((prev) =>
          prev.map((c) => (c.id === context.id ? { ...c, ...stats } : c))
        );
      } else {
        // Fallback optimistic update (less reliable for counts but ok for boolean)
        setActiveCards((prev) =>
          prev.map((c) =>
            c.id === context.id
              ? {
                  ...c,
                  isSavedByCurrentUser: !originalIsSaved,
                  collectionCount: originalIsSaved
                    ? Math.max(0, (c.collectionCount || 1) - 1)
                    : (c.collectionCount || 0) + 1,
                }
              : c
          )
        );
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
      supabase,
    ]
  );

  const handleCommentClick = useCallback(
    async (context: CardActionContext) => {
      if (!user) {
        toast({ title: "Please log in to comment.", variant: "destructive" });
        return;
      }
      const cardIndex = activeCards.findIndex((c) => c.id === context.id);
      if (cardIndex === -1) {
        toast({ title: "Card not found.", variant: "destructive" });
        return;
      }

      const cardForComment = activeCards[cardIndex];
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
          workspaceCardId: cardForComment.id,
          type: cardForComment.type,
        });
        setIsCommentDialogOpen(true);

        const stats = await fetchSnapshotSocialStats(snapshotId, user.id);
        if (stats) {
          setActiveCards((prev) =>
            prev.map((c) =>
              c.id === context.id
                ? { ...c, commentCount: stats.commentCount }
                : c
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

  const onCommentDialogPosted = useCallback(
    async (targetSnapshotId: string, commentedWorkspaceCardId: string) => {
      const stats = await fetchSnapshotSocialStats(targetSnapshotId, user?.id);
      if (stats) {
        setActiveCards((prevCards) =>
          prevCards.map((card) => {
            if (card.id === commentedWorkspaceCardId) {
              return { ...card, commentCount: stats.commentCount };
            }
            return card;
          })
        );
      }
    },
    [user, setActiveCards, fetchSnapshotSocialStats]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: handleCommentClick,
      onSave: handleToggleSaveToCollection, // Use the new toggle save function
      onShare: async (context: CardActionContext) => {
        const cardToShare = activeCards.find((c) => c.id === context.id);
        if (!cardToShare) {
          toast({
            title: "Card not found for sharing.",
            variant: "destructive",
          });
          return;
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
          } catch {
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
          toast({
            title: "Share Error: Could not create snapshot.",
            variant: "destructive",
          });
        }
      },
    }),
    [
      handleLikeOrUnlikeCard,
      handleCommentClick,
      handleToggleSaveToCollection,
      toast,
      activeCards,
      ensureGlobalSnapshot,
    ]
  );

  const finalPriceSpecificInteractions =
    priceSpecificInteractions ||
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);
  const finalProfileSpecificInteractions =
    profileSpecificInteractions ||
    useMemo(() => getProfileCardInteractionHandlers(toast), [toast]);

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

  // Determine if the current page is /history for disabling save
  const isHistoryPage = pathname.startsWith("/history");

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
        socialInteractions={
          isHistoryPage
            ? {
                ...socialInteractionsForCards,
                onSave: undefined, // Disable save on history page
              }
            : socialInteractionsForCards
        }
        priceSpecificInteractions={finalPriceSpecificInteractions}
        profileSpecificInteractions={finalProfileSpecificInteractions}
        onHeaderIdentityClick={onHeaderIdentityClick}
        cardIdToConfirmDelete={cardIdToConfirmDelete}
        onConfirmDeletion={confirmDeletion}
        onCancelDeletion={cancelDeletion}
        isSaveDisabled={isHistoryPage} // Explicit prop to disable save button rendering
      />
      {commentingCardInfo && (
        <CommentDialog
          isOpen={isCommentDialogOpen}
          onOpenChange={(isOpenValue) => {
            setIsCommentDialogOpen(isOpenValue);
            if (!isOpenValue) {
              if (
                commentingCardInfo.snapshotId &&
                commentingCardInfo.workspaceCardId
              ) {
                onCommentDialogPosted(
                  commentingCardInfo.snapshotId,
                  commentingCardInfo.workspaceCardId
                );
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
