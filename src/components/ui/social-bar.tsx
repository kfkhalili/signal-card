// src/app/components/ui/social-bar.tsx
import React from "react";
import { ThumbsUp, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { cn } from "../../lib/utils";
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
    return null; // Don't render if no interaction callbacks are provided
  }

  const iconSize = 18;
  const buttonBaseClass =
    "flex items-center space-x-1.5 p-1.5 text-xs hover:text-primary rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const handleInteraction = (
    e: React.MouseEvent,
    action?: (context: CardActionContext) => void
  ) => {
    e.stopPropagation(); // Prevent card flip
    action?.(cardContext);
  };

  return (
    <div
      className={cn(
        // Removed "border-t" from this div's className
        "shrink-0 p-1 flex justify-around items-center text-muted-foreground",
        className
      )}
      onClick={(e) => e.stopPropagation()} // Prevent clicks on the bar itself from flipping the card
      role="toolbar"
      aria-label="Social actions">
      {interactions.onLike && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onLike)}
          title="Like"
          className={cn(buttonBaseClass)}
          aria-label={`Like ${cardContext.symbol} card`}>
          <ThumbsUp size={iconSize} aria-hidden="true" />
        </button>
      )}
      {interactions.onComment && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onComment)}
          title="Comment"
          className={cn(buttonBaseClass)}
          aria-label={`Comment on ${cardContext.symbol} card`}>
          <MessageCircle size={iconSize} aria-hidden="true" />
        </button>
      )}
      {interactions.onSave && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onSave)}
          title="Save"
          className={cn(buttonBaseClass)}
          aria-label={`Save ${cardContext.symbol} card`}>
          <Bookmark size={iconSize} aria-hidden="true" />
        </button>
      )}
      {interactions.onShare && (
        <button
          onClick={(e) => handleInteraction(e, interactions.onShare)}
          title="Share"
          className={cn(buttonBaseClass)}
          aria-label={`Share ${cardContext.symbol} card`}>
          <Share2 size={iconSize} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
