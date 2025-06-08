// src/components/workspace/AddCardForm.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
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
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlusCircle, Check, ChevronsUpDown, Search } from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { cn } from "@/lib/utils";

const AVAILABLE_CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "profile", label: "Profile Card" },
  { value: "price", label: "Price Card" },
  { value: "revenue", label: "Revenue Card" },
  { value: "solvency", label: "Solvency Card" },
  { value: "cashuse", label: "Cash Use Card" },
  { value: "keyratios", label: "Key Ratios Card" },
  { value: "dividendshistory", label: "Dividends History Card" },
  { value: "revenuebreakdown", label: "Revenue Breakdown Card" },
  { value: "analystgrades", label: "Analyst Grades Card" },
];

const AddCardFormSchema = z.object({
  symbol: z
    .string()
    .min(1, { message: "Symbol cannot be empty." })
    .max(10, { message: "Symbol is too long." })
    .regex(/^[A-Za-z0-9.-]+$/, { message: "Invalid characters in symbol." })
    .transform((val) => val.toUpperCase()),
  cardTypes: z
    .array(
      z.custom<CardType>(
        (val) => AVAILABLE_CARD_TYPES.some((ct) => ct.value === val),
        { message: "Invalid card type selected." }
      )
    )
    .nonempty({ message: "Please select at least one card type." }),
});

export type AddCardFormValues = z.infer<typeof AddCardFormSchema>;

interface SymbolSuggestion {
  value: string;
  label: string;
}

interface AddCardFormProps {
  onAddCard: (values: AddCardFormValues) => Promise<void>;
  supportedSymbols: SymbolSuggestion[];
  triggerButton?: React.ReactNode;
  lockedSymbolForRegularUser?: string | null;
}

export const AddCardForm: React.FC<AddCardFormProps> = ({
  onAddCard,
  supportedSymbols,
  triggerButton,
  lockedSymbolForRegularUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSymbolDialogOpen, setIsSymbolDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCardTypePopoverOpen, setIsCardTypePopoverOpen] = useState(false);
  const cardTypeTriggerRef = useRef<HTMLButtonElement>(null);

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol: lockedSymbolForRegularUser || "",
      cardTypes: ["profile"],
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultSymbol = lockedSymbolForRegularUser || "";
      form.reset({
        symbol: defaultSymbol,
        cardTypes: form.getValues("cardTypes") || ["profile"],
      });
      if (lockedSymbolForRegularUser) {
        setTimeout(() => cardTypeTriggerRef.current?.focus(), 50);
      } else {
        setTimeout(() => setIsSymbolDialogOpen(true), 50);
      }
    }
  }, [isOpen, lockedSymbolForRegularUser, form]);

  const handleSubmit = async (values: AddCardFormValues) => {
    setIsSubmitting(true);
    const finalSymbol = lockedSymbolForRegularUser || values.symbol;
    await onAddCard({ ...values, symbol: finalSymbol.toUpperCase() });
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const getCardTypesDisplayText = (selectedTypes?: CardType[]): string => {
    const numSelected = selectedTypes?.length ?? 0;
    if (numSelected === 0) return "Select card type(s)...";
    if (numSelected === 1 && selectedTypes) {
      const typeValue = selectedTypes[0];
      return (
        AVAILABLE_CARD_TYPES.find((ct) => ct.value === typeValue)?.label ||
        typeValue
      );
    }
    return `${numSelected} types selected`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {triggerButton || (
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Card(s)
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Card(s) to Workspace</DialogTitle>
            <DialogDescription>
              {lockedSymbolForRegularUser
                ? `Adding card(s) for symbol: ${lockedSymbolForRegularUser}. Select card type(s).`
                : "Enter a symbol and select card type(s)."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4 pt-2">
              {!lockedSymbolForRegularUser && (
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal"
                          onClick={() => setIsSymbolDialogOpen(true)}>
                          <span className="truncate">
                            {field.value || "Select a symbol..."}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="cardTypes"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Card Type(s)</FormLabel>
                    <Popover
                      open={isCardTypePopoverOpen}
                      onOpenChange={setIsCardTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            ref={cardTypeTriggerRef}
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value?.length && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}>
                            <span className="truncate">
                              {getCardTypesDisplayText(field.value)}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search card types..." />
                          <CommandList>
                            <CommandEmpty>No card type found.</CommandEmpty>
                            <CommandGroup>
                              {AVAILABLE_CARD_TYPES.map((typeOpt) => (
                                <CommandItem
                                  key={typeOpt.value}
                                  value={typeOpt.label}
                                  onSelect={() => {
                                    const currentSelection = field.value || [];
                                    const isSelected =
                                      currentSelection.includes(typeOpt.value);
                                    field.onChange(
                                      isSelected
                                        ? currentSelection.filter(
                                            (v) => v !== typeOpt.value
                                          )
                                        : [...currentSelection, typeOpt.value]
                                    );
                                  }}>
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (field.value || []).includes(
                                        typeOpt.value
                                      )
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {typeOpt.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (!form.getValues("symbol") &&
                      !lockedSymbolForRegularUser) ||
                    (form.getValues("cardTypes") || []).length === 0
                  }>
                  {isSubmitting ? "Adding..." : "Add Card(s)"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <CommandDialog
        open={isSymbolDialogOpen}
        onOpenChange={setIsSymbolDialogOpen}
        title="Select a Symbol"
        description="Search for a stock symbol and select one to add to the form.">
        <CommandInput placeholder="Type a symbol to search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {supportedSymbols.map((suggestion) => (
              <CommandItem
                key={suggestion.value}
                value={suggestion.value}
                onSelect={(currentValue) => {
                  form.setValue("symbol", currentValue.toUpperCase(), {
                    shouldValidate: true,
                  });
                  setIsSymbolDialogOpen(false);
                }}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    form.getValues("symbol") === suggestion.value
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {suggestion.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
