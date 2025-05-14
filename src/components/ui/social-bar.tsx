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
  isFlipped?: boolean; // True if the SocialBar's direct PARENT container was counter-rotated by 180deg
  isLikedByCurrentUser?: boolean;
}

interface ButtonConfig {
  key: string;
  action?: (context: CardActionContext) => void;
  Icon: LucideIcon;
  title: string;
  isActive?: boolean;
}

export const SocialBar: React.FC<SocialBarProps> = ({
  cardContext,
  interactions,
  className,
  isFlipped,
  isLikedByCurrentUser,
}) => {
  // console.log(`SocialBar RENDER for ${cardContext.symbol} (ID: ${cardContext.id}): isFlipped = ${isFlipped}, isLikedByCurrentUser = ${isLikedByCurrentUser}`);

  if (!interactions) {
    return null;
  }

  const iconSize = 18;
  const buttonBaseClass =
    "flex items-center space-x-1.5 p-1.5 text-xs rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

  const likeButtonClass = isLikedByCurrentUser
    ? "text-primary font-semibold"
    : "text-muted-foreground hover:text-primary";

  const otherButtonClass = "text-muted-foreground hover:text-primary";

  const handleInteraction = (
    e: React.MouseEvent,
    actionCallback?: (context: CardActionContext) => void
  ) => {
    e.stopPropagation();
    actionCallback?.(cardContext);
  };

  // DOM order of buttons is ALWAYS the natural L-R visual order.
  // If the parent container (in BaseCard.tsx) is correctly counter-rotated for the back face,
  // this natural DOM order should map to the correct visual L-R order and correct hit testing.
  const buttonConfigs: ButtonConfig[] = [
    {
      key: "like",
      action: interactions.onLike,
      Icon: ThumbsUp,
      title: isLikedByCurrentUser ? "Unlike" : "Like",
      isActive: isLikedByCurrentUser,
    },
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

  // If the parent of SocialBar was counter-rotated (isFlipped = true),
  // then the content (icons) inside SocialBar needs to be mirrored back to look normal.
  // Using rotateY(180deg) is a 3D transform which might be more consistent here than scaleX(-1)
  // if there are complex 3D contexts.
  const iconSpanStyle: React.CSSProperties = isFlipped
    ? { transform: "rotateY(180deg)" }
    : {};

  return (
    <div
      className={cn("shrink-0 p-1 flex justify-around items-center", className)}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Social actions">
      {buttonConfigs.map((config) => (
        <button
          key={config.key}
          onClick={(e) => handleInteraction(e, config.action)}
          title={config.title}
          className={cn(
            buttonBaseClass,
            config.key === "like" ? likeButtonClass : otherButtonClass
          )}
          aria-pressed={config.key === "like" ? config.isActive : undefined}
          aria-label={`${config.title} ${
            cardContext.symbol || cardContext.companyName || "card"
          }`}>
          {/* Apply visual correction to the span containing the icon if needed */}
          <span
            style={iconSpanStyle}
            className="flex items-center justify-center">
            <config.Icon
              size={iconSize}
              aria-hidden="true"
              fill={
                config.key === "like" && config.isActive
                  ? "currentColor"
                  : "none"
              }
              strokeWidth={config.key === "like" && config.isActive ? 2.2 : 2}
              className={cn(
                config.key === "like" && config.isActive ? "text-primary" : ""
              )}
            />
          </span>
        </button>
      ))}
    </div>
  );
};
