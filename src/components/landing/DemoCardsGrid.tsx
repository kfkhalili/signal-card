// src/components/landing/DemoCardsGrid.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fromPromise } from "neverthrow";
import type { DisplayableCard } from "@/components/game/types";
import { ActiveCards } from "@/components/game/ActiveCards";

const CardSkeleton: React.FC = () => (
  <div className="w-full aspect-[63/88] rounded-2xl bg-card/50 animate-pulse shadow-lg" />
);

const DemoCardsGrid: React.FC = () => {
  const router = useRouter();
  const [demoCards, setDemoCards] = useState<DisplayableCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const cardGenerationKey = useMemo(() => Date.now(), []);

  useEffect(() => {
    const generateDemoCards = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/demo-cards");
        if (!response.ok) {
          // Defensive JSON parsing - response might not be valid JSON
          const jsonResult = await fromPromise(
            response.json(),
            (e) => e as Error
          );
          const errorData = jsonResult.match(
            (data) => data,
            () => ({} as { details?: string })
          );
          const errorMessage = errorData.details || `API responded with status ${response.status}`;
          console.error("Failed to fetch demo cards from API:", errorMessage);
          setDemoCards([]);
          return;
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
    router.push("/auth#auth-sign-up");
  };

  if (isLoading) {
    return (
      <div className="flex-grow p-4 bg-secondary/30 dark:bg-background/30 rounded-lg shadow-inner min-h-[400px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex justify-center items-start">
              <CardSkeleton />
            </div>
          ))}
        </div>
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
        onDragEnd={handleInteraction}
      />
    </div>
  );
};

export default DemoCardsGrid;
