// src/components/ui/social-bar.tsx
"use client";

import React from "react";
import {
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  type LucideProps,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "@/components/game/cards/base-card/base-card.types";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type SpecificLucideIcon = ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
>;

interface SocialBarProps {
  cardContext: CardActionContext;
  interactions?: BaseCardSocialInteractions;
  className?: string;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean; // For bookmark/save fill state
  debugFaceName: "front" | "back";
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number; // Renamed from bookmarkCount for clarity
}

// Internal configuration type for buttons
interface RawButtonConfig {
  key: string;
  action?: (context: CardActionContext) => void;
  Icon: SpecificLucideIcon;
  title: string;
  isActive?: boolean; // For 'like' and 'save' active state
  count?: number;
}

// Type for buttons that have a defined action
interface ActionableButtonConfig extends Omit<RawButtonConfig, "action"> {
  action: (context: CardActionContext) => void;
  Icon: SpecificLucideIcon;
  title: string;
  isActive?: boolean;
  count?: number;
}

export const SocialBar: React.FC<SocialBarProps> = ({
  cardContext,
  interactions,
  className,
  isLikedByCurrentUser,
  isSavedByCurrentUser, // Use this for the save icon's active state
  debugFaceName,
  likeCount = 0,
  commentCount = 0,
  collectionCount = 0,
}) => {
  // console.log(`[SocialBar ${cardContext.symbol} ${debugFaceName}] Rendering. Props: likeCount=${likeCount}, commentCount=${commentCount}, collectionCount=${collectionCount}, isLiked=${isLikedByCurrentUser}, isSaved=${isSavedByCurrentUser}`);

  if (!interactions) {
    return null; // Don't render if no interactions are provided
  }

  const iconSize: number = 16; // Standard icon size
  const buttonBaseClass: string =
    "flex items-center space-x-1 p-1.5 text-xs rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

  // Determine button classes based on active state
  const likeButtonClass = isLikedByCurrentUser
    ? "text-primary font-semibold" // Active like
    : "text-muted-foreground hover:text-primary"; // Inactive like

  const saveButtonClass = isSavedByCurrentUser
    ? "text-primary font-semibold" // Active save (can be different color, e.g., text-green-600)
    : "text-muted-foreground hover:text-primary"; // Inactive save

  const otherButtonClass: string = "text-muted-foreground hover:text-primary"; // For comment, share

  // Handles click events on social bar buttons
  const handleInteraction = (
    event: React.MouseEvent,
    buttonKey: string, // For debugging or specific logic
    actionCallback: (context: CardActionContext) => void
  ): void => {
    event.stopPropagation(); // Prevent card flip or other parent events
    actionCallback(cardContext);
  };

  // Configuration for each button in the social bar
  const rawButtonConfigs: RawButtonConfig[] = [
    {
      key: "like",
      action: interactions.onLike,
      Icon: ThumbsUp,
      title: "Like",
      isActive: isLikedByCurrentUser,
      count: likeCount,
    },
    {
      key: "comment",
      action: interactions.onComment,
      Icon: MessageCircle,
      title: "Comment",
      // isActive is not typically used for comments unless it controls a modal state
      count: commentCount,
    },
    {
      key: "save", // Key for the "Save to Collection" action
      action: interactions.onSave,
      Icon: Bookmark,
      title: "Save to Collection",
      isActive: isSavedByCurrentUser, // Use the prop to determine active state
      count: collectionCount,
    },
    {
      key: "share",
      action: interactions.onShare,
      Icon: Share2,
      title: "Share",
      // No count for shares in this implementation
    },
  ];

  // Filter out buttons that don't have an action defined
  const buttonConfigs: ActionableButtonConfig[] = rawButtonConfigs.filter(
    (config): config is ActionableButtonConfig => !!config.action
  );

  return (
    <div
      className={cn("shrink-0 p-1 flex justify-around items-center", className)}
      onClick={(e) => e.stopPropagation()} // Prevent clicks on padding from bubbling
      role="toolbar"
      aria-label={`Social actions for ${debugFaceName} of ${cardContext.symbol}`}>
      {buttonConfigs.map((config, index) => (
        <button
          key={`${config.key}-${debugFaceName}`}
          onClick={(e) => handleInteraction(e, config.key, config.action)}
          title={config.title}
          className={cn(
            buttonBaseClass,
            // Apply specific class based on button key and active state
            config.key === "like"
              ? likeButtonClass
              : config.key === "save"
              ? saveButtonClass
              : otherButtonClass
          )}
          // aria-pressed for like and save buttons to indicate their toggle state
          aria-pressed={
            config.key === "like" || config.key === "save"
              ? config.isActive
              : undefined
          }
          data-button-key={config.key} // For easier DOM selection/debugging
          data-face-name={debugFaceName}>
          <span className="flex items-center justify-center">
            <config.Icon
              size={iconSize}
              aria-hidden="true"
              // Icon fill based on active state for 'like' and 'save'
              fill={
                (config.key === "like" || config.key === "save") &&
                config.isActive
                  ? "currentColor" // Use current text color for fill
                  : "none"
              }
              // Adjust stroke width if active for 'like' and 'save'
              strokeWidth={
                (config.key === "like" || config.key === "save") &&
                config.isActive
                  ? 2.2
                  : 2
              }
              // Icon color class, primarily for 'like' and 'save' active state
              className={cn(
                (config.key === "like" || config.key === "save") &&
                  config.isActive
                  ? "text-primary"
                  : ""
                // Example for different active save color:
                // (config.key === 'save' && config.isActive ? "text-green-500" : "")
              )}
            />
          </span>
          {/* Display count: always for 'like' & 'save' if count is defined, for others if count > 0 */}
          {config.count !== undefined &&
          (config.key === "like" ||
            config.key === "save" ||
            config.count > 0) ? (
            <span
              className={cn(
                "ml-0.5 font-medium text-[11px]",
                // Styling for count text based on button type and active state
                {
                  "text-primary":
                    (config.key === "like" || config.key === "save") &&
                    config.isActive &&
                    config.count > 0,
                },
                {
                  "text-muted-foreground":
                    !(
                      (config.key === "like" || config.key === "save") &&
                      config.isActive
                    ) && config.count > 0,
                },
                {
                  "text-muted-foreground/70":
                    config.count === 0 &&
                    (config.key === "like" || config.key === "save"),
                }
              )}>
              {config.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
};
