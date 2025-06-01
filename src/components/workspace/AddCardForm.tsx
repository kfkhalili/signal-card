// src/components/workspace/AddCardForm.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { PlusCircle, Check, ChevronsUpDown } from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard } from "@/components/game/types";
import { SymbolSearchComboBox } from "@/components/ui/SymbolSearchComboBox";
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

interface AddCardFormProps {
  onAddCard: (values: AddCardFormValues) => Promise<void>;
  existingCards: DisplayableCard[];
  triggerButton?: React.ReactNode;
  lockedSymbolForRegularUser?: string | null;
}

export const AddCardForm: React.FC<AddCardFormProps> = ({
  onAddCard,
  triggerButton,
  lockedSymbolForRegularUser,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCardTypePopoverOpen, setIsCardTypePopoverOpen] = useState(false);

  const submitButtonRef = useRef<HTMLButtonElement>(null);
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
        setTimeout(() => {
          cardTypeTriggerRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, lockedSymbolForRegularUser, form]);

  const handleSubmit = async (values: AddCardFormValues) => {
    setIsSubmitting(true);
    const finalSymbol = lockedSymbolForRegularUser || values.symbol;
    const validatedValues: AddCardFormValues = {
      ...values,
      symbol: finalSymbol.toUpperCase(),
    };

    await onAddCard(validatedValues);
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const getCardTypesDisplayText = (selectedTypes?: CardType[]): string => {
    const numSelected = selectedTypes?.length ?? 0;

    if (numSelected === 0) {
      return "Select card type(s)...";
    }
    if (numSelected === 1 && selectedTypes) {
      const typeValue = selectedTypes[0];
      return (
        AVAILABLE_CARD_TYPES.find((ct) => ct.value === typeValue)?.label ||
        typeValue
      );
    }
    if (numSelected === 2 && selectedTypes) {
      return selectedTypes
        .map(
          (typeValue) =>
            AVAILABLE_CARD_TYPES.find((ct) => ct.value === typeValue)?.label ||
            typeValue
        )
        .join(", ");
    }
    return `${numSelected} types selected`;
  };

  return (
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
                      autoFocusOnMount={isOpen && !lockedSymbolForRegularUser}
                      focusAfterCloseRef={cardTypeTriggerRef}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardTypes"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Card Type(s)</FormLabel>
                  <Popover
                    open={isCardTypePopoverOpen}
                    onOpenChange={setIsCardTypePopoverOpen}
                    modal={true}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          ref={cardTypeTriggerRef}
                          variant="outline"
                          role="combobox"
                          aria-expanded={isCardTypePopoverOpen}
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
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      onCloseAutoFocus={(e) => {
                        e.preventDefault();
                        submitButtonRef.current?.focus();
                      }}>
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
                                  const newSelection =
                                    currentSelection.includes(typeOpt.value)
                                      ? currentSelection.filter(
                                          (v) => v !== typeOpt.value
                                        )
                                      : [...currentSelection, typeOpt.value];
                                  field.onChange(newSelection);
                                }}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (field.value || []).includes(typeOpt.value)
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
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                ref={submitButtonRef}
                type="submit"
                disabled={
                  isSubmitting ||
                  (!form.getValues("symbol") && !lockedSymbolForRegularUser) ||
                  (form.getValues("cardTypes") || []).length === 0
                }>
                {isSubmitting ? "Adding..." : "Add Card(s)"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
