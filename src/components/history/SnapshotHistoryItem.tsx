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
import { createClient } from "@/lib/supabase/client";

// Assuming LikeApiResponse is defined elsewhere or as:
interface LikeApiResponse {
  like: { id: string /* ...other fields */ };
  message: string;
  isAlreadyLiked?: boolean;
}

// Adapt snapshot to DisplayableCard
function adaptSnapshotToDisplayableCard(
  snapshot: CardSnapshotFromDB, // Includes counts from server
  isLikedByCurrentUserState: boolean,
  isSavedByCurrentUserState: boolean,
  currentUserLikeIdState?: string
): DisplayableCard {
  const concreteData = snapshot.card_data_snapshot as ConcreteCardData;
  if (snapshot.card_type !== concreteData.type) {
    console.warn(
      `[SnapshotHistoryItem ${snapshot.id}] adaptSnapshot: Type mismatch. Snapshot: ${snapshot.card_type}, Concrete: ${concreteData.type}. Using snapshot.card_type.`
    );
  }
  return {
    ...concreteData,
    id: snapshot.id, // This is the snapshot_id
    symbol: snapshot.symbol,
    companyName: snapshot.company_name,
    logoUrl: snapshot.logo_url,
    type: snapshot.card_type,
    createdAt: new Date(snapshot.first_seen_at).getTime(),
    isFlipped: false, // History items are not flipped by default
    currentRarity: snapshot.rarity_level,
    rarityReason: snapshot.rarity_reason,
    // Pass the local state for these UI-affecting properties
    isLikedByCurrentUser: isLikedByCurrentUserState,
    currentUserLikeId: currentUserLikeIdState,
    isSavedByCurrentUser: isSavedByCurrentUserState, // Pass this down
    // Global counts come from the snapshot prop directly
    likeCount: snapshot.like_count,
    commentCount: snapshot.comment_count,
    collectionCount: snapshot.collection_count,
  } as DisplayableCard;
}

interface SnapshotHistoryItemProps {
  snapshot: CardSnapshotFromDB; // This prop now includes pre-fetched global counts
  isHighlighted: boolean;
}

