// src/components/comments/CommentDialog.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  DialogClose, // Not explicitly used, but good to have if needed
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle } from "lucide-react"; // Added Send icon
import { formatDistanceToNowStrict } from "date-fns";

// Type for comments fetched from the API (matches CommentWithAuthorResponse from the GET API)
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
  // parent_comment_id and replies can be added later for threading
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
  const { user } = useAuth(); // Get authenticated user
  const { toast } = useToast();
  const commentsEndRef = useRef<HTMLDivElement>(null); // For scrolling to bottom

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      commentText: "",
    },
  });

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchComments = useCallback(async () => {
    if (!snapshotId) {
      setComments([]); // Clear comments if no snapshotId
      return;
    }
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
      setComments([]); // Clear comments on error
    } finally {
      setIsLoadingComments(false);
    }
  }, [snapshotId, toast]);

  useEffect(() => {
    if (isOpen && snapshotId) {
      fetchComments();
    } else if (!isOpen) {
      // Reset state when dialog is closed
      setComments([]);
      form.reset();
      setIsLoadingComments(false);
      setIsPostingComment(false);
    }
  }, [isOpen, snapshotId, fetchComments, form]);

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom();
    }
  }, [comments]);

  const onSubmitComment: SubmitHandler<CommentFormValues> = async (values) => {
    if (!snapshotId || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a comment.",
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
          commentText: values.commentText.trim(),
        }),
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to post comment.");
      }
      const { comment: newComment } = await response.json();
      // Add new comment to the list (optimistic update or refetch)
      setComments((prevComments) => [...prevComments, newComment]); // Add to bottom for chronological
      form.reset();
      toast({ title: "Comment Posted!", variant: "default" });
      // Scroll to bottom after new comment is added
      setTimeout(scrollToBottom, 100);
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

  const getInitials = (name?: string | null): string => {
    if (!name && user?.email) return user.email[0].toUpperCase();
    if (!name) return "U"; // Default User initial
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const dialogTitle = cardName ? `${cardName} (${cardSymbol})` : cardSymbol;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-4rem)] h-auto">
        <DialogHeader className="shrink-0">
          <DialogTitle>Comments: {dialogTitle}</DialogTitle>
          <DialogDescription>
            Discuss this card snapshot with other users.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-hidden flex flex-col min-h-[200px]">
          {/* Added min-h */}
          {isLoadingComments ? (
            <div className="space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 flex-1 flex flex-col items-center justify-center">
              <MessageCircle
                size={48}
                className="mb-4 text-muted-foreground/50"
              />
              No comments yet.
              {user && (
                <p className="text-sm">Be the first to share your thoughts!</p>
              )}
            </div>
          ) : (
            <ScrollArea className="flex-grow pr-2">
              {/* pr-2 for scrollbar space */}
              <div className="space-y-4 p-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={comment.author?.avatar_url || undefined}
                        alt={comment.author?.username || "User avatar"}
                      />
                      <AvatarFallback>
                        {getInitials(comment.author?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/10 dark:bg-muted/20 p-3 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-foreground">
                          {comment.author?.username ||
                            (user?.id === comment.user_id
                              ? user.email?.split("@")[0] || "You"
                              : "Anonymous")}
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
                <div ref={commentsEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {user ? (
          <form
            onSubmit={form.handleSubmit(onSubmitComment)}
            className="pt-4 border-t shrink-0">
            <div className="grid gap-3">
              <Textarea
                placeholder="Write your comment..."
                {...form.register("commentText")}
                className="min-h-[70px] text-sm" // Adjusted size
                disabled={isPostingComment}
                rows={3}
              />
              {form.formState.errors.commentText && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.commentText.message}
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="submit"
                disabled={
                  isPostingComment ||
                  !form.formState.isDirty ||
                  !form.formState.isValid
                }
                size="sm">
                {isPostingComment ? (
                  "Posting..."
                ) : (
                  <>
                    <Send size={16} className="mr-2" /> Post Comment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-center text-muted-foreground pt-4 border-t shrink-0">
            PleaseisPremiumUser
            <a
              href="/auth"
              className="underline text-primary hover:text-primary/80">
              log in
            </a>
            isPremiumUser to post comments.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
