"use client";

import React from 'react';
import type { DiscoveredCard } from './types';
import LogCardFace from './log-card-face'; // Refactored version
import BaseDisplayCard from './base-display-card'; // New import
import { Button } from '@/components/ui/button'; // For Delete button
import { Badge } from '@/components/ui/badge';   // For NEW badge
import { X } from 'lucide-react';               // For Delete icon
import { cn } from '@/lib/utils';

interface LogCardProps {
  card: DiscoveredCard;
  onToggleFlip: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

const LogCard: React.FC<LogCardProps> = ({ card, onToggleFlip, onDeleteCard }) => {
  
  const handleCardClick = () => {
    onToggleFlip(card.id);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); 
    onDeleteCard(card.id);
  };

  const frontFace = <LogCardFace card={card} isBack={false} />;
  const backFace = <LogCardFace card={card} isBack={true} />;
  const isNewAndUnflipped = card.hasBeenFlippedAtLeastOnce === false && !card.isFlipped;

  return (
    <div
      className="log-card-wrapper w-64 h-80 relative group/logcard shadow-md hover:shadow-xl transition-shadow rounded-lg" 
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={`Discovered card ${card.id}, type ${card.type}. ${card.isFlipped ? "Showing back." : "Showing front."} Click to flip.`}
    >
      <BaseDisplayCard
        isFlipped={card.isFlipped}
        onCardClick={handleCardClick}
        faceContent={frontFace}
        backContent={backFace}
        className="w-full h-full"
      >
        <>
          {isNewAndUnflipped && (
            <Badge variant="default" className="absolute top-2 right-2 text-xs px-1.5 py-0.5 h-5 z-20 pointer-events-none">
              NEW
            </Badge>
          )}
          {!card.isFlipped && ( 
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-destructive opacity-0 group-hover/logcard:opacity-100 transition-opacity z-20 pointer-events-auto"
              onClick={handleDeleteClick}
              aria-label="Delete card"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </>
      </BaseDisplayCard>
    </div>
  );
};

export default LogCard;
