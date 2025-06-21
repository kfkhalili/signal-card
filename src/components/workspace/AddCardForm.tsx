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
  DialogClose,
  DialogTrigger,
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
import {
  PlusCircle,
  ArrowLeft,
  UserSquare,
  Activity,
  BarChart3,
  Scale,
  CircleDollarSign,
  Star,
  BookOpen,
  PieChart,
  Landmark,
  Layers3,
  Check,
} from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { cn } from "@/lib/utils";

const AVAILABLE_CARD_TYPES: {
  value: CardType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "profile",
    label: "Profile",
    description: "Company overview, description, and key stats.",
    icon: UserSquare,
  },
  {
    value: "price",
    label: "Price",
    description: "Live price, daily range, and moving averages.",
    icon: Activity,
  },
  {
    value: "keyratios",
    label: "Key Ratios",
    description: "TTM valuation, profitability, and solvency ratios.",
    icon: BarChart3,
  },
  {
    value: "revenue",
    label: "Revenue",
    description: "Quarterly or annual revenue and profitability.",
    icon: CircleDollarSign,
  },
  {
    value: "solvency",
    label: "Solvency",
    description: "Assets, liabilities, and debt overview.",
    icon: Landmark,
  },
  {
    value: "cashuse",
    label: "Cash Use",
    description: "Free cash flow, debt, and share changes.",
    icon: Layers3,
  },
  {
    value: "dividendshistory",
    label: "Dividends",
    description: "Historical dividend payments and growth.",
    icon: Star,
  },
  {
    value: "revenuebreakdown",
    label: "Segments",
    description: "Revenue breakdown by product or segment.",
    icon: PieChart,
  },
  {
    value: "analystgrades",
    label: "Analyst Grades",
    description: "Analyst consensus and rating distribution.",
    icon: BookOpen,
  },
  {
    value: "exchangevariants",
    label: "Exchanges",
    description: "Listings on other international exchanges.",
    icon: Scale,
  },
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
  label: string; // Combination of symbol and name for searching.
  companyName: string;
}

interface AddCardFormProps {
  onAddCard: (values: AddCardFormValues) => Promise<void>;
  supportedSymbols: SymbolSuggestion[];
  triggerButton?: React.ReactNode;
}

export const AddCardForm: React.FC<AddCardFormProps> = ({
  onAddCard,
  supportedSymbols,
  triggerButton,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<"symbol" | "types">("symbol");

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol: "",
      cardTypes: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        symbol: "",
        cardTypes: [],
      });
      setView("symbol");
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

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
        Search for a stock symbol or company name to add cards for.
      </DialogDescription>
      <Command className="rounded-lg border shadow-md mt-4">
        <CommandInput placeholder="Type a symbol or company name..." />
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
                <div className="flex justify-between w-full items-center">
                  <span className="font-semibold">{suggestion.value}</span>
                  <span className="text-muted-foreground text-xs truncate ml-4">
                    {suggestion.companyName}
                  </span>
                </div>
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setView("symbol")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border bg-muted/50 p-3">
                <FormControl>
                  <Checkbox
                    id="select-all-card-types"
                    checked={
                      field.value?.length === AVAILABLE_CARD_TYPES.length
                    }
                    onCheckedChange={(checked) => {
                      return checked
                        ? field.onChange(
                            AVAILABLE_CARD_TYPES.map((t) => t.value)
                          )
                        : field.onChange([]);
                    }}
                  />
                </FormControl>
                <FormLabel
                  htmlFor="select-all-card-types"
                  className="font-normal cursor-pointer w-full">
                  Select All
                </FormLabel>
              </FormItem>

              <div className="relative">
                <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 border-t pt-2">
                  {AVAILABLE_CARD_TYPES.map((item) => (
                    <FormItem key={item.value}>
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item.value)}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value ?? [];
                            return checked
                              ? field.onChange([...currentValue, item.value])
                              : field.onChange(
                                  currentValue.filter(
                                    (value) => value !== item.value
                                  )
                                );
                          }}
                          id={`card-type-${item.value}`}
                          className="sr-only peer"
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={`card-type-${item.value}`}
                        className={cn(
                          "flex items-center p-3 rounded-md border transition-colors cursor-pointer",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-accent/50"
                        )}>
                        <item.icon className="h-5 w-5 mr-4 text-muted-foreground shrink-0" />
                        <div className="flex-grow">
                          <p className="font-semibold text-foreground">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Check
                          className={cn(
                            "h-5 w-5 ml-4 text-primary transition-opacity",
                            field.value?.includes(item.value)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </FormLabel>
                    </FormItem>
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
