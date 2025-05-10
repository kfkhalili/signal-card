/**
 * src/app/components/game/cards/base-card/BaseCard.tsx
 */

import React from "react";
import { Card as ShadCard } from "@/components/ui/card"; // Assuming ShadCard is from shadcn/ui
import { cn } from "@/lib/utils";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For elements like snapshot/delete buttons overlaid
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  className,
  innerCardClassName,
  children,
}) => {
  return (
    <div className={cn("group perspective", className)}>
      <div
        className={cn(
          "relative preserve-3d w-full h-full duration-700 ease-out",
          isFlipped ? "rotate-y-180" : "",
          innerCardClassName
        )}
      >
        {/* Front Face */}
        <ShadCard className="absolute w-full h-full backface-hidden overflow-hidden pointer-events-none">
          {faceContent}
        </ShadCard>
        {/* Back Face */}
        <ShadCard className="absolute w-full h-full backface-hidden rotate-y-180 overflow-hidden pointer-events-none">
          {backContent}
        </ShadCard>
      </div>
      {/* Children are rendered outside the flipping mechanism but within the perspective group */}
      {children}
    </div>
  );
};

export default BaseCard;