export const SnapshotHistoryItem: React.FC<SnapshotHistoryItemProps> = ({
  snapshot,
  isHighlighted,
}) => {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(isHighlighted);

  // Local state for current user's interaction status with *this specific snapshot*
  const [isLikedByCurrentUserLocal, setIsLikedByCurrentUserLocal] =
    useState(false);
  const [currentUserLikeIdLocal, setCurrentUserLikeIdLocal] = useState<
    string | undefined
  >(undefined);
  const [isSavedByCurrentUserLocal, setIsSavedByCurrentUserLocal] =
    useState(false);

  // Local state for counts, initialized from props, can be updated optimistically
  const [likeCountLocal, setLikeCountLocal] = useState<number>(
    snapshot.like_count
  );
  const [commentCountLocal, setCommentCountLocal] = useState<number>(
    snapshot.comment_count
  );
  const [collectionCountLocal, setCollectionCountLocal] = useState<number>(
    snapshot.collection_count
  );

  const [isLoadingSocialStatus, setIsLoadingSocialStatus] = useState(true);

  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  // Fetch initial like and save status for this specific snapshot and user
  useEffect(() => {
    const fetchSocialStatus = async () => {
      if (!user || !snapshot.id || !supabase) {
        setIsLoadingSocialStatus(false);
        return;
      }
      setIsLoadingSocialStatus(true);
      try {
        const [userLikeResult, userSaveResult] = await Promise.all([
          supabase
            .from("snapshot_likes")
            .select("id")
            .eq("snapshot_id", snapshot.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_collections")
            .select("id")
            .eq("snapshot_id", snapshot.id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (userLikeResult.error) throw userLikeResult.error;
        if (userLikeResult.data) {
          setIsLikedByCurrentUserLocal(true);
          setCurrentUserLikeIdLocal(userLikeResult.data.id);
        } else {
          setIsLikedByCurrentUserLocal(false);
          setCurrentUserLikeIdLocal(undefined);
        }

        if (userSaveResult.error) throw userSaveResult.error;
        setIsSavedByCurrentUserLocal(!!userSaveResult.data);
      } catch (error: any) {
        console.error(
          `[SnapshotHistoryItem ${snapshot.id}] Failed to fetch social status:`,
          error.message
        );
      } finally {
        setIsLoadingSocialStatus(false);
      }
    };
    fetchSocialStatus();
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
    if (!user || isLoadingSocialStatus) {
      /* ... */ return;
    }

    const originalIsLiked = isLikedByCurrentUserLocal;
    const originalLikeCount = likeCountLocal;

    setIsLikedByCurrentUserLocal(!originalIsLiked);
    setLikeCountLocal((prev) =>
      originalIsLiked ? Math.max(0, prev - 1) : prev + 1
    );
    if (originalIsLiked) setCurrentUserLikeIdLocal(undefined);

    if (originalIsLiked) {
      try {
        const { error } = await supabase
          .from("snapshot_likes")
          .delete()
          .match({ snapshot_id: snapshot.id, user_id: user.id });
        if (error) throw error;
        toast({ title: "Unliked!" });
      } catch (error: any) {
        toast({ title: "Unlike Failed", variant: "destructive" });
        setIsLikedByCurrentUserLocal(originalIsLiked);
        setLikeCountLocal(originalLikeCount);
      }
    } else {
      try {
        const { data: newLike, error } = await supabase
          .from("snapshot_likes")
          .insert({ snapshot_id: snapshot.id, user_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        toast({ title: "Liked!" });
        if (newLike) setCurrentUserLikeIdLocal(newLike.id);
      } catch (error: any) {
        toast({ title: "Like Failed", variant: "destructive" });
        setIsLikedByCurrentUserLocal(originalIsLiked);
        setLikeCountLocal(originalLikeCount);
      }
    }
  }, [
    snapshot.id,
    user,
    toast,
    isLikedByCurrentUserLocal,
    likeCountLocal,
    supabase,
    isLoadingSocialStatus,
  ]);

  const handleToggleSaveToCollection = useCallback(async () => {
    if (!user || isLoadingSocialStatus) {
      /* ... */ return;
    }

    const originalIsSaved = isSavedByCurrentUserLocal;
    const originalCollectionCount = collectionCountLocal;

    setIsSavedByCurrentUserLocal(!originalIsSaved);
    setCollectionCountLocal((prev) =>
      originalIsSaved ? Math.max(0, prev - 1) : prev + 1
    );

    if (originalIsSaved) {
      // Attempt to UN-SAVE
      toast({ title: "Removing from Collection..." });
      try {
        const { error } = await supabase
          .from("user_collections")
          .delete()
          .match({ snapshot_id: snapshot.id, user_id: user.id });
        if (error) throw error;
        toast({
          title: "Removed!",
          description: `${snapshot.symbol} removed from collection.`,
        });
      } catch (error: any) {
        toast({
          title: "Removal Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsSavedByCurrentUserLocal(originalIsSaved); // Revert
        setCollectionCountLocal(originalCollectionCount); // Revert
      }
    } else {
      // Attempt to SAVE
      toast({ title: "Saving to Collection..." });
      try {
        const { error } = await supabase
          .from("user_collections")
          .insert({ snapshot_id: snapshot.id, user_id: user.id });
        // The API /api/collections/add handles de-duplication with a unique constraint.
        // If calling that API:
        // const addResponse = await fetch("/api/collections/add", { /* ... */ });
        // const addResult = await addResponse.json();
        // if (!addResponse.ok) throw new Error(addResult.error);
        if (error) {
          // This handles unique constraint violation from direct insert gracefully
          if (error.code === "23505") {
            // Unique violation
            toast({
              title: "Already Saved",
              description: "This snapshot is already in your collection.",
            });
            // Ensure state is correct if it was a race condition
            setIsSavedByCurrentUserLocal(true);
            // Count might not need changing if it was already saved
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Collected!",
            description: `${snapshot.symbol} added to collection.`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Collection Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsSavedByCurrentUserLocal(originalIsSaved); // Revert
        setCollectionCountLocal(originalCollectionCount); // Revert
      }
    }
  }, [
    snapshot.id,
    snapshot.symbol,
    user,
    toast,
    collectionCountLocal,
    isSavedByCurrentUserLocal,
    supabase,
    isLoadingSocialStatus,
  ]);

  const socialInteractionsForSnapshot: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: (ctx) => setShowComments((prev) => !prev),
      onSave: handleToggleSaveToCollection, // Use the new toggle function
      onShare: () => {
        /* ... share logic ... */
      },
    }),
    [
      handleLikeOrUnlikeCard,
      handleToggleSaveToCollection,
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
        isLikedByCurrentUserLocal,
        isSavedByCurrentUserLocal,
        currentUserLikeIdLocal
      ),
    [
      snapshot,
      isLikedByCurrentUserLocal,
      isSavedByCurrentUserLocal,
      currentUserLikeIdLocal,
    ]
  );

  const onCommentPosted = useCallback(() => {
    setCommentCountLocal((prev) => prev + 1);
  }, []);

  if (isLoadingSocialStatus && user) {
    return (
      <div
        className={cn(
          "border-b pb-8 mb-8 flex items-center justify-center min-h-[400px]",
          isHighlighted && "ring-2 ring-primary rounded-lg p-4 shadow-lg"
        )}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading details...</span>
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
          <MessageSquare size={16} className="mr-2" /> Comments
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
            card={displayableCard} // This now gets updated isLikedByCurrentUser and isSavedByCurrentUser
            onToggleFlip={() =>
              toast({ title: "Flip action is disabled for history items." })
            }
            onDeleteCardRequest={() => {}}
            socialInteractions={socialInteractionsForSnapshot}
            // Pass local state counts to GameCard
            likeCount={likeCountLocal}
            commentCount={commentCountLocal}
            collectionCount={collectionCountLocal}
            // Pass local state for save status to GameCard
            isSavedByCurrentUser={isSavedByCurrentUserLocal}
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
