// src/components/ui/social-bar.tsx
import React from "react";
import {
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "@/components/game/cards/base-card/base-card.types";

interface SocialBarProps {
  cardContext: CardActionContext;
  interactions?: BaseCardSocialInteractions;
  className?: string;
  isFlipped?: boolean; // True if the SocialBar's direct parent was counter-rotated
}

interface ButtonConfig {
  key: string;
  action?: (context: CardActionContext) => void;
  Icon: LucideIcon;
  title: string;
}

export const SocialBar: React.FC<SocialBarProps> = ({
  cardContext,
  interactions,
  className,
  isFlipped, // This prop now indicates that the content needs to be un-mirrored
}) => {
  if (!interactions) {
    return null;
  }

  const iconSize = 18;
  const buttonBaseClass =
    "flex items-center space-x-1.5 p-1.5 text-xs hover:text-primary rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const handleInteraction = (
    e: React.MouseEvent,
    actionCallback?: (context: CardActionContext) => void
  ) => {
    e.stopPropagation();
    actionCallback?.(cardContext);
  };

  // DOM order of buttons is always the same
  const buttonConfigs: ButtonConfig[] = [
    { key: "like", action: interactions.onLike, Icon: ThumbsUp, title: "Like" },
    {
      key: "comment",
      action: interactions.onComment,
      Icon: MessageCircle,
      title: "Comment",
    },
    { key: "save", action: interactions.onSave, Icon: Bookmark, title: "Save" },
    {
      key: "share",
      action: interactions.onShare,
      Icon: Share2,
      title: "Share",
    },
  ].filter((config) => !!config.action) as ButtonConfig[];

  // Style to apply to each button's content (icon + text if any) if the bar is flipped
  const contentStyle: React.CSSProperties = isFlipped
    ? { transform: "rotateY(180deg)" }
    : {};

  return (
    <div
      className={cn(
        "shrink-0 p-1 flex justify-around items-center text-muted-foreground",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Social actions">
      {buttonConfigs.map((config) => (
        <button
          key={config.key}
          onClick={(e) => handleInteraction(e, config.action)}
          title={config.title}
          className={cn(buttonBaseClass)}
          aria-label={`${config.title} ${
            cardContext.symbol || cardContext.companyName || "card"
          }`}>
          {/* Apply counter-rotation to the icon (and any text) if the bar is flipped */}
          <span
            style={contentStyle}
            className="flex items-center justify-center">
            <config.Icon size={iconSize} aria-hidden="true" />
            {/* If you had text labels next to icons, they'd go in this span too */}
          </span>
        </button>
      ))}
    </div>
  );
};
