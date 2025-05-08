
import React, { useState, useEffect, useMemo } from 'react';
import type { DiscoveredCard } from './types'; // Updated type import
import { Card as ShadCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import LogCard from './log-card'; 

interface DiscoveredCardsProps { // Renamed interface
  cards: DiscoveredCard[]; // Renamed prop and updated type
  onToggleFlipCard: (cardId: string) => void; // Renamed prop
  onDeleteCard: (cardId: string) => void; // Renamed prop
}

const DiscoveredCards: React.FC<DiscoveredCardsProps> = ({ cards, onToggleFlipCard, onDeleteCard }) => { // Renamed component and props
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Sort cards by discoveredAt or generatedAt, most recent first for display.
  // The actual storage might be appended, but display is reversed.
   const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const dateA = a.type === 'price_discovery' ? a.discoveredAt : a.generatedAt;
      const dateB = b.type === 'price_discovery' ? b.discoveredAt : b.generatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [cards]);


  if (!hasMounted) {
    return (
      <ShadCard className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground">Discovered Cards</CardTitle> {/* Updated title */}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading discovered cards...</p>
        </CardContent>
      </ShadCard>
    );
  }

  return (
    <ShadCard className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Discovered Cards</CardTitle> {/* Updated title */}
      </CardHeader>
      <CardContent>
        {sortedCards.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No cards discovered yet. Secure Price Cards or combine them to generate new cards.</p>
        ) : (
          <ScrollArea className="h-[400px] lg:h-[450px] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-4">
              {sortedCards.map((card) => ( // Iterate over sorted cards
                <LogCard
                  key={card.id}
                  card={card} // Pass card prop
                  onToggleFlip={onToggleFlipCard} // Pass renamed prop
                  onDeleteCard={onDeleteCard} // Pass renamed prop
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </ShadCard>
  );
};

export default DiscoveredCards;
