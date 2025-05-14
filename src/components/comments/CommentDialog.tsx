// src/components/comments/CommentDialog.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNowStrict } from "date-fns";

// Type for comments fetched from the API (matches CommentWithAuthorResponse)
export interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  // parent_comment_id, replies can be added later for threading
}

const commentFormSchema = z.object({
  commentText: z
    .string()
    .min(1, "Comment cannot be empty.")
    .max(1000, "Comment cannot exceed 1000 characters."),
});
type CommentFormValues = z.infer<typeof commentFormSchema>;

interface CommentDialogProps {
  snapshotId: string | null;
  cardSymbol: string;
  cardName?: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const CommentDialog: React.FC<CommentDialogProps> = ({
  snapshotId,
  cardSymbol,
  cardName,
  isOpen,
  onOpenChange,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      commentText: "",
    },
  });

  const fetchComments = useCallback(async () => {
    if (!snapshotId) return;
    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/snapshots/${snapshotId}/comments`);
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to fetch comments.");
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error: any) {
      toast({
        title: "Error Fetching Comments",
        description: error.message,
        variant: "destructive",
      });
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  }, [snapshotId, toast]);

  useEffect(() => {
    if (isOpen && snapshotId) {
      fetchComments();
    } else {
      // Reset comments when dialog is closed or snapshotId is null
      setComments([]);
      form.reset();
    }
  }, [isOpen, snapshotId, fetchComments, form]);

  const onSubmitComment: SubmitHandler<CommentFormValues> = async (values) => {
    if (!snapshotId || !user) {
      toast({
        title: "Error",
        description: "Cannot post comment.",
        variant: "destructive",
      });
      return;
    }
    setIsPostingComment(true);
    try {
      const response = await fetch("/api/snapshots/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId: snapshotId,
          commentText: values.commentText,
        }),
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to post comment.");
      }
      const { comment: newComment } = await response.json();
      // Add new comment to the top optimistically or refetch
      setComments((prevComments) => [newComment, ...prevComments]);
      form.reset();
      toast({ title: "Comment Posted!", variant: "default" });
    } catch (error: any) {
      toast({
        title: "Error Posting Comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  // Helper to get initials for AvatarFallback
  const getInitials = (name?: string | null): string => {
    if (!name) return user?.email?.[0]?.toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const dialogTitle = cardName ? `${cardName} (${cardSymbol})` : cardSymbol;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Comments on {dialogTitle}</DialogTitle>
          <DialogDescription>
            View and add comments for this card snapshot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden flex flex-col">
          {isLoadingComments ? (
            <div className="space-y-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 flex-1 flex items-center justify-center">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <ScrollArea className="flex-grow pr-4 -mr-4">
              {" "}
              {/* Negative margin for scrollbar */}
              <div className="space-y-4 py-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={comment.author?.avatar_url || undefined}
                        alt={comment.author?.username || "User"}
                      />
                      <AvatarFallback>
                        {getInitials(comment.author?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/50 p-3 rounded-md">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-foreground">
                          {comment.author?.username ||
                            user?.email?.split("@")[0] ||
                            "Anonymous"}
                        </span>
                        <span
                          className="text-muted-foreground"
                          title={new Date(comment.created_at).toLocaleString()}>
                          {formatDistanceToNowStrict(
                            new Date(comment.created_at),
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                        {comment.comment_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {user && (
          <form
            onSubmit={form.handleSubmit(onSubmitComment)}
            className="pt-4 border-t">
            <div className="grid gap-2">
              <Textarea
                placeholder="Write your comment..."
                {...form.register("commentText")}
                className="min-h-[80px]"
                disabled={isPostingComment}
              />
              {form.formState.errors.commentText && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.commentText.message}
                </p>
              )}
            </div>
            <DialogFooter className="mt-3">
              <Button
                type="submit"
                disabled={isPostingComment || !form.formState.isValid}>
                {isPostingComment ? "Posting..." : "Post Comment"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {!user && (
          <p className="text-sm text-center text-muted-foreground pt-4 border-t">
            Please log in to post comments.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
