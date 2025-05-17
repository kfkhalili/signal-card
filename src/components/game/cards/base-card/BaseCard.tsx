// src/components/game/cards/base-card/BaseCard.tsx
"use client";

import React from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon, Sparkle, Award, Gem, Crown } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType, // Assuming CardType is 'price' | 'profile'
} from "./base-card.types";
import { SocialBar } from "@/components/ui/social-bar";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { RARITY_LEVELS } from "@/components/game/rarityCalculator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  cardContext: CardActionContext;
  currentRarity?: string | null;
  rarityReason?: string | null;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onFlip: () => void;
  onHeaderClick?: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
}

const outerStyle: React.CSSProperties = {
  perspective: "1000px",
  position: "relative", // Needed for absolute positioning of inner card
};

const cardSurfaceBaseStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden", // For Safari
  display: "flex",
  flexDirection: "column",
  cursor: "pointer", // For the main card flip interaction
};

const backFaceTransformStyle: React.CSSProperties = {
  transform: "rotateY(180deg)",
};

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  currentRarity,
  rarityReason,
  socialInteractions,
  onDeleteRequest,
  onFlip,
  onHeaderClick,
  className,
  innerCardClassName,
  children,
  isLikedByCurrentUser,
  isSavedByCurrentUser,
  likeCount,
  commentCount,
  collectionCount,
}) => {
  // if (process.env.NODE_ENV === "development") {
  //   console.debug(
  //     `[BaseCard ${cardContext.symbol}] Rendering. Props: likeCount=${likeCount}, commentCount=${commentCount}, collectionCount=${collectionCount}, isLiked=${isLikedByCurrentUser}, isSaved=${isSavedByCurrentUser}`
  //   );
  // }
  const {
    symbol,
    companyName,
    logoUrl,
    websiteUrl,
    type: cardType, // cardContext.type is CardType ('price' | 'profile')
  } = cardContext;

  const innerCardDynamicStyles: React.CSSProperties = {
    position: "relative", // Changed from absolute to relative as outerStyle is relative
    width: "100%",
    height: "100%",
    transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
    transformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    onDeleteRequest?.(cardContext);
  };

  const deleteButtonElement = onDeleteRequest ? (
    <button
      onClick={handleDeleteClick}
      title="Delete Card"
      aria-label={`Delete ${symbol} card`}
      className={cn(
        "absolute top-1 right-1 z-30 p-1 flex items-center justify-center transition-all",
        "text-muted-foreground/60 hover:text-destructive rounded-full hover:bg-destructive/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "opacity-0 group-hover:opacity-100 duration-200 ease-in-out" // Show on group hover
      )}
      data-interactive-child="true" // Mark as interactive to prevent flip
    >
      <XIcon size={16} strokeWidth={2.5} />
    </button>
  ) : null;

  const handleHeaderTextClick = (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (onHeaderClick) {
      event.stopPropagation(); // Prevent card flip
      onHeaderClick(cardContext);
    }
  };

  const headerWrapperClassNames =
    "px-3 sm:px-4 md:px-5 pb-1 pt-3 sm:pt-4 shrink-0 min-h-[56px] sm:min-h-[64px] md:min-h-[72px]";

  const logoImageElement = logoUrl ? (
    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 relative shrink-0">
      <Image
        src={logoUrl}
        alt={`${companyName || symbol} logo`}
        fill
        sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px" // Example sizes
        className="object-contain rounded"
        onError={(e) => (e.currentTarget.style.display = "none")} // Basic error handling
        priority={false} // Generally false unless it's LCP for the specific page view
      />
    </div>
  ) : (
    // Placeholder if no logoUrl, to maintain layout
    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
      {symbol ? symbol.charAt(0) : "?"}
    </div>
  );

  const clickableLogoElement =
    logoUrl && websiteUrl ? ( // Only make it a link if websiteUrl is present
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // Prevent card flip
        className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full"
        aria-label={`Visit ${companyName || symbol} website`}
        data-interactive-child="true" // Mark as interactive
        title={`Visit ${companyName || symbol} website`}>
        {logoImageElement}
      </a>
    ) : (
      logoImageElement // Render just the image/placeholder if no websiteUrl
    );

  const identityHeaderContent = (
    <>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3 self-start">
        {clickableLogoElement}
      </div>
      <ClickableDataItem
        isInteractive={!!onHeaderClick}
        onClickHandler={onHeaderClick ? handleHeaderTextClick : undefined}
        className={cn(
          "text-right min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]",
          "flex flex-col justify-center" // Ensure vertical centering if needed
        )}
        style={{ minHeight: "4.25rem" }} // Consistent height for the text block
        aria-label={
          onHeaderClick
            ? `View details for ${companyName || symbol}`
            : undefined
        }
        data-interactive-child={!!onHeaderClick} // Mark as interactive
        data-testid="header-text-clickable">
        <CardTitle // This is a div from shadcn, not a heading element by default
          className={cn(
            "text-sm sm:text-base md:text-lg font-semibold leading-tight line-clamp-2 text-right"
          )}
          title={companyName || symbol}>
          {companyName || symbol}
        </CardTitle>
        <div className="h-[1.1em] sm:h-[1.2em] md:h-[1.25em] flex items-end justify-end">
          {companyName && ( // Show symbol only if companyName is also present
            <p
              className="text-xs sm:text-sm text-muted-foreground truncate leading-tight pt-[1px] sm:pt-[2px]"
              title={symbol}>
              ({symbol})
            </p>
          )}
          {/* Optionally, show card type if no company name, e.g., for generic price cards */}
          {!companyName && cardType === "price" && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px] capitalize">
              {cardType} Quote
            </p>
          )}
          {!companyName && cardType === "profile" && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px] capitalize">
              {symbol} Profile
            </p>
          )}
        </div>
      </ClickableDataItem>
    </>
  );

  const actualIdentityHeaderElement = (
    <div
      className={cn(
        "flex justify-between items-start", // Ensure items align to start for consistent logo/text height
        headerWrapperClassNames
      )}>
      {identityHeaderContent}
    </div>
  );

  const headerPlaceholderElementForBack = // For layout consistency on the back face
    (
      <div
        className={cn("invisible", headerWrapperClassNames)} // Same padding and min-height
        aria-hidden="true">
        {/* Mimic structure for height calculation */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"></div>{" "}
            {/* Placeholder for logo area */}
          </div>
          <div
            className="min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]"
            style={{ minHeight: "4.25rem" }} // Match height of ClickableDataItem
          >
            {/* Content not strictly needed as it's invisible */}
          </div>
        </div>
      </div>
    );

  const RarityReasonOnBackHeader = rarityReason ? (
    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 md:left-5 pr-8 sm:pr-10 md:pr-12 max-w-[calc(100%-40px-1rem)] pointer-events-none">
      <p className="text-xs font-medium text-muted-foreground leading-tight text-left line-clamp-3">
        {currentRarity && currentRarity !== RARITY_LEVELS.COMMON && (
          <span className="font-semibold text-primary italic">
            {currentRarity}:{" "}
          </span>
        )}
        {rarityReason}
      </p>
    </div>
  ) : null;

  const RarityIconOnFront = () => {
    if (!currentRarity || currentRarity === RARITY_LEVELS.COMMON) {
      // Return a div with same padding/height to maintain layout consistency
      return (
        <div className="px-3 sm:px-4 md:px-5 py-1.5 h-[26px] sm:h-[28px]"></div>
      );
    }
    let IconComponent: React.ElementType | null = null;
    let iconColor = "text-muted-foreground"; // Default color
    switch (currentRarity) {
      case RARITY_LEVELS.UNCOMMON:
        IconComponent = Sparkle;
        iconColor = "text-sky-500";
        break;
      case RARITY_LEVELS.RARE:
        IconComponent = Award;
        iconColor = "text-blue-600";
        break;
      case RARITY_LEVELS.EPIC:
        IconComponent = Gem;
        iconColor = "text-purple-600";
        break;
      case RARITY_LEVELS.LEGENDARY:
        IconComponent = Crown;
        iconColor = "text-amber-500";
        break;
    }
    if (!IconComponent)
      return (
        <div className="px-3 sm:px-4 md:px-5 py-1.5 h-[26px] sm:h-[28px]"></div>
      ); // Fallback for layout

    const tooltipContent = (
      <>
        <p className="font-semibold">{currentRarity}</p>
        {rarityReason && (
          <p className="text-xs text-muted-foreground max-w-xs">
            {rarityReason}
          </p>
        )}
      </>
    );
    return (
      <div className="px-3 sm:px-4 md:px-5 py-1.5 text-right h-[26px] sm:h-[28px] flex items-center justify-end">
        {" "}
        {/* Ensures consistent height */}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconComponent
                className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)}
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
              className="bg-popover text-popover-foreground p-2 rounded-md shadow-lg text-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const handleCardFlipInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    // Check if the click originated from an interactive child element
    let target = e.target as HTMLElement;
    while (target && target !== (e.currentTarget as HTMLElement)) {
      if (
        target.dataset.interactiveChild === "true" || // Check for our custom data attribute
        ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(
          target.tagName
        ) || // Standard interactive elements
        target.getAttribute("role") === "button" || // ARIA role
        target.closest("[data-radix-interactive]") // For Radix UI components
      ) {
        return; // Don't flip if click was on an interactive child
      }
      target = target.parentElement as HTMLElement;
    }

    // Proceed with flip if not on an interactive child
    if (e.type === "click") {
      onFlip();
    } else if (e.type === "keydown") {
      const keyboardEvent = e as React.KeyboardEvent<HTMLDivElement>;
      // Only flip on Enter/Space if the card itself is focused (not an inner element)
      if (
        (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") &&
        document.activeElement === e.currentTarget
      ) {
        keyboardEvent.preventDefault(); // Prevent default space scroll
        onFlip();
      }
    }
  };

  const socialBarContent = (faceName: "front" | "back") =>
    socialInteractions ? (
      <div
        className={cn(
          "transition-all duration-300 ease-in-out z-10 mt-auto shrink-0", // mt-auto pushes to bottom
          "opacity-0 group-hover:opacity-100", // Controlled by group hover
          "translate-y-full group-hover:translate-y-0", // Slide in effect
          // Pointer events for the social bar wrapper
          (faceName === "front" && isFlipped) ||
            (faceName === "back" && !isFlipped)
            ? "pointer-events-none" // Hidden social bar wrapper is not interactive
            : "pointer-events-auto" // Visible social bar wrapper is interactive
        )}
        data-interactive-child="true" // Mark social bar itself as interactive
      >
        <SocialBar
          interactions={socialInteractions}
          cardContext={cardContext}
          isLikedByCurrentUser={isLikedByCurrentUser}
          isSavedByCurrentUser={isSavedByCurrentUser}
          debugFaceName={faceName}
          likeCount={likeCount}
          commentCount={commentCount}
          collectionCount={collectionCount}
          // className="border-t border-transparent group-hover:border-border/20 pt-1.5" // Optional styling
        />
      </div>
    ) : null;

  return (
    <div style={outerStyle} className={cn("group", className)}>
      {" "}
      {/* 'group' for hover effects on children */}
      <div
        style={innerCardDynamicStyles}
        className={cn(innerCardClassName)} // Allows custom styling for the flipping element
        data-testid="base-card-inner">
        {/* Card Front Face */}
        <ShadCard
          style={{
            ...cardSurfaceBaseStyle,
            pointerEvents: isFlipped ? "none" : "auto",
          }}
          className={cn(
            "card-face-wrapper overflow-hidden rounded-2xl shadow-lg"
          )} // Base styling for a card face
          onClick={!isFlipped ? handleCardFlipInteraction : undefined}
          onKeyDown={!isFlipped ? handleCardFlipInteraction : undefined}
          role="button" // Make it keyboard accessible for flipping
          tabIndex={!isFlipped ? 0 : -1} // Focusable only when visible
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }
          aria-pressed={isFlipped} // Indicates if the "back" (flipped state) is active
          aria-hidden={isFlipped} // Hide from assistive tech when not visible
        >
          {deleteButtonElement}
          {actualIdentityHeaderElement}
          {RarityIconOnFront()}
          {/* Main content area for the front face */}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {faceContent}
          </div>
          {socialBarContent("front")}
        </ShadCard>

        {/* Card Back Face */}
        <ShadCard
          style={{
            ...cardSurfaceBaseStyle,
            ...backFaceTransformStyle,
            pointerEvents: isFlipped ? "auto" : "none",
          }}
          className={cn(
            "card-back-wrapper overflow-hidden rounded-2xl shadow-lg"
          )} // Base styling for a card face
          onClick={isFlipped ? handleCardFlipInteraction : undefined}
          onKeyDown={isFlipped ? handleCardFlipInteraction : undefined}
          role="button"
          tabIndex={isFlipped ? 0 : -1}
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }
          aria-hidden={!isFlipped}>
          {deleteButtonElement} {/* Also show delete on back if needed */}
          {headerPlaceholderElementForBack} {/* Maintain layout consistency */}
          {RarityReasonOnBackHeader}
          {/* Main content area for the back face */}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {backContent}
          </div>
          {socialBarContent("back")}
        </ShadCard>
      </div>
      {children}{" "}
      {/* For potential overlays or absolute positioned elements outside the flip */}
    </div>
  );
};

export default BaseCard;
