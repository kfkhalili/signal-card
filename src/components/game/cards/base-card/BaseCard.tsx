// src/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon, Sparkle, Award, Gem, Crown } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "./base-card.types"; // Ensure this path is correct
import { SocialBar } from "@/components/ui/social-bar"; // Ensure this path is correct
import { ClickableDataItem } from "@/components/ui/ClickableDataItem"; // Ensure this path is correct
import { RARITY_LEVELS } from "@/components/game/rarityCalculator"; // Ensure this path is correct
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Ensure this path is correct

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  cardContext: CardActionContext; // This should now include websiteUrl

  currentRarity?: string | null;
  rarityReason?: string | null;

  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onFlip: () => void;
  onHeaderClick?: (context: CardActionContext) => void; // For clicking company name/symbol text
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For overlays or additional elements not part of face/back
}

// CSS-in-JS for card flip mechanics (can be moved to a CSS file if preferred)
const outerStyle: React.CSSProperties = {
  perspective: "1000px",
  position: "relative", // Ensures children are positioned relative to this
};

const cardSurfaceBaseStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backfaceVisibility: "hidden", // Hide the back of the element when facing away
  WebkitBackfaceVisibility: "hidden", // For Safari
  display: "flex",
  flexDirection: "column",
  cursor: "pointer", // Indicates the card is interactive (flippable)
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
}) => {
  // Destructure all necessary fields from cardContext, including the new websiteUrl
  const {
    symbol,
    companyName,
    logoUrl,
    websiteUrl,
    type: cardType,
  } = cardContext;

  // Dynamic styles for the inner div that handles the flip animation
  const innerCardDynamicStyles: React.CSSProperties = {
    position: "relative", // Important for absolute positioning of faces
    width: "100%",
    height: "100%",
    transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
    transformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  // Handler for delete button click
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when delete button is clicked
    onDeleteRequest?.(cardContext);
  };

  // Delete button element, rendered only if onDeleteRequest is provided
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

  // Handler for clicking the company name/symbol text area in the header
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

  // Base class names for the header wrapper to ensure consistent padding and min-height
  const headerWrapperClassNames =
    "px-3 sm:px-4 md:px-5 pb-1 pt-3 sm:pt-4 shrink-0 min-h-[56px] sm:min-h-[64px] md:min-h-[72px]";

  // Logo image element
  const logoImageElement = logoUrl ? (
    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 relative shrink-0">
      <Image
        src={logoUrl}
        alt={`${companyName || symbol} logo`}
        fill
        sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px"
        className="object-contain rounded drop-shadow-sm"
        unoptimized={!logoUrl.startsWith("/")} // Assuming external logos might not be optimized by Next/Image
        priority // Consider if logo is critical for LCP
      />
    </div>
  ) : null;

  // Conditionally wrap logo with an anchor tag if websiteUrl is available
  const clickableLogoElement =
    logoUrl && websiteUrl ? (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // IMPORTANT: Prevents card flip
        className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full"
        aria-label={`Visit ${companyName || symbol} website`}
        data-interactive-child="true" // Mark as interactive for flip prevention logic
        title={`Visit ${companyName || symbol} website`}>
        {logoImageElement}
      </a>
    ) : (
      logoImageElement // Render just the image if no website URL
    );

  // Content for the card header (logo, company name, symbol)
  const identityHeaderContent = (
    <>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3 self-start">
        {clickableLogoElement} {/* Use the potentially clickable logo */}
      </div>
      <ClickableDataItem
        isInteractive={!!onHeaderClick}
        onClickHandler={onHeaderClick ? handleHeaderTextClick : undefined}
        // Adjusted max-width to account for logo and its potential link taking up space
        className={cn(
          "text-right min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]", // Adjust based on logo size and spacing
          "flex flex-col justify-center"
        )}
        style={{ minHeight: "4.25rem" }} // Ensure consistent height for header text area
        aria-label={
          onHeaderClick
            ? `View details for ${companyName || symbol}`
            : undefined
        }
        data-interactive-child={!!onHeaderClick} // Mark as interactive
        data-testid="header-text-clickable">
        <CardTitle
          className={cn(
            "text-sm sm:text-base md:text-lg font-semibold leading-tight line-clamp-2 text-right"
          )}
          title={companyName || symbol}>
          {companyName || symbol}
        </CardTitle>
        <div className="h-[1.1em] sm:h-[1.2em] md:h-[1.25em] flex items-end justify-end">
          {companyName && ( // Show symbol if company name is present
            <p
              className="text-xs sm:text-sm text-muted-foreground truncate leading-tight pt-[1px] sm:pt-[2px]"
              title={symbol}>
              ({symbol})
            </p>
          )}
          {!companyName &&
            cardType === "price" && ( // For price cards without a company name, show "Quote"
              <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px]">
                Quote
              </p>
            )}
        </div>
      </ClickableDataItem>
    </>
  );

  // The actual header element structure
  const actualIdentityHeaderElement = (
    <div
      className={cn(
        "flex justify-between items-start",
        headerWrapperClassNames
      )}>
      {identityHeaderContent}
    </div>
  );

  // Placeholder for the back face header to maintain layout consistency during flip
  const headerPlaceholderElementForBack = (
    <div
      className={cn("invisible", headerWrapperClassNames)}
      aria-hidden="true">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"></div>{" "}
          {/* Placeholder for logo space */}
        </div>
        <div
          className="min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]"
          style={{ minHeight: "4.25rem" }}></div>{" "}
        {/* Placeholder for text area space */}
      </div>
    </div>
  );

  // Displays rarity reason on the back face header area
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

  // Displays rarity icon on the front face, below the header
  const RarityIconOnFront = () => {
    if (!currentRarity || currentRarity === RARITY_LEVELS.COMMON) {
      return (
        <div className="px-3 sm:px-4 md:px-5 py-1.5 h-[26px] sm:h-[28px]"></div>
      ); // Placeholder for height
    }

    let IconComponent: React.ElementType | null = null;
    let iconColor = "text-muted-foreground";

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
      );

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

  // Social interaction bar, shown on group hover
  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out z-10 mt-auto shrink-0",
        "opacity-0 group-hover:opacity-100", // Show on group hover
        "translate-y-full group-hover:translate-y-0" // Slide in from bottom on group hover
      )}
      onClick={(e) => e.stopPropagation()} // Prevent card flip
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  // Main card flip interaction handler
  const handleCardFlipInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    // Traverse up the DOM tree from the event target
    // If any parent element up to the currentTarget has 'data-interactive-child="true"',
    // or is a common interactive element, then don't flip the card.
    let target = e.target as HTMLElement;
    while (target && target !== (e.currentTarget as HTMLElement)) {
      if (
        target.dataset.interactiveChild === "true" ||
        ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(
          target.tagName
        ) ||
        target.getAttribute("role") === "button" || // Check for role="button" as well
        target.closest("[data-radix-interactive]") // Check for Radix UI interactive elements
      ) {
        return; // Don't flip
      }
      target = target.parentElement as HTMLElement;
    }

    // Proceed with flip if no interactive child was clicked
    if (e.type === "click") {
      onFlip();
    } else if (e.type === "keydown") {
      const keyboardEvent = e as React.KeyboardEvent<HTMLDivElement>;
      // Flip on Enter or Space, but only if the card itself is focused (not an input inside)
      if (
        (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") &&
        document.activeElement === e.currentTarget
      ) {
        keyboardEvent.preventDefault(); // Prevent default spacebar scroll
        onFlip();
      }
    }
  };

  return (
    <div style={outerStyle} className={cn("group", className)}>
      {" "}
      {/* 'group' for hover effects on children */}
      <div
        style={innerCardDynamicStyles}
        className={cn(innerCardClassName)}
        data-testid="base-card-inner">
        {/* Card Front Face */}
        <ShadCard
          style={cardSurfaceBaseStyle}
          className="card-face-wrapper overflow-hidden rounded-2xl shadow-lg"
          onClick={handleCardFlipInteraction}
          onKeyDown={handleCardFlipInteraction}
          role="button" // Make it keyboard accessible for flipping
          tabIndex={0} // Make it focusable
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }
          aria-pressed={isFlipped} // Indicates the state of the "flip"
        >
          {deleteButtonElement}
          {actualIdentityHeaderElement}
          {RarityIconOnFront()}
          {/* Main content area for the face */}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {faceContent}
          </div>
          {socialBarElement}
        </ShadCard>

        {/* Card Back Face */}
        <ShadCard
          style={{ ...cardSurfaceBaseStyle, ...backFaceTransformStyle }}
          className="card-back-wrapper overflow-hidden rounded-2xl shadow-lg"
          onClick={handleCardFlipInteraction}
          onKeyDown={handleCardFlipInteraction}
          role="button"
          tabIndex={-1} // Not focusable when it's the back face (to avoid double tabbing)
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }
          aria-hidden={!isFlipped} // Hide from accessibility tree when not visible
        >
          {deleteButtonElement}{" "}
          {/* Delete button also on back for consistency */}
          {headerPlaceholderElementForBack} {/* Maintain structure */}
          {RarityReasonOnBackHeader}
          {/* Main content area for the back */}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {backContent}
          </div>
          {socialBarElement} {/* Social bar also on back */}
        </ShadCard>
      </div>
      {children}{" "}
      {/* For potential overlays or absolute positioned elements outside the flip */}
    </div>
  );
};

export default BaseCard;
