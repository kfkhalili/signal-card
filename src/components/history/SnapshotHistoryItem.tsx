// src/components/history/SnapshotHistoryItem.tsx
// NEW FILE
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { CardSnapshotFromDB } from "@/app/history/[symbol]/[cardType]/page";
import GameCard from "@/components/game/GameCard";
import { InlineCommentSection } from "@/components/comments/InlineCommentSection";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast"; // Assuming this is your app's toast hook
import { useAuth } from "@/contexts/AuthContext"; // Assuming this is your auth context
import {
  EnsureSnapshotRequestBody,
  SnapshotEnsureResponse,
  LikeApiResponse,
} from "@/components/game/ActiveCardsSection"; // Import types from ActiveCardsSection

// Helper to adapt CardSnapshotFromDB to DisplayableCard for GameCard component
function adaptSnapshotToDisplayableCard(
  snapshot: CardSnapshotFromDB,
  isLiked: boolean, // Pass the liked state
  likeId?: string // Pass the likeId
): DisplayableCard {
  const concreteData = snapshot.card_data_snapshot as ConcreteCardData;

  // Make sure the type from snapshot.card_type matches concreteData.type
  // This is important if card_data_snapshot might not perfectly reflect the outer type
  if (snapshot.card_type !== concreteData.type) {
    console.warn(
      `Snapshot ${snapshot.id} type mismatch: snapshot.card_type is ${snapshot.card_type}, but concreteData.type is ${concreteData.type}. Using snapshot.card_type.`
    );
  }

  return {
    ...concreteData, // Spread ConcreteCardData first
    id: snapshot.id, // Override id with snapshot_id
    symbol: snapshot.symbol,
    companyName: snapshot.company_name,
    logoUrl: snapshot.logo_url,
    type: snapshot.card_type, // Use the explicit card_type from the snapshot record
    createdAt: new Date(snapshot.first_seen_at).getTime(),
    isFlipped: false, // Default, can be managed by local state if flippability is desired here
    currentRarity: snapshot.rarity_level,
    rarityReason: snapshot.rarity_reason,
    isLikedByCurrentUser: isLiked,
    currentUserLikeId: likeId,
    // backData might need specific handling if it's not fully part of concreteData
    // For ProfileCard, backData is generic. For PriceCard, it's part of concreteData.
    // Ensure this merging strategy is correct for all card types.
  } as DisplayableCard; // Type assertion
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
  const [showComments, setShowComments] = useState(isHighlighted); // Show comments if highlighted
  const [isLiked, setIsLiked] = useState(false); // Local like state for this snapshot
  const [likeId, setLikeId] = useState<string | undefined>(undefined);
  // TODO: Fetch initial like state for this snapshot ID and current user

  const { toast } = useToast();
  const { user, isLoading: isLoadingAuth } = useAuth();

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  // TODO: Implement fetching initial like status for the snapshot
  // useEffect(() => {
  //   const fetchLikeStatus = async () => {
  //     if (!user || !snapshot.id) return;
  //     // API call to check if user liked this snapshot.id
  //     // const { data, error } = await supabase.from('snapshot_likes')...
  //     // setIsLiked(data.isLiked);
  //     // setLikeId(data.likeId);
  //   };
  //   fetchLikeStatus();
  // }, [snapshot.id, user]);

  const handleToggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments((prev) => !prev);
  };

  const cardContextForSnapshot: CardActionContext = useMemo(
    () => ({
      id: snapshot.id, // Use snapshot ID for context
      symbol: snapshot.symbol,
      type: snapshot.card_type,
      companyName: snapshot.company_name,
      logoUrl: snapshot.logo_url,
      // websiteUrl might not be directly on snapshot, depends on card_type and data
      websiteUrl: (snapshot.card_data_snapshot as any)?.staticData?.website,
    }),
    [snapshot]
  );

  const handleLikeOrUnlikeCard = useCallback(async () => {
    if (isLoadingAuth || !user) {
      toast({ title: "Authentication Required", variant: "destructive" });
      return;
    }

    // For a history item, the snapshotId *is* snapshot.id
    const currentSnapshotId = snapshot.id;

    if (isLiked) {
      // Try to unlike
      try {
        const unlikeResponse = await fetch("/api/snapshots/like", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: currentSnapshotId }),
        });
        if (!unlikeResponse.ok && unlikeResponse.status !== 404) {
          const errorResult = await unlikeResponse.json();
          throw new Error(
            errorResult.error ||
              `Failed to unlike (status ${unlikeResponse.status})`
          );
        }
        toast({ title: "Unliked!", description: `Snapshot unliked.` });
        setIsLiked(false);
        setLikeId(undefined);
      } catch (error: any) {
        toast({
          title: "Unlike Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Try to like
      try {
        const likeResponse = await fetch("/api/snapshots/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: currentSnapshotId }),
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
        toast({ title: "Liked!", description: `Snapshot liked.` });
        setIsLiked(true);
        setLikeId(likeResult.like?.id);
      } catch (error: any) {
        toast({
          title: "Like Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }, [snapshot.id, user, isLoadingAuth, toast, isLiked, likeId]);

  const handleAddToCollection = useCallback(async () => {
    if (isLoadingAuth || !user) {
      toast({ title: "Authentication Required", variant: "destructive" });
      return;
    }
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
      }
    } catch (error: any) {
      toast({
        title: "Collection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [snapshot.id, snapshot.symbol, user, isLoadingAuth, toast]);

  const socialInteractionsForSnapshot: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: (ctx) => {
        // Clicking comment on the card in history could toggle the inline comment section
        // Or, if you want to keep CommentDialog, it can be invoked here too.
        // For inline, ensure the context (snapshot.id) is used by InlineCommentSection.
        setShowComments((prev) => !prev);
        toast({
          title: "Toggle Comments",
          description: `Toggled comments for snapshot.`,
        });
      },
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
    () => adaptSnapshotToDisplayableCard(snapshot, isLiked, likeId),
    [snapshot, isLiked, likeId]
  );

  return (
    <div
      ref={itemRef}
      className={cn(
        "border-b pb-8 mb-8",
        isHighlighted && "ring-2 ring-primary rounded-lg p-4 shadow-lg"
      )}
      id={`snapshot-${snapshot.id}`}>
      <div className="mb-2 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Captured: {format(new Date(snapshot.first_seen_at), "PPpp")}
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
          {/* GameCard expects a DisplayableCard, adapt snapshot data */}
          <GameCard
            card={displayableCard}
            onToggleFlip={() => {
              /* Flipping might be disabled or handled locally for history view */
              toast({ title: "Flip in history view?" });
            }}
            onDeleteCardRequest={() => {
              /* Deletion not applicable here */
            }}
            socialInteractions={socialInteractionsForSnapshot}
            // Pass other specific interactions if needed by GameCard structure
          />
        </div>
        {showComments && (
          <div className="md:col-span-2">
            <InlineCommentSection snapshotId={snapshot.id} />
          </div>
        )}
      </div>
    </div>
  );
};
