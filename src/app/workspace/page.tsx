// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation"; // Import useRouter

import { AddCardForm } from "@/components/workspace/AddCardForm";
import { StockDataHandler } from "@/components/workspace/StockDataHandler";
import MarketDataStatusBanner from "@/components/workspace/MarketStatusBanner";
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
import type { DerivedMarketStatus } from "@/hooks/useStockData";

type MarketStatus = Record<
  string,
  {
    status: DerivedMarketStatus;
    message: string | null;
  }
>;

export default function WorkspacePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter(); // Initialize router

  const [hasMounted, setHasMounted] = useState<boolean>(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Effect to handle redirection when user logs out
  useEffect(() => {
    // Ensure this runs only after initial mount and auth state is resolved
    if (hasMounted && !isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router, hasMounted]);

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
    stockDataCallbacks,
    uniqueSymbolsInWorkspace,
    onGenericInteraction,
  } = useWorkspaceManager({ isPremiumUser });

  const [marketStatuses, setMarketStatuses] = useState<MarketStatus>({});
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  const handleMarketStatusChange = useCallback(
    (symbol: string, status: DerivedMarketStatus, message: string | null) => {
      setMarketStatuses((prev) => ({
        ...prev,
        [symbol]: { status, message },
      }));
    },
    []
  );

  const confirmedClearWorkspace = () => {
    clearWorkspace();
    setMarketStatuses({});
    setIsClearConfirmOpen(false);
  };

  // Initial loading state for the page or auth
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

  // If auth is resolved, user is null (logged out), and page has mounted,
  // show a redirecting message. The useEffect above will handle the redirect.
  if (hasMounted && !isAuthLoading && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Redirecting to homepage...
        </p>
      </div>
    );
  }

  // If user is present, render the workspace content
  return (
    <div className="space-y-6 pb-10">
      <div className="px-2 sm:px-4 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
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
          {activeCards.length > 0 && (
            <AddCardForm
              onAddCard={(formValues) => addCardToWorkspace(formValues)}
              existingCards={activeCards}
              isPremiumUser={isPremiumUser}
              lockedSymbolForRegularUser={workspaceSymbolForRegularUser}
            />
          )}
        </div>
      </div>

      {uniqueSymbolsInWorkspace.map((s) => {
        if (!stockDataCallbacks) {
          return null;
        }
        return (
          <StockDataHandler
            key={`handler-${s}`}
            symbol={s}
            onQuoteReceived={stockDataCallbacks.onLiveQuoteUpdate}
            onStaticProfileUpdate={stockDataCallbacks.onProfileUpdate}
            onMarketStatusChange={handleMarketStatusChange}
          />
        );
      })}

      {activeCards.length > 0 && (
        <MarketDataStatusBanner
          uniqueSymbolsInWorkspace={uniqueSymbolsInWorkspace}
          marketStatuses={marketStatuses}
          isAddingCardInProgress={isAddingCardInProgress}
        />
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
              triggerButton={
                <Button size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Card
                </Button>
              }
            />
            {!isPremiumUser && (
              <p className="text-xs text-muted-foreground mt-3">
                You can add one symbol at a time.
                <br />
                Clear workspace to change symbol.
              </p>
            )}
          </div>
        ) : (
          <ActiveCardsSection
            activeCards={activeCards}
            setActiveCards={setActiveCards}
            onGenericInteraction={onGenericInteraction}
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
