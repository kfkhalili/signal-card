// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

import { AddCardForm } from "@/components/workspace/AddCardForm";
import { StockDataHandler } from "@/components/workspace/StockDataHandler";
import { useWorkspaceManager } from "@/hooks/useWorkspaceManager";
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

import "@/components/game/cards/rehydrators";
import ActiveCardsSection from "@/components/game/ActiveCardsSection";
import type {
  CombinedQuoteData,
  MarketStatusDisplayHook,
  // ProfileDBRow, // Not directly used in this component, but by hooks/handlers
} from "@/hooks/useStockData";

export default function WorkspacePage() {
  const { user, isLoading: isAuthLoading } = useAuth(); // Get auth loading state
  const supabase = createClient();

  // State to prevent hydration mismatch for client-side initialized data
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // isPremium should only be considered final after auth is loaded and component is mounted
  const isPremium =
    hasMounted && !isAuthLoading
      ? user?.app_metadata?.is_premium ?? false
      : false;

  const {
    activeCards,
    setActiveCards,
    workspaceSymbolForRegularUser,
    isAddingCardInProgress,
    addCardToWorkspace,
    clearWorkspace,
    processLiveQuote,
    processStaticProfileUpdate,
    uniqueSymbolsInWorkspace,
  } = useWorkspaceManager({ supabase, isPremiumUser: isPremium }); // Pass stable isPremium

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
    clearWorkspace();
    setMarketStatuses({});
    setIsClearConfirmOpen(false);
  };

  // Determine effective activeCards length only after mount to match server's initial empty state
  const effectiveActiveCardsLength = hasMounted ? activeCards.length : 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="px-2 sm:px-4 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">My Workspace</h1>
        <div className="flex gap-2 items-center" style={{ minHeight: "32px" }}>
          {" "}
          {/* Ensure min-height for layout consistency */}
          {/* Only render these buttons after mount and auth state is resolved */}
          {hasMounted && !isAuthLoading && effectiveActiveCardsLength > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={isAddingCardInProgress}>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Clear All
            </Button>
          )}
          {hasMounted &&
            !isAuthLoading &&
            (effectiveActiveCardsLength > 0 || isPremium) && (
              <AddCardForm
                onAddCard={addCardToWorkspace}
                existingCards={activeCards} // Pass actual activeCards for logic
                isPremiumUser={isPremium}
                lockedSymbolForRegularUser={workspaceSymbolForRegularUser}
              />
            )}
        </div>
      </div>

      {/* Conditionally render StockDataHandlers only after mount to avoid issues with uniqueSymbolsInWorkspace */}
      {hasMounted &&
        uniqueSymbolsInWorkspace.map((s) => (
          <StockDataHandler
            key={`handler-${s}`}
            symbol={s}
            onQuoteReceived={processLiveQuote}
            onStaticProfileUpdate={processStaticProfileUpdate}
            onMarketStatusChange={handleMarketStatusChange}
          />
        ))}

      {/* Conditionally render Market Status Display */}
      {hasMounted && effectiveActiveCardsLength > 0 && (
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
        {/* Conditional rendering for empty state vs. active cards section */}
        {!hasMounted || isAuthLoading ? (
          // Initial loading state (matches server if everything else is empty)
          <div className="text-center py-16 sm:py-20">
            <p className="text-lg text-muted-foreground">
              Loading Workspace...
            </p>
          </div>
        ) : effectiveActiveCardsLength === 0 && !isAddingCardInProgress ? (
          // Empty state shown only after mount and if truly empty
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
              onAddCard={addCardToWorkspace}
              existingCards={activeCards} // Pass actual activeCards
              isPremiumUser={isPremium}
              lockedSymbolForRegularUser={null}
              triggerButton={
                <Button size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Card
                </Button>
              }
            />
            {!isPremium && (
              <p className="text-xs text-muted-foreground mt-3">
                (You can add one symbol at a time. Clear workspace to change
                symbol.)
              </p>
            )}
          </div>
        ) : (
          // Active cards section
          <ActiveCardsSection
            activeCards={activeCards}
            setActiveCards={setActiveCards}
          />
        )}
      </div>

      {/* Clear Workspace Confirmation Dialog */}
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
              onClick={confirmedClearWorkspace}
              className="bg-destructive hover:bg-destructive/90">
              Clear Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
