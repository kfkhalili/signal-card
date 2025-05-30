// src/components/game/cards/base-card/BaseCard.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  OnGenericInteraction,
  RequestNewCardInteraction,
  NavigateExternalInteraction,
} from "./base-card.types";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  cardContext: CardActionContext;
  onDeleteRequest?: (context: CardActionContext) => void;
  onFlip: () => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
  onGenericInteraction: OnGenericInteraction;
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
  transform: "rotateY(180deg) translateZ(0px)",
};

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  onDeleteRequest,
  onFlip,
  className,
  innerCardClassName,
  children,
  onGenericInteraction,
}) => {
  const {
    id: sourceCardId,
    symbol: sourceCardSymbol,
    type: sourceCardType,
    companyName,
    logoUrl,
    websiteUrl,
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
      aria-label={`Delete ${sourceCardSymbol} card`}
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
    const payload: RequestNewCardInteraction = {
      intent: "REQUEST_NEW_CARD",
      sourceCardId,
      sourceCardSymbol,
      sourceCardType,
      targetCardType: "profile",
      originatingElement: "cardHeaderNameSymbol",
    };
    onGenericInteraction(payload);
  };

  const handleLogoClick = (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    if (websiteUrl) {
      const payload: NavigateExternalInteraction = {
        intent: "NAVIGATE_EXTERNAL",
        sourceCardId,
        sourceCardSymbol,
        sourceCardType,
        url: websiteUrl,
        navigationTargetName: `${companyName || sourceCardSymbol} website`,
        originatingElement: "cardHeaderLogo",
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
        alt={`${companyName || sourceCardSymbol} logo`}
        fill
        sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px"
        className="object-contain rounded"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
        }}
        priority={false}
      />
    </div>
  ) : (
    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
      {sourceCardSymbol ? sourceCardSymbol.charAt(0) : "?"}
    </div>
  );

  const clickableLogoElement = websiteUrl ? (
    <ClickableDataItem
      isInteractive={true}
      onClickHandler={handleLogoClick}
      baseClassName="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full"
      aria-label={`Visit ${companyName || sourceCardSymbol} website`}
      data-interactive-child="true"
      title={`Visit ${companyName || sourceCardSymbol} website`}
      role="link">
      {logoImageElement}
    </ClickableDataItem>
  ) : (
    logoImageElement
  );

  const identityHeaderContent = (
    <>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3 self-start">
        {clickableLogoElement}
      </div>
      <ClickableDataItem
        isInteractive={true}
        onClickHandler={handleHeaderTextClick}
        className={cn(
          "text-right min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]",
          "flex flex-col justify-center"
        )}
        style={{ minHeight: "4.25rem" }}
        aria-label={`View profile for ${companyName || sourceCardSymbol}`}
        data-interactive-child="true"
        data-testid="header-text-clickable">
        <CardTitle
          className={cn(
            "text-sm sm:text-base md:text-lg font-semibold leading-tight line-clamp-2 text-right"
          )}
          title={companyName || sourceCardSymbol}>
          {companyName || sourceCardSymbol}
        </CardTitle>
        <div className="h-[1.1em] sm:h-[1.2em] md:h-[1.25em] flex items-end justify-end">
          {companyName && (
            <p
              className="text-xs sm:text-sm text-muted-foreground truncate leading-tight pt-[1px] sm:pt-[2px]"
              title={sourceCardSymbol}>
              ({sourceCardSymbol})
            </p>
          )}
          {!companyName && sourceCardType === "price" && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px] capitalize">
              {sourceCardType} Quote
            </p>
          )}
          {!companyName && sourceCardType === "profile" && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px] capitalize">
              {sourceCardSymbol} Profile
            </p>
          )}
          {!companyName && sourceCardType === "revenue" && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight pt-[1px] sm:pt-[2px] capitalize">
              {sourceCardSymbol} Financials
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
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10" />
        </div>
        <div
          className="min-w-0 max-w-[calc(100%-3rem-12px)] sm:max-w-[calc(100%-3.5rem-12px)] md:max-w-[calc(100%-4rem-12px)]"
          style={{ minHeight: "4.25rem" }}
        />
      </div>
    </div>
  );

  const handleCardFlipInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    let target = e.target as HTMLElement;
    while (target && target !== e.currentTarget) {
      if (
        target.dataset.interactiveChild === "true" ||
        ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(
          target.tagName
        ) ||
        target.getAttribute("role") === "button" ||
        target.getAttribute("role") === "link" ||
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
      // Focus logic can be added here if needed after flip
    }, 0);

    return () => clearTimeout(timer);
  }, [isFlipped]);

  const frontFaceInert = isFlipped;
  const backFaceInert = !isFlipped;

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
            transform: "translateZ(0px)",
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
              ? `Show ${sourceCardSymbol} front details`
              : `Show ${sourceCardSymbol} back details`
          }
          aria-pressed={isFlipped}
          inert={frontFaceInert ? true : undefined}
          aria-hidden={isFlipped ? "true" : "false"}>
          {deleteButtonElement}
          {actualIdentityHeaderElement}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {faceContent}
          </div>
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
              ? `Show ${sourceCardSymbol} front details`
              : `Show ${sourceCardSymbol} back details`
          }
          aria-pressed={!isFlipped}
          inert={backFaceInert ? true : undefined}
          aria-hidden={!isFlipped ? "true" : "false"}>
          {deleteButtonElement}
          {headerPlaceholderElementForBack}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:px-5 md:pb-5 md:pt-2">
            {backContent}
          </div>
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
