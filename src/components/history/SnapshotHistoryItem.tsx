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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface LikeApiResponse {
  like: { id: string };
  message: string;
  isAlreadyLiked?: boolean;
}

// Use the generated type for the RPC response.
// If `get_snapshot_social_counts` in database.types.ts has Returns as an array (e.g. `SomeType[]`),
// then this should be `Database["public"]["Functions"]["get_snapshot_social_counts"]["Returns"][0]` for a single row type,
// or just use `Database["public"]["Functions"]["get_snapshot_social_counts"]["Returns"]` if you expect an array.
// Since our function `RETURNS TABLE` with one row, the generated `Returns` is likely `TYPE[]`.

function adaptSnapshotToDisplayableCard(
  snapshot: CardSnapshotFromDB,
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
    id: snapshot.id,
    symbol: snapshot.symbol,
    companyName: snapshot.company_name,
    logoUrl: snapshot.logo_url,
    type: snapshot.card_type,
    createdAt: new Date(snapshot.first_seen_at).getTime(),
    isFlipped: false,
    currentRarity: snapshot.rarity_level,
    rarityReason: snapshot.rarity_reason,
    isLikedByCurrentUser: isLikedByCurrentUserState,
    currentUserLikeId: currentUserLikeIdState,
    isSavedByCurrentUser: isSavedByCurrentUserState,
    likeCount: snapshot.like_count,
    commentCount: snapshot.comment_count,
    collectionCount: snapshot.collection_count,
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
  const [isLikedByCurrentUserLocal, setIsLikedByCurrentUserLocal] =
    useState(false);
  const [currentUserLikeIdLocal, setCurrentUserLikeIdLocal] = useState<
    string | undefined
  >(undefined);
  const [isSavedByCurrentUserLocal, setIsSavedByCurrentUserLocal] =
    useState(false);

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
  // Explicitly type the Supabase client with the generated Database type
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

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
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        console.error(
          `[SnapshotHistoryItem ${snapshot.id}] Failed to fetch social status:`,
          errorMessage
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

  const handleLikeOrUnlikeCard = useCallback(async () => {
    if (!user || isLoadingSocialStatus) return;

    const originalIsLiked = isLikedByCurrentUserLocal;
    const originalLikeCount = likeCountLocal;

    setIsLikedByCurrentUserLocal(!originalIsLiked);
    setLikeCountLocal((prev) =>
      originalIsLiked ? Math.max(0, prev - 1) : prev + 1
    );
    if (originalIsLiked) setCurrentUserLikeIdLocal(undefined);

    const apiCall = originalIsLiked
      ? fetch("/api/snapshots/like", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: snapshot.id }),
        })
      : fetch("/api/snapshots/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId: snapshot.id }),
        });
    try {
      const response = await apiCall;
      const result = (await response.json()) as LikeApiResponse;
      if (
        !response.ok &&
        !(response.status === 200 && result.isAlreadyLiked) &&
        response.status !== 404
      ) {
        throw new Error(
          (result as any).error ||
            `Like/Unlike failed (status ${response.status})`
        );
      }
      toast({ title: originalIsLiked ? "Unliked!" : "Liked!" });
      if (!originalIsLiked && result.like) {
        setCurrentUserLikeIdLocal(result.like.id);
      }

      const { data: rpcResponseData, error: rpcError } = await supabase.rpc(
        "get_snapshot_social_counts",
        { p_snapshot_id: snapshot.id }
      );
      // `.returns` is not needed here if the client is typed with `Database`
      // The type will be inferred from `Database["public"]["Functions"]["get_snapshot_social_counts"]["Returns"]`

      if (rpcError) {
        console.warn("Error refetching counts via RPC:", rpcError.message);
      } else if (rpcResponseData && rpcResponseData.length > 0) {
        // rpcResponseData is Database["public"]["Functions"]["get_snapshot_social_counts"]["Returns"]
        // which is likely SnapshotSocialCountsRPCResponse[]
        const updatedCounts = rpcResponseData[0]; // Get the first (and only) row
        if (updatedCounts) {
          // Check if updatedCounts itself is not null/undefined after indexing
          setLikeCountLocal(updatedCounts.like_count);
          setCommentCountLocal(updatedCounts.comment_count);
          setCollectionCountLocal(updatedCounts.collection_count);
        } else {
          console.warn(
            `RPC get_snapshot_social_counts for ${snapshot.id} returned an empty object in the array.`
          );
        }
      } else if (rpcResponseData && rpcResponseData.length === 0) {
        console.warn(
          `RPC get_snapshot_social_counts for ${snapshot.id} returned no data (empty array).`
        );
      } else if (!rpcResponseData) {
        // This case handles if rpcResponseData is null
        console.warn(
          `RPC get_snapshot_social_counts for ${snapshot.id} returned null data property.`
        );
      }
    } catch {
      toast({ title: "Action Failed", variant: "destructive" });
      setIsLikedByCurrentUserLocal(originalIsLiked);
      setLikeCountLocal(originalLikeCount);
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

  const socialInteractionsForSnapshot: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: handleLikeOrUnlikeCard,
      onComment: () => setShowComments((prev) => !prev),
      onShare: async (context: CardActionContext) => {
        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        const shareUrl = `${baseUrl}/history/${context.symbol.toLowerCase()}/${context.type.toLowerCase()}?highlight_snapshot=${
          context.id
        }`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link Copied!",
            description: "Shareable link copied to clipboard.",
          });
        } catch {
          toast({
            title: "Could not copy link.",
            description: "Please copy manually: " + shareUrl,
            variant: "destructive",
          });
        }
      },
    }),
    [handleLikeOrUnlikeCard, toast]
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

  const onCommentPosted = useCallback(async () => {
    const { data: rpcResponseData, error: rpcError } = await supabase.rpc(
      "get_snapshot_social_counts",
      { p_snapshot_id: snapshot.id }
    );

    if (rpcError) {
      console.warn(
        "Error refetching counts after comment post:",
        rpcError.message
      );
      setCommentCountLocal((prev) => prev + 1);
    } else if (rpcResponseData && rpcResponseData.length > 0) {
      const updatedCounts = rpcResponseData[0];
      if (updatedCounts) {
        setLikeCountLocal(updatedCounts.like_count);
        setCommentCountLocal(updatedCounts.comment_count);
        setCollectionCountLocal(updatedCounts.collection_count);
      } else {
        console.warn(
          `RPC get_snapshot_social_counts for ${snapshot.id} returned an empty object in array after comment post.`
        );
        setCommentCountLocal((prev) => prev + 1);
      }
    } else {
      console.warn(
        `RPC get_snapshot_social_counts for ${snapshot.id} returned no data after comment post.`
      );
      setCommentCountLocal((prev) => prev + 1);
    }
  }, [snapshot.id, supabase]);

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
            card={displayableCard}
            onToggleFlip={() =>
              toast({ title: "Flip action is disabled for history items." })
            }
            onDeleteCardRequest={() => {}}
            socialInteractions={socialInteractionsForSnapshot}
            likeCount={likeCountLocal}
            commentCount={commentCountLocal}
            collectionCount={collectionCountLocal}
            isSavedByCurrentUser={isSavedByCurrentUserLocal}
            isSaveDisabled={true}
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
