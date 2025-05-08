import React, { useState, useEffect, useMemo } from 'react';
import type { DiscoveredCard } from './types';
// Removed ShadCard imports as we are using a div now
import { ScrollArea } from '@/components/ui/scroll-area';
import LogCard from './log-card';
import { cn } from '@/lib/utils'; // Import cn for conditional classes if needed

interface DiscoveredCardsProps {
  cards: DiscoveredCard[];
  onToggleFlipCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

const DiscoveredCards: React.FC<DiscoveredCardsProps> = ({ cards, onToggleFlipCard, onDeleteCard }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const dateA = a.type === 'price_discovery' ? a.discoveredAt : a.generatedAt;
      const dateB = b.type === 'price_discovery' ? b.discoveredAt : b.generatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [cards]);

  // Use a div container similar to active-cards.tsx for consistent styling
  // Use shadow-inner and removed mt-8
  const containerClasses = "flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-[400px]";

  if (!hasMounted) {
    // Simplified loading state within the new container style
    return (
      <div className={containerClasses}>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Discovered Cards</h2>
        <div className="flex items-center justify-center h-[300px]">
             <p className="text-muted-foreground text-center py-10">Loading discovered cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* Title */}
      <h2 className="text-2xl font-semibold text-foreground mb-4">Discovered Cards</h2>

      {/* Content Area */}
      {sortedCards.length === 0 ? (
        // Empty state centered within the container (similar to active-cards)
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-center py-10">No cards discovered yet. Secure Price Cards or combine them to generate new cards.</p>
        </div>
      ) : (
        // Cards grid within a ScrollArea
        <ScrollArea className="h-[400px] lg:h-[450px] pr-4"> {/* Adjust height as needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-4">
            {sortedCards.map((card) => (
              <LogCard
                key={card.id}
                card={card}
                onToggleFlip={onToggleFlipCard}
                onDeleteCard={onDeleteCard}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default DiscoveredCards;
