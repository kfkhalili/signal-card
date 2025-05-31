// src/components/workspace/AddCardForm.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard } from "@/components/game/types";
import { SymbolSearchComboBox } from "@/components/ui/SymbolSearchComboBox";

const AVAILABLE_CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "profile", label: "Profile Card" },
  { value: "price", label: "Price Card" },
  { value: "revenue", label: "Revenue Card" },
  { value: "solvency", label: "Solvency Card" },
  { value: "cashuse", label: "Cash Use Card" },
  { value: "keyratios", label: "Key Ratios Card" },
  { value: "dividendshistory", label: "Dividends History Card" },
  { value: "revenuebreakdown", label: "Revenue Breakdown Card" },
];

const AddCardFormSchema = z.object({
  symbol: z
    .string()
    .min(1, { message: "Symbol cannot be empty." })
    .max(10, { message: "Symbol is too long." })
    .regex(/^[A-Za-z0-9.-]+$/, { message: "Invalid characters in symbol." })
    .transform((val) => val.toUpperCase()),
  cardType: z.custom<CardType>(
    (val) => AVAILABLE_CARD_TYPES.some((ct) => ct.value === val),
    { message: "Invalid card type selected." }
  ),
});

export type AddCardFormValues = z.infer<typeof AddCardFormSchema>;

interface AddCardFormProps {
  onAddCard: (values: AddCardFormValues) => Promise<void>;
  existingCards: DisplayableCard[];
  triggerButton?: React.ReactNode;
  lockedSymbolForRegularUser?: string | null;
}

export const AddCardForm: React.FC<AddCardFormProps> = ({
  onAddCard,
  existingCards,
  triggerButton,
  lockedSymbolForRegularUser,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Ref for the "Add Card" button
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol: lockedSymbolForRegularUser || "",
      cardType: "profile",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultSymbol = lockedSymbolForRegularUser || "";
      form.reset({
        symbol: defaultSymbol,
        cardType: form.getValues("cardType") || "profile",
      });

      // Initial focus logic when dialog opens
      if (lockedSymbolForRegularUser) {
        // If symbol is locked, focus the submit button
        setTimeout(() => {
          submitButtonRef.current?.focus();
        }, 50); // Delay to ensure button is rendered
      }
      // If symbol is NOT locked, SymbolSearchComboBox will handle its own focus
      // via the autoFocusOnMount prop passed to it.
    }
  }, [isOpen, lockedSymbolForRegularUser, form]);

  const handleSubmit = async (values: AddCardFormValues) => {
    setIsSubmitting(true);
    const finalSymbol = lockedSymbolForRegularUser || values.symbol;
    const validatedSymbol = finalSymbol.toUpperCase();
    const cardExists = existingCards.some(
      (card) => card.symbol === validatedSymbol && card.type === values.cardType
    );
    if (cardExists) {
      form.setError("symbol", {
        type: "manual",
        message: `A ${values.cardType} card for ${validatedSymbol} already exists.`,
      });
      setIsSubmitting(false);
      return;
    }
    await onAddCard({ ...values, symbol: validatedSymbol });
    setIsSubmitting(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Card to Workspace</DialogTitle>
          <DialogDescription>
            {lockedSymbolForRegularUser
              ? `Adding card for symbol: ${lockedSymbolForRegularUser}. Select card type.`
              : "Enter a symbol and select the card type."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <SymbolSearchComboBox
                      id="symbol-search-combobox"
                      placeholder="Search or type symbol..."
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting || !!lockedSymbolForRegularUser}
                      containerClassName="w-full"
                      autoFocusOnMount={isOpen && !lockedSymbolForRegularUser} // Control autofocus
                      focusAfterCloseRef={submitButtonRef} // Pass ref for focus after popover close
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a card type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_CARD_TYPES.map((typeOpt) => (
                        <SelectItem key={typeOpt.value} value={typeOpt.value}>
                          {typeOpt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                ref={submitButtonRef} // Assign ref to the submit button
                type="submit"
                disabled={
                  isSubmitting ||
                  (!form.getValues("symbol") && !lockedSymbolForRegularUser)
                }>
                {isSubmitting ? "Adding..." : "Add Card"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
