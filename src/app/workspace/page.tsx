// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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

// Ensure card rehydrators and initializers are loaded
import "@/components/game/cards/rehydrators";
import "@/components/game/cards/initializers"; // This should pull in revenueCardUtils
import "@/components/game/cards/updateHandlerInitializer"; // This should pull in revenueCardUtils

import ActiveCardsSection from "@/components/game/ActiveCardsSection";
import type { DerivedMarketStatus } from "@/hooks/useStockData";
import type { FinancialStatementDBRow } from "@/lib/supabase/realtime-service"; // Ensure this type is available

type MarketStatus = Record<
  string,
  {
    status: DerivedMarketStatus;
    message: string | null;
  }
>;

export default function WorkspacePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [hasMounted, setHasMounted] = useState<boolean>(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
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
    setMarketStatuses({}); // Reset market statuses as well
    setIsClearConfirmOpen(false);
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

  return (
    <div className="space-y-6 pb-10">
      {activeCards.length > 0 && (
        <div className="px-2 sm:px-4 pt-4 flex flex-col sm:flex-row sm:justify-end items-center gap-3">
          <div
            className="flex gap-2 items-center"
            style={{ minHeight: "32px" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={isAddingCardInProgress}>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Clear All
            </Button>

            {/* AddCardForm is available even if workspaceSymbolForRegularUser is set,
              but its symbol input will be locked for non-premium users */}
            <AddCardForm
              onAddCard={addCardToWorkspace} // No need for async here, addCardToWorkspace is async
              existingCards={activeCards}
              isPremiumUser={isPremiumUser}
              lockedSymbolForRegularUser={workspaceSymbolForRegularUser}
            />
          </div>
        </div>
      )}

      {/* Map over unique symbols to create a StockDataHandler for each */}
      {uniqueSymbolsInWorkspace.map((s) => {
        if (!stockDataCallbacks) {
          // This check might be redundant if stockDataCallbacks is guaranteed to be initialized
          return null;
        }
        return (
          <StockDataHandler
            key={`handler-${s}`}
            symbol={s}
            onQuoteReceived={stockDataCallbacks.onLiveQuoteUpdate}
            onStaticProfileUpdate={stockDataCallbacks.onProfileUpdate}
            onMarketStatusChange={handleMarketStatusChange}
            onFinancialStatementUpdate={
              stockDataCallbacks.onFinancialStatementUpdate as (
                statement: FinancialStatementDBRow
              ) => void
            }
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
            <RefreshCw // Using RefreshCw as a placeholder icon
              size={48}
              className="mx-auto text-muted-foreground mb-4"
              strokeWidth={1.5}
            />
            <p className="text-lg text-muted-foreground mb-6">
              Your workspace is currently empty.
            </p>
            <AddCardForm
              onAddCard={addCardToWorkspace}
              existingCards={activeCards}
              isPremiumUser={isPremiumUser}
              lockedSymbolForRegularUser={workspaceSymbolForRegularUser} // Pass this down
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
