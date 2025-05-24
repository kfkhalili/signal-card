// src/components/game/cards/base-card/BaseCard.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon, Sparkle, Award, Gem, Crown } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  OnGenericInteraction,
  InteractionPayload,
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
  isSaveDisabled?: boolean; // New prop
  onGenericInteraction?: OnGenericInteraction;
}

const outerStyle: React.CSSProperties = {
  perspective: "1000px",
  position: "relative",
};

const cardSurfaceBaseStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
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
  isSaveDisabled,
  onGenericInteraction,
}) => {
  const {
    symbol,
    companyName,
    logoUrl,
    websiteUrl,
    type: cardType,
  } = cardContext;

  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);
  const innerCardRef = useRef<HTMLDivElement>(null);

  const innerCardDynamicStyles: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
    transformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        "opacity-0 group-hover:opacity-100 duration-200 ease-in-out"
      )}
      data-interactive-child="true">
      <XIcon size={16} strokeWidth={2.5} />
    </button>
  ) : null;

  const handleHeaderTextClick = (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    if (onGenericInteraction) {
      const payload: InteractionPayload = {
        sourceCardId: cardContext.id,
        sourceCardSymbol: cardContext.symbol,
        sourceCardType: cardContext.type,
        interactionTarget: "card",
        targetType: "profile", // Default: header click on any card requests a profile card for that symbol
      };
      onGenericInteraction(payload);
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
        sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px"
        className="object-contain rounded"
        onError={(e) => (e.currentTarget.style.display = "none")}
        priority={false}
      />
    </div>
  ) : (
    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
      {symbol ? symbol.charAt(0) : "?"}
    </div>
  );

  const clickableLogoElement =
    logoUrl && websiteUrl ? (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full"
        aria-label={`Visit ${companyName || symbol} website`}
        data-interactive-child="true"
        title={`Visit ${companyName || symbol} website`}>
        {logoImageElement}
      </a>
    ) : (
      logoImageElement
    );

  const identityHeaderContent = (
    <>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3 self-start">
        {clickableLogoElement}
      </div>
      <ClickableDataItem
        isInteractive={!!onGenericInteraction}
        onClickHandler={
          onGenericInteraction ? handleHeaderTextClick : undefined
        }
        className={cn(
          "text-right min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]",
          "flex flex-col justify-center"
        )}
        style={{ minHeight: "4.25rem" }}
        aria-label={
          onHeaderClick
            ? `View details for ${companyName || symbol}`
            : undefined
        }
        data-interactive-child={!!onHeaderClick}
        data-testid="header-text-clickable">
        <CardTitle
          className={cn(
            "text-sm sm:text-base md:text-lg font-semibold leading-tight line-clamp-2 text-right"
          )}
          title={companyName || symbol}>
          {companyName || symbol}
        </CardTitle>
        <div className="h-[1.1em] sm:h-[1.2em] md:h-[1.25em] flex items-end justify-end">
          {companyName && (
            <p
              className="text-xs sm:text-sm text-muted-foreground truncate leading-tight pt-[1px] sm:pt-[2px]"
              title={symbol}>
              ({symbol})
            </p>
          )}
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
        "flex justify-between items-start",
        headerWrapperClassNames
      )}>
      {identityHeaderContent}
    </div>
  );

  const headerPlaceholderElementForBack = (
    <div
      className={cn("invisible", headerWrapperClassNames)}
      aria-hidden="true">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"></div>
        </div>
        <div
          className="min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]"
          style={{ minHeight: "4.25rem" }}></div>
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
      return (
        <div className="px-3 sm:px-4 md:px-5 py-1.5 h-[26px] sm:h-[28px]"></div>
      );
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

  const handleCardFlipInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    let target = e.target as HTMLElement;
    while (target && target !== (e.currentTarget as HTMLElement)) {
      if (
        target.dataset.interactiveChild === "true" ||
        ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(
          target.tagName
        ) ||
        target.getAttribute("role") === "button" ||
        target.closest("[data-radix-interactive]")
      ) {
        return;
      }
      target = target.parentElement as HTMLElement;
    }

    if (document.activeElement === frontFaceRef.current && !isFlipped) {
      frontFaceRef.current?.blur();
    } else if (document.activeElement === backFaceRef.current && isFlipped) {
      backFaceRef.current?.blur();
    }

    if (e.type === "click") {
      onFlip();
    } else if (e.type === "keydown") {
      const keyboardEvent = e as React.KeyboardEvent<HTMLDivElement>;
      if (
        (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") &&
        document.activeElement === e.currentTarget
      ) {
        keyboardEvent.preventDefault();
        onFlip();
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFlipped) {
        // Focus logic for back face
      } else {
        // Focus logic for front face
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isFlipped]);

  const socialBarContent = (faceName: "front" | "back") => {
    const currentInteractions = isSaveDisabled
      ? { ...socialInteractions, onSave: undefined }
      : socialInteractions;

    return currentInteractions ? (
      <div
        className={cn(
          "transition-all duration-300 ease-in-out z-10 mt-auto shrink-0",
          "opacity-0 group-hover:opacity-100",
          "translate-y-full group-hover:translate-y-0",
          (faceName === "front" && isFlipped) ||
            (faceName === "back" && !isFlipped)
            ? "pointer-events-none"
            : "pointer-events-auto"
        )}
        data-interactive-child="true">
        <SocialBar
          interactions={currentInteractions}
          cardContext={cardContext}
          isLikedByCurrentUser={isLikedByCurrentUser}
          isSavedByCurrentUser={isSavedByCurrentUser}
          debugFaceName={faceName}
          likeCount={likeCount}
          commentCount={commentCount}
          collectionCount={collectionCount}
        />
      </div>
    ) : null;
  };

  return (
    <div style={outerStyle} className={cn("group", className)}>
      <div
        ref={innerCardRef}
        style={innerCardDynamicStyles}
        className={cn(innerCardClassName)}
        data-testid="base-card-inner">
        <ShadCard
          ref={frontFaceRef}
          style={{
            ...cardSurfaceBaseStyle,
            pointerEvents: isFlipped ? "none" : "auto",
          }}
          className={cn(
            "card-face-wrapper overflow-hidden rounded-2xl shadow-lg"
          )}
          onClick={!isFlipped ? handleCardFlipInteraction : undefined}
          onKeyDown={!isFlipped ? handleCardFlipInteraction : undefined}
          role="button"
          tabIndex={!isFlipped ? 0 : -1}
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }
          aria-pressed={isFlipped}
          inert={isFlipped ? true : undefined}
          aria-hidden={isFlipped ? "true" : "false"}>
          {deleteButtonElement}
          {actualIdentityHeaderElement}
          {RarityIconOnFront()}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {faceContent}
          </div>
          {socialBarContent("front")}
        </ShadCard>

        <ShadCard
          ref={backFaceRef}
          style={{
            ...cardSurfaceBaseStyle,
            ...backFaceTransformStyle,
            pointerEvents: isFlipped ? "auto" : "none",
          }}
          className={cn(
            "card-back-wrapper overflow-hidden rounded-2xl shadow-lg"
          )}
          onClick={isFlipped ? handleCardFlipInteraction : undefined}
          onKeyDown={isFlipped ? handleCardFlipInteraction : undefined}
          role="button"
          tabIndex={isFlipped ? 0 : -1}
          aria-label={
            isFlipped
              ? `Show ${symbol} front details`
              : `Show ${symbol} back details`
          }
          inert={!isFlipped ? true : undefined}
          aria-hidden={!isFlipped ? "true" : "false"}>
          {deleteButtonElement}
          {headerPlaceholderElementForBack}
          {RarityReasonOnBackHeader}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {backContent}
          </div>
          {socialBarContent("back")}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
