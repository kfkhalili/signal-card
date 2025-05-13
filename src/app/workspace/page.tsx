// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

import {
  AddCardForm,
  type AddCardFormValues,
} from "@/components/workspace/AddCardForm";
import { StockDataHandler } from "@/components/workspace/StockDataHandler";
import { useWorkspaceManager } from "@/hooks/useWorkspaceManager";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw, Loader2 } from "lucide-react";
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
  // ProfileDBRow, // Not directly used here
} from "@/hooks/useStockData";
import type { CardActionContext } from "@/components/game/cards/base-card/base-card.types";
import type { ProfileCardInteractionCallbacks } from "@/components/game/cards/profile-card/profile-card.types";

export default function WorkspacePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = createClient();

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isPremiumUser =
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
  } = useWorkspaceManager({ supabase, isPremiumUser });

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

  const handleRequestPriceCard = useCallback(
    (context: CardActionContext) => {
      const values: AddCardFormValues = {
        symbol: context.symbol,
        cardType: "price",
      };
      addCardToWorkspace(values, { requestingCardId: context.id });
    },
    [addCardToWorkspace]
  );

  const handleRequestProfileCard = useCallback(
    (context: CardActionContext) => {
      const values: AddCardFormValues = {
        symbol: context.symbol,
        cardType: "profile",
      };
      addCardToWorkspace(values, { requestingCardId: context.id });
    },
    [addCardToWorkspace]
  );

  const profileInteractions: ProfileCardInteractionCallbacks = {
    onRequestPriceCard: handleRequestPriceCard,
    // Add other interactions like onWebsiteClick, onFilterByField here if needed
  };

  if (!hasMounted || isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Loading Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="px-2 sm:px-4 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">My Workspace</h1>
        <div className="flex gap-2 items-center" style={{ minHeight: "32px" }}>
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
              onAddCard={(formValues) => addCardToWorkspace(formValues)}
              existingCards={activeCards}
              isPremiumUser={isPremiumUser}
              lockedSymbolForRegularUser={workspaceSymbolForRegularUser}
            />
          )}
        </div>
      </div>

      {uniqueSymbolsInWorkspace.map((s) => (
        <StockDataHandler
          key={`handler-${s}`}
          symbol={s}
          onQuoteReceived={processLiveQuote}
          onStaticProfileUpdate={processStaticProfileUpdate}
          onMarketStatusChange={handleMarketStatusChange}
        />
      ))}

      {activeCards.length > 0 && uniqueSymbolsInWorkspace.length > 0 && (
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
              onAddCard={(formValues) => addCardToWorkspace(formValues)}
              existingCards={activeCards}
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
            activeCards={activeCards}
            setActiveCards={setActiveCards}
            profileSpecificInteractions={profileInteractions}
            onHeaderIdentityClick={handleRequestProfileCard} // For clicking any card header
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
