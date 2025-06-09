// src/components/workspace/AddCardForm.tsx
"use client";

import React, { useEffect, useState } from "react";
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
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, ArrowLeft } from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

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
    .min(1, { message: "A symbol must be selected." })
    .max(10)
    .transform((val) => val.toUpperCase()),
  cardTypes: z
    .array(z.custom<CardType>())
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<"symbol" | "types">("symbol");

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol: lockedSymbolForRegularUser || "",
      cardTypes: ["profile"],
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        symbol: lockedSymbolForRegularUser || "",
        cardTypes: ["profile"],
      });
      setView(lockedSymbolForRegularUser ? "types" : "symbol");
      setIsSubmitting(false);
    }
  }, [isOpen, lockedSymbolForRegularUser, form]);

  const handleSubmit = async (values: AddCardFormValues) => {
    setIsSubmitting(true);
    await onAddCard(values);
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const SymbolSelector = (
    <div className="pt-2">
      <DialogTitle>Select a Symbol</DialogTitle>
      <DialogDescription className="pt-1">
        Search for a stock symbol to add cards for.
      </DialogDescription>
      <Command className="rounded-lg border shadow-md mt-4">
        <CommandInput placeholder="Type a symbol to search..." />
        <CommandList className="max-h-[250px]">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {supportedSymbols.map((suggestion) => (
              <CommandItem
                key={suggestion.value}
                value={suggestion.label}
                onSelect={() => {
                  form.setValue("symbol", suggestion.value, {
                    shouldValidate: true,
                  });
                  setView("types");
                }}>
                {suggestion.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );

  const CardTypeSelector = (
    <div>
      <DialogHeader className="flex flex-row items-center gap-2">
        {!lockedSymbolForRegularUser && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("symbol")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <DialogTitle>Add Cards for {form.getValues("symbol")}</DialogTitle>
          <DialogDescription>
            Select one or more card types to add.
          </DialogDescription>
        </div>
      </DialogHeader>
      <div className="py-4">
        <FormField
          control={form.control}
          name="cardTypes"
          render={() => (
            <FormItem className="space-y-3">
              <div className="relative">
                <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2">
                  {AVAILABLE_CARD_TYPES.map((item) => (
                    <FormField
                      key={item.value}
                      control={form.control}
                      name="cardTypes"
                      render={({ field }) => (
                        <FormItem
                          key={item.value}
                          className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.value)}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value ?? [];
                                return checked
                                  ? field.onChange([
                                      ...currentValue,
                                      item.value,
                                    ])
                                  : field.onChange(
                                      currentValue?.filter(
                                        (value) => value !== item.value
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer w-full">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              </div>
            </FormItem>
          )}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={
            isSubmitting || (form.getValues("cardTypes") || []).length === 0
          }>
          {isSubmitting ? "Adding..." : "Add Card(s)"}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Card(s)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {view === "symbol" ? SymbolSelector : CardTypeSelector}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
