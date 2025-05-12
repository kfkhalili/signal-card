// src/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "./base-card.types";
import { SocialBar } from "@/components/ui/social-bar";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onFlip: () => void;
  onHeaderClick?: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For overlays or other absolutely positioned elements relative to the card
}

// Define these style objects outside the component if they don't depend on props
const outerStyle: React.CSSProperties = {
  perspective: "1000px",
  position: "relative", // Added for potential children positioning
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
  cursor: "pointer", // Base cursor for flippable area
};

const backFaceTransformStyle: React.CSSProperties = {
  transform: "rotateY(180deg)",
};

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  socialInteractions,
  onDeleteRequest,
  onFlip,
  onHeaderClick,
  className,
  innerCardClassName,
  children,
}) => {
  const { symbol, companyName, logoUrl } = cardContext;

  const innerCardDynamicStyles: React.CSSProperties = {
    position: "relative",
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
        "absolute top-1 right-1 z-30 p-1 flex items-center justify-center transition-all", // Adjusted padding and position
        "text-muted-foreground/60 hover:text-destructive rounded-full hover:bg-destructive/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "opacity-0 group-hover:opacity-100 duration-200 ease-in-out"
      )}
      data-interactive-child="true" // Mark as interactive child
    >
      <XIcon size={16} strokeWidth={2.5} />{" "}
      {/* Slightly larger for easier clicking */}
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

  // Defines overall header padding and the min-height for its content area (logo + text).
  // md:min-h-[72px] means the content area (logo + text block) has at least 72px height on medium screens.
  const headerWrapperClassNames =
    "px-3 sm:px-4 md:px-5 pb-2 pt-6 sm:pt-7 shrink-0 min-h-[56px] sm:min-h-[64px] md:min-h-[72px]";

  // This is the content of the header (logo + text block)
  const identityHeaderContent = (
    <>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3 self-start pt-px">
        {logoUrl && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 relative">
            <Image
              src={logoUrl}
              alt={`${companyName || symbol} logo`}
              fill
              sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px"
              className="object-contain rounded drop-shadow-sm"
              unoptimized={!logoUrl.startsWith("/")} // Assuming internal paths are optimized
            />
          </div>
        )}
      </div>
      <ClickableDataItem
        isInteractive={!!onHeaderClick}
        onClickHandler={onHeaderClick ? handleHeaderTextClick : undefined}
        className={cn(
          "text-right min-w-0 max-w-[60%] sm:max-w-[65%]", // Ensure it doesn't overflow
          "flex flex-col justify-center" // Vertically center its content
        )}
        style={{
          // Target height for ~3 lines of md:text-lg.
          // text-lg (1.125rem) with leading-tight (1.25) -> line-height: ~1.4rem.
          // 3 lines * 1.4rem = 4.2rem. Using 4.25rem (68px) for a slight buffer.
          // This ensures this text block reserves consistent space.
          minHeight: "4.25rem",
        }}
        aria-label={
          onHeaderClick
            ? `View details for ${companyName || symbol}`
            : undefined
        }
        data-interactive-child={!!onHeaderClick} // Mark as interactive if it has a click handler
        data-testid="header-text-clickable">
        <CardTitle // This is a div from shadcn/ui
          className={cn(
            "text-sm sm:text-base md:text-lg font-semibold leading-tight line-clamp-2",
            "text-right"
          )}
          title={companyName || symbol}>
          {companyName || symbol}
        </CardTitle>
        {/* This div helps reserve space for the symbol/Quote text, acting as the third line */}
        <div className="h-[1.1em] sm:h-[1.2em] md:h-[1.25em] flex items-end justify-end">
          {" "}
          {/* Approx 1 line height for this text, aligned to bottom of its space */}
          {companyName && (
            <p
              className="text-xs sm:text-sm text-muted-foreground truncate leading-tight pt-[1px] sm:pt-[2px]"
              title={symbol}>
              ({symbol})
            </p>
          )}
          {!companyName && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px]">
              Quote
            </p>
          )}
        </div>
      </ClickableDataItem>
    </>
  );

  const actualIdentityHeaderElement = (
    <div
      className={cn(
        "flex justify-between items-start",
        headerWrapperClassNames
      )}>
      {identityHeaderContent}
    </div>
  );

  // Placeholder for the back of the card to maintain layout consistency
  const headerPlaceholderElement = (
    <div
      className={cn("invisible", headerWrapperClassNames)}
      aria-hidden="true">
      {/* Simplified structure to mimic height drivers if necessary,
           but min-height on headerWrapperClassNames should handle it.
           Forcing content ensures flexbox calculates height similarly.
       */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"></div>{" "}
          {/* Logo placeholder */}
        </div>
        <div
          className="min-w-0 max-w-[60%] sm:max-w-[65%]"
          style={{ minHeight: "4.25rem" }}></div>{" "}
        {/* Text block placeholder */}
      </div>
    </div>
  );

  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out z-10 mt-auto shrink-0",
        "opacity-0 group-hover:opacity-100",
        "translate-y-full group-hover:translate-y-0"
      )}
      onClick={(e) => e.stopPropagation()} // Prevent card flip when interacting with social bar
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  const handleCardFlipInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    // Check if the event target or its parent is an interactive child
    let target = e.target as HTMLElement;
    while (target && target !== (e.currentTarget as HTMLElement)) {
      if (
        target.dataset.interactiveChild === "true" ||
        ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return; // Don't flip if an interactive child was clicked/activated
      }
      target = target.parentElement as HTMLElement;
    }

    // Proceed with flip if it's a click or appropriate keydown
    if (e.type === "click") {
      onFlip();
    } else if (e.type === "keydown") {
      const keyboardEvent = e as React.KeyboardEvent<HTMLDivElement>;
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
          role="button"
          tabIndex={0} // Make the card focusable
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }>
          {deleteButtonElement}
          {actualIdentityHeaderElement}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:p-5 pt-0">
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
          tabIndex={-1} // Only one face should be in tab order at a time generally, or manage focus
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }>
          {deleteButtonElement}
          {headerPlaceholderElement}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:p-5 pt-0">
            {backContent}
          </div>
          {socialBarElement}
        </ShadCard>
      </div>
      {children}{" "}
      {/* For overlays or other elements positioned relative to the outer card div */}
    </div>
  );
};

export default BaseCard;
