// src/components/game/base-display-card.tsx
import React from 'react';
import { Card as ShadCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BaseDisplayCardProps {
  isFlipped: boolean;
  // REMOVED onCardClick prop
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  innerCardClassName?: string;
}

const BaseDisplayCard: React.FC<BaseDisplayCardProps> = ({
  isFlipped,
  // onCardClick, // REMOVED
  faceContent,
  backContent,
  children,
  className,
  innerCardClassName,
}) => {
  return (
    // No onClick here
    <div className={cn('relative w-full h-full group perspective', className)}>
      {/* Visual Faces - these are now non-interactive for direct clicks */}
      <ShadCard
        className={cn(
          'absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden pointer-events-none',
          !isFlipped ? 'rotate-y-0' : 'rotate-y-minus-180',
          innerCardClassName
        )}
      >
        {faceContent} {/* Interactive elements within CardFace need pointer-events-auto & z-index */}
      </ShadCard>
      <ShadCard
        className={cn(
          'absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden pointer-events-none',
          isFlipped ? 'rotate-y-0' : 'rotate-y-180',
          innerCardClassName
        )}
      >
        {backContent} {/* Interactive elements within CardFace need pointer-events-auto & z-index */}
      </ShadCard>
      
      {/* Children overlays - container is pointer-events-none, specific children are pointer-events-auto */}
      {children && <div className="absolute inset-0 z-10 pointer-events-none">{children}</div>}
    </div>
  );
};

export default BaseDisplayCard;
