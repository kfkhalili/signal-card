// src/components/history/SnapshotHistoryItem.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { CardSnapshotFromDB } from "@/app/history/[symbol]/[cardType]/page";
import GameCard from "@/components/game/GameCard";
import { InlineCommentSection } from "@/components/comments/InlineCommentSection";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "@/components/game/cards/base-card/base-card.types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
// Assuming LikeApiResponse is defined elsewhere or you define it here
// For now, let's assume it's:
interface LikeApiResponse {
  like: { id: string /* ...other fields */ };
  message: string;
  isAlreadyLiked?: boolean;
}

import { createClient } from "@/lib/supabase/client"; // Ensure SupabaseClient is imported

// Helper to adapt CardSnapshotFromDB to DisplayableCard for GameCard component
function adaptSnapshotToDisplayableCard(
  snapshot: CardSnapshotFromDB,
  isLikedByCurrentUser: boolean,
  currentUserLikeId?: string
): DisplayableCard {
  const concreteData = snapshot.card_data_snapshot as ConcreteCardData;
  if (snapshot.card_type !== concreteData.type) {
    console.warn(
      `[SnapshotHistoryItem ${snapshot.id}] adaptSnapshot: Type mismatch. Snapshot: ${snapshot.card_type}, Concrete: ${concreteData.type}. Using snapshot.card_type.`
    );
  }
  return {
    ...concreteData,
    id: snapshot.id,
    symbol: snapshot.symbol,
    companyName: snapshot.company_name,
    logoUrl: snapshot.logo_url,
    type: snapshot.card_type,
    createdAt: new Date(snapshot.first_seen_at).getTime(),
    isFlipped: false,
    currentRarity: snapshot.rarity_level,
    rarityReason: snapshot.rarity_reason,
    isLikedByCurrentUser: isLikedByCurrentUser,
    currentUserLikeId: currentUserLikeId,
  } as DisplayableCard;
}

interface SnapshotHistoryItemProps {
  snapshot: CardSnapshotFromDB;
  isHighlighted: boolean;
}

