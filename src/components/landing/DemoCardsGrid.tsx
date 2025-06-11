"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { DisplayableCard } from "@/components/game/types";
import { ActiveCards } from "@/components/game/ActiveCards";
import { Loader2 } from "lucide-react";

const DemoCardsGrid: React.FC = () => {
  const { toast } = useToast();
  const [demoCards, setDemoCards] = useState<DisplayableCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const cardGenerationKey = useMemo(() => Date.now(), []);

  useEffect(() => {
    const generateDemoCards = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/demo-cards");
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        const cards: DisplayableCard[] = await response.json();
        setDemoCards(cards);
      } catch (error) {
        console.error("Failed to fetch demo cards from API:", error);
        setDemoCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    generateDemoCards();
  }, [cardGenerationKey]);

  const handleInteraction = () => {
    toast({
      title: "Interaction Disabled",
      description: "Please sign up or log in to interact with the cards.",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">
          Generating live demo cards...
        </p>
      </div>
    );
  }

  if (demoCards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Could not load demo cards.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ActiveCards
        cards={demoCards}
        onToggleFlipCard={handleInteraction}
        onDeleteCardRequest={handleInteraction}
        cardIdToConfirmDelete={null}
        onConfirmDeletion={handleInteraction}
        onCancelDeletion={handleInteraction}
        onGenericInteraction={handleInteraction}
        isSelectionMode={false}
        selectedDataItems={[]}
        onToggleItemSelection={handleInteraction}
      />
    </div>
  );
};

export default DemoCardsGrid;
