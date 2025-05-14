// src/components/comments/InlineCommentSection.tsx
// NEW FILE
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { Comment } from "./CommentDialog"; // Reuse Comment type

const commentFormSchema = z.object({
  commentText: z
    .string()
    .min(1, "Comment cannot be empty.")
    .max(1000, "Comment cannot exceed 1000 characters."),
});
type CommentFormValues = z.infer<typeof commentFormSchema>;

interface InlineCommentSectionProps {
  snapshotId: string;
}

export const InlineCommentSection: React.FC<InlineCommentSectionProps> = ({
  snapshotId,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { commentText: "" },
  });

  const scrollToBottom = useCallback(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (comments.length > 0) {
      // Timeout to allow DOM to update if a comment was just added
      setTimeout(scrollToBottom, 100);
    }
  }, [comments, scrollToBottom]);

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
      setComments((prevComments) => [...prevComments, newComment]);
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

  const getInitials = (name?: string | null): string => {
    if (!name && user?.email) return user.email[0].toUpperCase();
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="border rounded-lg p-4 bg-card h-full flex flex-col max-h-[500px] md:max-h-full">
      {" "}
      {/* Max height for scrollability */}
      <h3 className="text-lg font-semibold mb-3 text-card-foreground">
        Comments
      </h3>
      <ScrollArea className="flex-grow pr-3 mb-4">
        {" "}
        {/* ScrollArea for comments list */}
        {isLoadingComments ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-start space-x-2.5">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <MessageCircle
              size={36}
              className="mx-auto mb-2 text-muted-foreground/50"
            />
            No comments yet.
            {user && (
              <p className="text-xs">Be the first to share your thoughts!</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.author?.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(comment.author?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/30 dark:bg-muted/10 p-2.5 rounded-md shadow-sm">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium text-card-foreground/90">
                      {comment.author?.username ||
                        (user?.id === comment.user_id
                          ? user.email?.split("@")[0] || "You"
                          : "Anonymous")}
                    </span>
                    <span
                      className="text-muted-foreground/80"
                      title={new Date(comment.created_at).toLocaleString()}>
                      {formatDistanceToNowStrict(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-card-foreground/80 whitespace-pre-wrap break-words">
                    {comment.comment_text}
                  </p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        )}
      </ScrollArea>
      {user ? (
        <form
          onSubmit={form.handleSubmit(onSubmitComment)}
          className="mt-auto pt-3 border-t">
          <div className="grid gap-2">
            <Textarea
              placeholder="Add a comment..."
              {...form.register("commentText")}
              className="min-h-[60px] text-sm"
              disabled={isPostingComment}
              rows={2}
            />
            {form.formState.errors.commentText && (
              <p className="text-xs text-destructive">
                {form.formState.errors.commentText.message}
              </p>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={
                isPostingComment ||
                !form.formState.isDirty ||
                !form.formState.isValid
              }>
              {isPostingComment ? (
                "Posting..."
              ) : (
                <>
                  <Send size={14} className="mr-1.5" /> Post
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-center text-muted-foreground mt-auto pt-3 border-t">
          Please{" "}
          <a
            href="/auth"
            className="underline text-primary hover:text-primary/80">
            log in
          </a>{" "}
          to post comments.
        </p>
      )}
    </div>
  );
};