export const SnapshotHistoryItem: React.FC<SnapshotHistoryItemProps> = ({
  snapshot,
  isHighlighted,
}) => {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(isHighlighted);

  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(false);
  const [currentUserLikeId, setCurrentUserLikeId] = useState<
    string | undefined
  >(undefined);

  const [likeCount, setLikeCount] = useState<number>(snapshot.like_count);
  const [commentCount, setCommentCount] = useState<number>(
    snapshot.comment_count
  );
  const [collectionCount, setCollectionCount] = useState<number>(
    snapshot.collection_count
  );

  const [isLoadingLikeStatus, setIsLoadingLikeStatus] = useState(true);

  const { toast } = useToast();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const supabase = useMemo(() => createClient(), []); // Memoize Supabase client instance

  console.log(
    `[SnapshotHistoryItem ${snapshot.id}] Rendering. Initial prop counts - Likes: ${snapshot.like_count}, Comments: ${snapshot.comment_count}, Collections: ${snapshot.collection_count}. Current state likeCount: ${likeCount}`
  );

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!user || !snapshot.id || !supabase) {
        setIsLoadingLikeStatus(false);
        return;
      }
      console.log(
        `[SnapshotHistoryItem ${snapshot.id}] Fetching like status for user ${user.id}`
      );
      setIsLoadingLikeStatus(true);
      try {
        const { data, error } = await supabase
          .from("snapshot_likes")
          .select("id")
          .eq("snapshot_id", snapshot.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          console.log(
            `[SnapshotHistoryItem ${snapshot.id}] User HAS liked this. Like ID: ${data.id}`
          );
          setIsLikedByCurrentUser(true);
          setCurrentUserLikeId(data.id);
        } else {
          console.log(
            `[SnapshotHistoryItem ${snapshot.id}] User has NOT liked this.`
          );
          setIsLikedByCurrentUser(false);
          setCurrentUserLikeId(undefined);
        }
      } catch (error: any) {
        console.error(
          `[SnapshotHistoryItem ${snapshot.id}] Failed to fetch like status:`,
          error.message
        );
      } finally {
        setIsLoadingLikeStatus(false);
      }
    };
    fetchLikeStatus();
  }, [snapshot.id, user, supabase]);

  const handleToggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments((prev) => !prev);
  };

  const cardContextForSnapshot: CardActionContext = useMemo(
    () => ({
      id: snapshot.id,
      symbol: snapshot.symbol,
      type: snapshot.card_type,
      companyName: snapshot.company_name,
      logoUrl: snapshot.logo_url,
      websiteUrl: (snapshot.card_data_snapshot as any)?.staticData?.website,
    }),
    [snapshot]
  );

  const handleLikeOrUnlikeCard = useCallback(async () => {
    if (isLoadingAuth || !user || isLoadingLikeStatus) {
      toast({
        title: "Action unavailable",
        description: "Please wait or log in.",
        variant: "default",
      });
      console.log(
        `[SnapshotHistoryItem ${
          snapshot.id
        }] Like action blocked: isLoadingAuth=${isLoadingAuth}, !user=${!user}, isLoadingLikeStatus=${isLoadingLikeStatus}`
      );
      return;
    }

    const originalIsLiked = isLikedByCurrentUser;
    const originalLikeCount = likeCount;
    const originalCurrentUserLikeId = currentUserLikeId;

    console.log(
      `[SnapshotHistoryItem ${snapshot.id}] handleLikeOrUnlikeCard: originalIsLiked=${originalIsLiked}, originalLikeCount=${originalLikeCount}`
    );

    // Optimistic UI update
    setIsLikedByCurrentUser(!originalIsLiked);
    setCurrentUserLikeId(undefined); // Clear it, will be set if like is successful
    setLikeCount((prev) => {
      const newCount = originalIsLiked ? Math.max(0, prev - 1) : prev + 1;
      console.log(
        `[SnapshotHistoryItem ${snapshot.id}] Optimistically updating likeCount from ${prev} to ${newCount}`
      );
      return newCount;
    });

    if (originalIsLiked) {
      // --- UNLIKE ---
      console.log(`[SnapshotHistoryItem ${snapshot.id}] Attempting to UNLIKE.`);
      try {
        const { error } = await supabase
          .from("snapshot_likes")
          .delete()
          .eq("snapshot_id", snapshot.id)
          .eq("user_id", user.id);
        // If using API: await fetch(`/api/snapshots/like`, { method: 'DELETE', body: JSON.stringify({ snapshotId: snapshot.id }) });

        if (error) throw error;
        console.log(
          `[SnapshotHistoryItem ${snapshot.id}] UNLIKE successful in DB.`
        );
        toast({ title: "Unliked!", description: `Snapshot unliked.` });
        // setCurrentUserLikeId is already undefined
      } catch (error: any) {
        console.error(
          `[SnapshotHistoryItem ${snapshot.id}] UNLIKE failed in DB:`,
          error.message
        );
        toast({
          title: "Unlike Failed",
          description: error.message,
          variant: "destructive",
        });
        // Revert optimistic update
        setIsLikedByCurrentUser(originalIsLiked);
        setLikeCount(originalLikeCount);
        setCurrentUserLikeId(originalCurrentUserLikeId);
      }
    } else {
      // --- LIKE ---
      console.log(`[SnapshotHistoryItem ${snapshot.id}] Attempting to LIKE.`);
      try {
        const { data: newLike, error } = await supabase
          .from("snapshot_likes")
          .insert({ snapshot_id: snapshot.id, user_id: user.id })
          .select("id")
          .single();
        // If using API: const response = await fetch(`/api/snapshots/like`, { method: 'POST', body: JSON.stringify({ snapshotId: snapshot.id }) });
        // const likeResult = await response.json() as LikeApiResponse;
        // if (!response.ok) throw new Error(likeResult.message || 'Failed to like');
        // const newLikeId = likeResult.like.id;

        if (error) throw error;
        const newLikeId = newLike?.id;

        console.log(
          `[SnapshotHistoryItem ${snapshot.id}] LIKE successful in DB. New like ID: ${newLikeId}`
        );
        toast({ title: "Liked!", description: `Snapshot liked.` });
        if (newLikeId) setCurrentUserLikeId(newLikeId);
      } catch (error: any) {
        console.error(
          `[SnapshotHistoryItem ${snapshot.id}] LIKE failed in DB:`,
          error.message
        );
        toast({
          title: "Like Failed",
          description: error.message,
          variant: "destructive",
        });
        // Revert optimistic update
        setIsLikedByCurrentUser(originalIsLiked);
        setLikeCount(originalLikeCount);
        setCurrentUserLikeId(originalCurrentUserLikeId);
      }
    }
  }, [
    snapshot.id,
    user,
    isLoadingAuth,
    toast,
    isLikedByCurrentUser,
    likeCount,
    currentUserLikeId,
    supabase,
    isLoadingLikeStatus,
  ]);

  const handleAddToCollection = useCallback(async () => {
    if (isLoadingAuth || !user) {
      toast({ title: "Authentication Required", variant: "destructive" });
      return;
    }
    // Optimistic update for collection count can be added if you also fetch initial collection status
    // For now, just relying on toast and backend de-duplication.
    // const originalCollectionCount = collectionCount;

    toast({
      title: "Collecting Card...",
      description: `Saving snapshot ${snapshot.symbol}...`,
    });
    try {
      const addResponse = await fetch("/api/collections/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: snapshot.id }),
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
          description: `${snapshot.symbol} snapshot is already in your collection.`,
        });
      } else {
        toast({
          title: "Collected!",
          description: `${snapshot.symbol} snapshot added to your collection.`,
        });
        setCollectionCount((prev) => prev + 1); // Optimistic increment
      }
    } catch (error: any) {
      toast({
        title: "Collection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [
    snapshot.id,
    snapshot.symbol,
    user,
    isLoadingAuth,
    toast,
    collectionCount,
  ]); // Added collectionCount

  const socialInteractionsForSnapshot: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: (ctx) => setShowComments((prev) => !prev), // Toggles local state
      onSave: handleAddToCollection,
      onShare: () => {
        const shareUrl = `${
          window.location.origin
        }/history/${snapshot.symbol.toLowerCase()}/${snapshot.card_type.toLowerCase()}?highlight_snapshot=${
          snapshot.id
        }`;
        navigator.clipboard
          .writeText(shareUrl)
          .then(() =>
            toast({
              title: "Link Copied!",
              description: "Snapshot history link copied to clipboard.",
            })
          )
          .catch((err) =>
            toast({
              title: "Copy Failed",
              description: "Could not copy link.",
              variant: "destructive",
            })
          );
      },
    }),
    [
      handleLikeOrUnlikeCard,
      handleAddToCollection,
      snapshot.id,
      snapshot.symbol,
      snapshot.card_type,
      toast,
    ]
  );

  const displayableCard = useMemo(
    () =>
      adaptSnapshotToDisplayableCard(
        snapshot,
        isLikedByCurrentUser,
        currentUserLikeId
      ),
    [snapshot, isLikedByCurrentUser, currentUserLikeId]
  );

  const onCommentPosted = useCallback(() => {
    console.log(
      `[SnapshotHistoryItem ${snapshot.id}] Comment posted, incrementing comment count.`
    );
    setCommentCount((prev) => prev + 1);
  }, [snapshot.id]);

  if (isLoadingLikeStatus && user) {
    return (
      <div
        className={cn(
          "border-b pb-8 mb-8 flex items-center justify-center min-h-[400px]",
          isHighlighted && "ring-2 ring-primary rounded-lg p-4 shadow-lg"
        )}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Loading snapshot details...
        </span>
      </div>
    );
  }

  return (
    <div
      ref={itemRef}
      className={cn(
        "border-b pb-8 mb-8 last:border-b-0 last:pb-0 last:mb-0",
        isHighlighted && "ring-2 ring-primary rounded-lg p-4 shadow-lg"
      )}
      id={`snapshot-${snapshot.id}`}>
      <div className="mb-2 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Captured:{" "}
          {format(new Date(snapshot.first_seen_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
        <Button variant="ghost" size="sm" onClick={handleToggleComments}>
          <MessageSquare size={16} className="mr-2" />
          Comments
          {showComments ? (
            <ChevronUp size={16} className="ml-1" />
          ) : (
            <ChevronDown size={16} className="ml-1" />
          )}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <GameCard
            card={displayableCard}
            onToggleFlip={() =>
              toast({ title: "Flip action is disabled for history items." })
            }
            onDeleteCardRequest={() => {}} // Deletion not applicable
            socialInteractions={socialInteractionsForSnapshot}
            likeCount={likeCount}
            commentCount={commentCount}
            collectionCount={collectionCount}
          />
        </div>
        {showComments && (
          <div className="md:col-span-2">
            <InlineCommentSection
              snapshotId={snapshot.id}
              onCommentPosted={onCommentPosted}
            />
          </div>
        )}
      </div>
    </div>
  );
};
