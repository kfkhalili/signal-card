// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AddCardForm } from "@/components/workspace/AddCardForm";
import { StockDataHandler } from "@/components/workspace/StockDataHandler";
import MarketDataStatusBanner from "@/components/workspace/MarketStatusBanner";
import { CustomCardCreatorPanel } from "@/components/workspace/CustomCardCreatorPanel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  RefreshCw,
  Loader2,
  Edit,
  X,
  ArrowUpDown,
} from "lucide-react";
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
import "@/components/game/cards/initializers";
import "@/components/game/cards/updateHandlerInitializer";

import { useWorkspaceManager } from "@/hooks/useWorkspaceManager";
import type { SortConfig } from "@/hooks/useWorkspaceManager";
import ActiveCardsSection from "@/components/game/ActiveCardsSection";
import type { DerivedMarketStatus } from "@/hooks/useStockData";
import type { FinancialStatementDBRow } from "@/lib/supabase/realtime-service";

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

  const {
    activeCards,
    setActiveCards,
    isAddingCardInProgress,
    addCardToWorkspace,
    clearWorkspace,
    stockDataCallbacks,
    uniqueSymbolsInWorkspace,
    onGenericInteraction,
    supportedSymbols,
    isSelectionMode,
    setIsSelectionMode,
    selectedDataItems,
    handleToggleItemSelection,
    createCustomStaticCard,
    sortConfig,
    setSortConfig,
  } = useWorkspaceManager();

  const [marketStatuses, setMarketStatuses] = useState<MarketStatus>({});
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [isCreatorPanelOpen, setIsCreatorPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router, hasMounted]);

  useEffect(() => {
    if (!isSelectionMode) {
      setIsCreatorPanelOpen(false);
    }
  }, [isSelectionMode]);

  const handleSortChange = (value: string) => {
    const [key, order] = value.split("-");
    setSortConfig({ key, order } as SortConfig);
  };

  const handleCreateCustomCard = (narrative: string, description: string) => {
    createCustomStaticCard(narrative, description);
    setIsSelectionMode(false);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => !prev);
  };

  const handleOpenCreatorPanel = () => {
    setIsCreatorPanelOpen(true);
  };

  const handleDeselectItem = (itemId: string) => {
    const itemToDeselect = selectedDataItems.find((item) => item.id === itemId);
    if (itemToDeselect) {
      handleToggleItemSelection(itemToDeselect);
    }
  };

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
          <div className="flex-1">
            <Select
              onValueChange={handleSortChange}
              defaultValue={`${sortConfig.key}-${sortConfig.order}`}>
              <SelectTrigger className="w-[180px] h-9">
                <ArrowUpDown className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">
                  Date Added (Newest)
                </SelectItem>
                <SelectItem value="createdAt-asc">
                  Date Added (Oldest)
                </SelectItem>
                <SelectItem value="symbol-asc">Symbol (A-Z)</SelectItem>
                <SelectItem value="symbol-desc">Symbol (Z-A)</SelectItem>
                <SelectItem value="type-asc">Card Type (A-Z)</SelectItem>
                <SelectItem value="type-desc">Card Type (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div
            className="flex gap-2 items-center"
            style={{ minHeight: "32px" }}>
            <Button
              variant={isSelectionMode ? "destructive" : "outline"}
              size="sm"
              onClick={handleToggleSelectionMode}
              disabled={isAddingCardInProgress}>
              {isSelectionMode ? (
                <X className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Edit className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              )}
              {isSelectionMode ? "Cancel" : "Create Custom"}
            </Button>
            {isSelectionMode && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenCreatorPanel}
                disabled={selectedDataItems.length === 0}>
                Review ({selectedDataItems.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={isAddingCardInProgress || isSelectionMode}>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Clear All
            </Button>
            <AddCardForm
              onAddCard={addCardToWorkspace}
              supportedSymbols={supportedSymbols}
            />
          </div>
        </div>
      )}

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
            <RefreshCw
              size={48}
              className="mx-auto text-muted-foreground mb-4"
              strokeWidth={1.5}
            />
            <p className="text-lg font-bold text-muted-foreground mb-6">
              Your workspace is currently empty.
            </p>
            <AddCardForm
              onAddCard={addCardToWorkspace}
              supportedSymbols={supportedSymbols}
              triggerButton={
                <Button size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Card
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground mt-3">
              You can add multiple symbols.
            </p>
          </div>
        ) : (
          <ActiveCardsSection
            activeCards={activeCards}
            setActiveCards={setActiveCards}
            onGenericInteraction={onGenericInteraction}
            isSelectionMode={isSelectionMode}
            selectedDataItems={selectedDataItems}
            onToggleItemSelection={handleToggleItemSelection}
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

      <CustomCardCreatorPanel
        isOpen={isCreatorPanelOpen}
        onClose={() => setIsCreatorPanelOpen(false)}
        selectedItems={selectedDataItems}
        onDeselectItem={handleDeselectItem}
        onCreateCard={handleCreateCustomCard}
      />
    </div>
  );
}
