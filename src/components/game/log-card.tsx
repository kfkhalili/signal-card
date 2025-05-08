
"use client";

import React from 'react';
import type { DiscoveredCard } from './types'; // Updated type import
import LogCardFace from './log-card-face';
import { cn } from '@/lib/utils';

interface LogCardProps {
  card: DiscoveredCard; // Renamed prop and updated type
  onToggleFlip: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void; // Renamed prop
}

const LogCard: React.FC<LogCardProps> = ({ card, onToggleFlip, onDeleteCard }) => { // Renamed props
  const handleCardClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('[aria-label="Delete card"]')) { // Updated aria-label check
      return;
    }
    onToggleFlip(card.id);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); 
    onDeleteCard(card.id); // Use renamed prop
  };

  const cardContainerClasses = cn(
    'card-container group/logcard w-64 h-80 cursor-pointer relative', 
    { 'is-flipped': card.isFlipped },
    'shadow-md hover:shadow-xl transition-shadow'
  );

  return (
    <div
      className={cardContainerClasses}
      onClick={handleCardClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick(e)}
      role="button"
      tabIndex={0}
      aria-label={`Discovered card ${card.id}, type ${card.type}. ${card.isFlipped ? "Showing back." : "Showing front."} Click to flip, or use delete button on hover.`} // Updated aria-label
    >
      <div className="card-inner">
        <LogCardFace card={card} isBack={false} onDelete={handleDeleteClick} /> {/* Pass card prop */}
        <LogCardFace card={card} isBack={true} /> {/* Pass card prop */}
      </div>
    </div>
  );
};

export default LogCard;
