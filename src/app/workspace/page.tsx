// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react"; // Removed useMemo, useLocalStorage
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client"; // Keep for passing to hook

// Workspace specific components and hooks
import { AddCardForm } from "@/components/workspace/AddCardForm";
import { useWorkspaceManager } from "@/hooks/useWorkspaceManager"; // Import the new hook
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Game Logic & Types (no changes here, they are used by the hook)
import "@/components/game/cards/rehydrators";
import ActiveCardsSection from "@/components/game/ActiveCardsSection";
import type {
  CombinedQuoteData,
  MarketStatusDisplayHook,
  ProfileDBRow,
} from "@/hooks/useStockData"; // Types used by StockDataHandler
import { StockDataHandler } from "@/components/workspace/StockDataHandler";

export default function WorkspacePage() {
  const { user } = useAuth();
  const supabase = createClient(); // Create client instance to pass to hook
  const isPremiumUser = user?.app_metadata?.is_premium ?? false;

  const {
    activeCards,
    setActiveCards, // Important for ActiveCardsSection's internal optimistic updates
    workspaceSymbolForRegularUser,
    isAddingCardInProgress,
    addCardToWorkspace,
    clearWorkspace,
    processLiveQuote,
    processStaticProfileUpdate,
    uniqueSymbolsInWorkspace,
  } = useWorkspaceManager({ supabase, isPremiumUser });

  // Market status state remains in the page component as it's UI-related for this page
  const [marketStatuses, setMarketStatuses] = useState<
    Record<
      string,
      {
        status: MarketStatusDisplayHook;
        message: string | null;
        timestamp: number | null;
      }
    >
  >({});
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  const handleMarketStatusChange = useCallback(
    (
      symbol: string,
      status: MarketStatusDisplayHook,
      message: string | null,
      timestamp: number | null
    ) => {
      setMarketStatuses((prev) => ({
        ...prev,
        [symbol]: { status, message, timestamp },
      }));
    },
    []
  );

  const confirmedClearWorkspace = () => {
    clearWorkspace(); // Call the function from the hook
    setMarketStatuses({}); // Also clear market statuses locally
    setIsClearConfirmOpen(false);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="px-2 sm:px-4 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">My Workspace</h1>
        <div className="flex gap-2 items-center">
          {activeCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={isAddingCardInProgress}>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Clear All
            </Button>
          )}
          {(activeCards.length > 0 || isPremiumUser) && (
            <AddCardForm
              onAddCard={addCardToWorkspace} // From hook
              existingCards={activeCards} // From hook
              isPremiumUser={isPremiumUser}
              lockedSymbolForRegularUser={workspaceSymbolForRegularUser} // From hook
            />
          )}
        </div>
      </div>

      {uniqueSymbolsInWorkspace.map((s) => (
        <StockDataHandler // Assuming StockDataHandler is correctly defined/imported
          key={`handler-${s}`}
          symbol={s}
          onQuoteReceived={processLiveQuote} // From hook
          onStaticProfileUpdate={processStaticProfileUpdate} // From hook
          onMarketStatusChange={handleMarketStatusChange} // Local to page
        />
      ))}

      {uniqueSymbolsInWorkspace.length > 0 && (
        <div className="px-2 sm:px-4 text-center py-2 bg-card border text-card-foreground rounded-md text-xs sm:text-sm shadow max-h-48 overflow-y-auto">
          <h3 className="font-semibold mb-1 text-sm">Market Data Status:</h3>
          {uniqueSymbolsInWorkspace.map((s) => {
            const statusInfo = marketStatuses[s];
            if (!statusInfo && !isAddingCardInProgress)
              return (
                <p
                  key={`status-${s}`}
                  className="text-xs text-muted-foreground">
                  {s}: Initializing stream...
                </p>
              );
            if (!statusInfo && isAddingCardInProgress) return null;
            return (
              <div key={`status-${s}`} className="text-xs mb-0.5">
                <strong>{s}:</strong> {statusInfo.status}
                {statusInfo.message && (
                  <span className="italic text-muted-foreground">
                    {" "}
                    ({String(statusInfo.message)})
                  </span>
                )}
                {statusInfo.timestamp &&
                  !isNaN(new Date(statusInfo.timestamp * 1000).getTime()) && (
                    <span className="block text-muted-foreground/80">
                      Last: {format(new Date(statusInfo.timestamp * 1000), "p")}
                    </span>
                  )}
              </div>
            );
          })}
          {Object.keys(marketStatuses).length === 0 &&
            uniqueSymbolsInWorkspace.length > 0 &&
            !isAddingCardInProgress && (
              <p className="text-xs text-muted-foreground">
                Awaiting data streams for active symbols...
              </p>
            )}
        </div>
      )}

      <div className="px-2 sm:px-0">
        {activeCards.length === 0 && !isAddingCardInProgress ? (
          <div className="text-center py-16 sm:py-20">
            <RefreshCw
              size={48}
              className="mx-auto text-muted-foreground mb-4"
              strokeWidth={1.5}
            />
            <p className="text-lg text-muted-foreground mb-6">
              Your workspace is currently empty.
            </p>
            <AddCardForm
              onAddCard={addCardToWorkspace} // From hook
              existingCards={activeCards} // From hook
              isPremiumUser={isPremiumUser}
              lockedSymbolForRegularUser={null}
              triggerButton={
                <Button size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Card
                </Button>
              }
            />
            {!isPremiumUser && (
              <p className="text-xs text-muted-foreground mt-3">
                (You can add one symbol at a time. Clear workspace to change
                symbol.)
              </p>
            )}
          </div>
        ) : (
          <ActiveCardsSection
            activeCards={activeCards} // From hook
            setActiveCards={setActiveCards} // From hook (for local UI updates in ActiveCardsSection)
          />
        )}
      </div>

      <AlertDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all cards from your workspace?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsClearConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmedClearWorkspace} // Use the page-level handler
              className="bg-destructive hover:bg-destructive/90">
              Clear Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
