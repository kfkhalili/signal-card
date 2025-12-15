// src/components/workspace/CustomCardCreatorPanel.tsx
"use client";

import { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { XIcon, Edit } from "lucide-react";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";

interface CustomCardCreatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: SelectedDataItem[];
  onDeselectItem: (itemId: string) => void;
  onCreateCard: (narrative: string, description: string) => void;
}

export const CustomCardCreatorPanel: FC<CustomCardCreatorPanelProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onDeselectItem,
  onCreateCard,
}) => {
  const [narrative, setNarrative] = useState("My Custom Card");
  const [description, setDescription] = useState("");

  const handleCreateClick = (): void => {
    onCreateCard(narrative, description);
    onClose();
  };

  const handleNarrativeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setNarrative(event.target.value);
  };

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    setDescription(event.target.value);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open): void => {
        if (!open) {
          onClose();
        }
      }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Create a Custom Static Card
          </DialogTitle>
          <DialogDescription>
            Review your items and add a front narrative and back description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="card-narrative">
              Front Narrative (a short title)
            </Label>
            <Input
              id="card-narrative"
              value={narrative}
              onChange={handleNarrativeChange}
              placeholder="e.g., Key Valuation Metrics"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-description">Back Description</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Add a more detailed description for the back of the card."
              className="h-24"
            />
          </div>
          <div className="space-y-2">
            <Label>Selected Items ({selectedItems.length}/10)</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-2">
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        from {item.sourceCardSymbol}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(): void => onDeselectItem(item.id)}
                      title={`Deselect ${item.label}`}>
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No items selected.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleCreateClick}
            disabled={selectedItems.length === 0 || !narrative}>
            Create Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
