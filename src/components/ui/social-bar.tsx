// src/components/ui/social-bar.tsx
// "use client"; // This component is already a client component

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
  debugFaceName: "front" | "back";
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
}

interface RawButtonConfig {
  key: string;
  action?: (context: CardActionContext) => void;
  Icon: SpecificLucideIcon;
  title: string;
  isActive?: boolean;
  count?: number;
}

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
  debugFaceName,
  likeCount = 0,
  commentCount = 0,
  collectionCount = 0,
}) => {
  // ADD THIS LOG
  console.log(
    `[SocialBar ${cardContext.symbol} ${debugFaceName}] Rendering. Props: likeCount=${likeCount}, commentCount=${commentCount}, collectionCount=${collectionCount}, isLikedByCurrentUser=${isLikedByCurrentUser}`
  );

  if (!interactions) {
    console.debug(
      `[SocialBar] No interactions object provided for ${debugFaceName} of ${cardContext.symbol}.`
    );
    return null;
  }

  const iconSize: number = 16;
  const buttonBaseClass: string =
    "flex items-center space-x-1 p-1.5 text-xs rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
  const likeButtonClass: string = isLikedByCurrentUser
    ? "text-primary font-semibold"
    : "text-muted-foreground hover:text-primary";
  const otherButtonClass: string = "text-muted-foreground hover:text-primary";

  const handleInteraction = (
    event: React.MouseEvent,
    buttonKey: string,
    actionCallback: (context: CardActionContext) => void
  ): void => {
    event.stopPropagation();
    actionCallback(cardContext);
  };

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
      count: commentCount,
    },
    {
      key: "save",
      action: interactions.onSave,
      Icon: Bookmark,
      title: "Save to Collection",
      count: collectionCount,
    },
    {
      key: "share",
      action: interactions.onShare,
      Icon: Share2,
      title: "Share",
    },
  ];

  const buttonConfigs: ActionableButtonConfig[] = rawButtonConfigs.filter(
    (config): config is ActionableButtonConfig => !!config.action
  );

  const containerStyle: React.CSSProperties = {};
  const iconStyle: React.CSSProperties = {};

  return (
    <div
      style={containerStyle}
      className={cn("shrink-0 p-1 flex justify-around items-center", className)}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label={`Social actions for ${debugFaceName} of ${cardContext.symbol}`}>
      {buttonConfigs.map((config, index) => (
        <button
          key={`${config.key}-${debugFaceName}`}
          onClick={(e) => handleInteraction(e, config.key, config.action)}
          title={config.title}
          className={cn(
            buttonBaseClass,
            config.key === "like" ? likeButtonClass : otherButtonClass
          )}
          aria-pressed={config.key === "like" ? config.isActive : undefined}
          aria-label={`${config.title} for ${cardContext.symbol} on ${debugFaceName} face (DOM index ${index})`}
          data-button-key={config.key}
          data-face-name={debugFaceName}>
          <span style={iconStyle} className="flex items-center justify-center">
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
          {(config.count !== undefined && config.count > 0) ||
          (config.key === "like" && config.count !== undefined) ? (
            <span
              className={cn(
                "ml-0.5 font-medium text-[11px]", // Made text slightly smaller
                {
                  "text-primary":
                    config.key === "like" &&
                    isLikedByCurrentUser &&
                    config.count > 0,
                },
                {
                  "text-muted-foreground":
                    (config.key !== "like" ||
                      !isLikedByCurrentUser ||
                      config.count === 0) &&
                    config.count > 0,
                },
                {
                  "text-muted-foreground/70":
                    config.count === 0 && config.key === "like",
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
