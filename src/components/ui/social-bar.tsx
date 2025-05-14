// src/components/ui/social-bar.tsx
import React from "react";
import {
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  type LucideProps,
  // Use a more specific import if Icon type clashes elsewhere
  // type Icon as LucideIconType,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "@/components/game/cards/base-card/base-card.types";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

// More specific type for Lucide icons
type SpecificLucideIcon = ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
>;

interface SocialBarProps {
  cardContext: CardActionContext;
  interactions?: BaseCardSocialInteractions;
  className?: string;
  isLikedByCurrentUser?: boolean;
  debugFaceName: "front" | "back"; // For logging
}

// For initial configuration, action can be undefined
interface RawButtonConfig {
  key: string;
  action?: (context: CardActionContext) => void;
  Icon: SpecificLucideIcon;
  title: string;
  isActive?: boolean;
}

// After filtering, action is guaranteed
interface ActionableButtonConfig extends Omit<RawButtonConfig, "action"> {
  action: (context: CardActionContext) => void;
  Icon: SpecificLucideIcon; // Ensure Icon is part of the final type
  title: string; // Ensure title is part of the final type
  isActive?: boolean; // Ensure isActive is part of the final type
}

export const SocialBar: React.FC<SocialBarProps> = ({
  cardContext,
  interactions,
  className,
  isLikedByCurrentUser,
  debugFaceName, // Use this for logging
}) => {
  // Log when the component renders for a specific face
  console.log(
    `[SocialBar] Rendering for face: ${debugFaceName}, Card: ${cardContext.symbol}`
  );

  if (!interactions) {
    console.log(
      `[SocialBar] No interactions object provided for ${debugFaceName} of ${cardContext.symbol}.`
    );
    return null;
  }

  const iconSize: number = 18;
  const buttonBaseClass: string =
    "flex items-center space-x-1.5 p-1.5 text-xs rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
  const likeButtonClass: string = isLikedByCurrentUser
    ? "text-primary font-semibold"
    : "text-muted-foreground hover:text-primary";
  const otherButtonClass: string = "text-muted-foreground hover:text-primary";

  const handleInteraction = (
    event: React.MouseEvent,
    buttonKey: string, // Pass the key for logging
    actionCallback: (context: CardActionContext) => void
  ): void => {
    event.stopPropagation(); // Crucial: prevent card flip
    console.log(
      `[SocialBar-${debugFaceName}] Click detected on button: ${buttonKey} (Card: ${cardContext.symbol})`
    );
    console.log(
      `[SocialBar-${debugFaceName}] Executing action for ${buttonKey}...`
    );
    actionCallback(cardContext);
  };

  const rawButtonConfigs: RawButtonConfig[] = [
    {
      key: "like",
      action: interactions.onLike,
      Icon: ThumbsUp,
      title: "Like",
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
  ];

  // Ensure that we only try to render buttons that have an action.
  const buttonConfigs: ActionableButtonConfig[] = rawButtonConfigs.filter(
    (config): config is ActionableButtonConfig => {
      if (!config.action) {
        // console.log(`[SocialBar-${debugFaceName}] Filtering out button '${config.key}' due to missing action for ${cardContext.symbol}.`);
      }
      return !!config.action;
    }
  );

  // Log the order of buttons that will be rendered
  // console.log(`[SocialBar-${debugFaceName}] Effective button order for ${cardContext.symbol}:`, buttonConfigs.map(b => b.key).join(', '));

  // SocialBar assumes it's rendered in a correctly oriented context by its parent (BaseCard).
  // Therefore, no self-transformation or icon-specific transformation is needed here.
  const containerStyle: React.CSSProperties = {};
  const iconStyle: React.CSSProperties = {};

  return (
    <div
      style={containerStyle}
      className={cn("shrink-0 p-1 flex justify-around items-center", className)}
      onClick={(e) => {
        // This log helps see if clicks on the bar's padding are caught
        console.log(
          `[SocialBar-${debugFaceName}] Click on SocialBar container padding (Card: ${cardContext.symbol})`
        );
        e.stopPropagation();
      }}
      role="toolbar"
      aria-label={`Social actions for ${debugFaceName} of ${cardContext.symbol}`}>
      {buttonConfigs.map((config, index) => (
        <button
          key={`${config.key}-${debugFaceName}`} // Make key unique per face instance
          onClick={(e) => handleInteraction(e, config.key, config.action)}
          title={config.title}
          className={cn(
            buttonBaseClass,
            config.key === "like" ? likeButtonClass : otherButtonClass
          )}
          aria-pressed={config.key === "like" ? config.isActive : undefined}
          aria-label={`${config.title} for ${cardContext.symbol} on ${debugFaceName} face (DOM index ${index})`}
          data-button-key={config.key} // For easier inspection
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
        </button>
      ))}
    </div>
  );
};
