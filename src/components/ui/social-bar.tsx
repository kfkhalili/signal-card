// src/app/components/ui/social-bar.tsx
import React from "react";
import { ThumbsUp, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "@/components/game/cards/base-card/base-card.types"; // Adjust path as needed

interface SocialBarProps {
  cardContext: CardActionContext;
  interactions?: BaseCardSocialInteractions;
  className?: string;
}

export const SocialBar: React.FC<SocialBarProps> = ({
  cardContext,
  interactions,
  className,
}) => {
  if (!interactions) {
    return null;
  }

  const iconSize = 18;
  // Removed hover:bg-muted/60 from here
  const buttonBaseClass =
    "flex items-center space-x-1.5 p-1.5 text-xs hover:text-primary rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const handleInteraction = (
    e: React.MouseEvent,
    action?: (context: CardActionContext) => void
  ) => {
    e.stopPropagation();
    action?.(cardContext);
  };

  return (
    <div
      className={cn(
        "shrink-0 border-t p-1 flex justify-around items-center text-muted-foreground",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Social actions"
    >
      {interactions.onLike && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onLike)}
          title="Like"
          className={cn(buttonBaseClass)}
          aria-label={`Like ${cardContext.symbol} card`}
        >
          <ThumbsUp size={iconSize} aria-hidden="true" />
          <span>Like</span>
        </button>
      )}
      {interactions.onComment && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onComment)}
          title="Comment"
          className={cn(buttonBaseClass)}
          aria-label={`Comment on ${cardContext.symbol} card`}
        >
          <MessageCircle size={iconSize} aria-hidden="true" />
          <span>Comment</span>
        </button>
      )}
      {interactions.onSave && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onSave)}
          title="Save"
          className={cn(buttonBaseClass)}
          aria-label={`Save ${cardContext.symbol} card`}
        >
          <Bookmark size={iconSize} aria-hidden="true" />
          <span>Save</span>
        </button>
      )}
      {interactions.onShare && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onShare)}
          title="Share"
          className={cn(buttonBaseClass)}
          aria-label={`Share ${cardContext.symbol} card`}
        >
          <Share2 size={iconSize} aria-hidden="true" />
          <span>Share</span>
        </button>
      )}
    </div>
  );
};
