// src/components/workspace/AddCardForm.tsx
"use client";

import { useEffect, useState, useRef, type FC, type ElementType, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDebounce } from "use-debounce";
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Search,
  Loader2,
} from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { fromPromise } from "neverthrow";

const AVAILABLE_CARD_TYPES: {
  value: CardType;
  label: string;
  description: string;
  icon: ElementType;
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

interface SymbolSearchResult {
  symbol: string;
  companyName: string | null;
}

interface AddCardFormProps {
  onAddCard: (values: AddCardFormValues) => Promise<void>;
  triggerButton?: ReactNode;
}

export const AddCardForm: FC<AddCardFormProps> = ({
  onAddCard,
  triggerButton,
}) => {
  const { supabase } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<"symbol" | "types">("symbol");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedSymbolIndex, setFocusedSymbolIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol: "",
      cardTypes: [],
    },
  });

  // Search for symbols as user types
  useEffect(() => {
    if (!supabase || !debouncedSearchQuery.trim()) {
      // Schedule state update to avoid cascading renders
      queueMicrotask(() => {
        setSearchResults([]);
      });
      return;
    }

    const searchSymbols = async () => {
      setIsSearching(true);
      const query = debouncedSearchQuery.trim().toUpperCase();

      // Search in listed_symbols table - match symbols that start with the query
      const symbolsResult = await fromPromise(
        supabase
          .from("listed_symbols")
          .select("symbol")
          .eq("is_active", true)
          .ilike("symbol", `${query}%`)
          .limit(50), // Limit results for performance
        (e) => e as Error
      );

      if (symbolsResult.isErr() || !symbolsResult.value.data) {
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      const symbols = symbolsResult.value.data.map((s) => s.symbol);

      // Optionally fetch company names from profiles (if available)
      const profilesResult = await fromPromise(
        supabase
          .from("profiles")
          .select("symbol, display_company_name")
          .in("symbol", symbols.length > 0 ? symbols : []),
        (e) => e as Error
      );

      const companyNamesMap = new Map<string, string>();
      if (profilesResult.isOk() && profilesResult.value.data) {
        profilesResult.value.data.forEach((p) => {
          if (p.symbol && p.display_company_name) {
            companyNamesMap.set(p.symbol, p.display_company_name);
          }
        });
      }

      const results: SymbolSearchResult[] = symbols.map((symbol) => ({
        symbol,
        companyName: companyNamesMap.get(symbol) || null,
      }));

      setSearchResults(results);
      setIsSearching(false);
      // Reset focused index when search results change
      setFocusedSymbolIndex(-1);
    };

    searchSymbols();
  }, [debouncedSearchQuery, supabase]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        symbol: "",
        cardTypes: [],
      });
      // Schedule state updates to avoid cascading renders
      queueMicrotask(() => {
        setView("symbol");
        setIsSubmitting(false);
        setSearchQuery("");
        setSearchResults([]);
        setFocusedSymbolIndex(-1);
      });
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
        Search for a stock symbol to add cards for.
      </DialogDescription>
      <div className="mt-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Type a symbol (e.g., AAPL, MSFT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && searchResults.length > 0) {
                e.preventDefault();
                const firstIndex = 0;
                setFocusedSymbolIndex(firstIndex);
                // Use setTimeout to ensure DOM is updated
                setTimeout(() => {
                  const firstButton = document.querySelector(
                    `[data-symbol-index="${firstIndex}"]`
                  ) as HTMLButtonElement;
                  firstButton?.focus();
                }, 0);
              }
            }}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {debouncedSearchQuery.trim() && (
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            {searchResults.length === 0 && !isSearching ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No symbols found. Try a different search.
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((result, index) => (
                  <button
                    key={result.symbol}
                    type="button"
                    onClick={() => {
                      form.setValue("symbol", result.symbol, {
                        shouldValidate: true,
                      });
                      setView("types");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        form.setValue("symbol", result.symbol, {
                          shouldValidate: true,
                        });
                        setView("types");
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const nextIndex = Math.min(
                          index + 1,
                          searchResults.length - 1
                        );
                        setFocusedSymbolIndex(nextIndex);
                        // Use setTimeout to ensure DOM is updated
                        setTimeout(() => {
                          const nextButton = document.querySelector(
                            `[data-symbol-index="${nextIndex}"]`
                          ) as HTMLButtonElement;
                          nextButton?.focus();
                        }, 0);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prevIndex = Math.max(index - 1, 0);
                        setFocusedSymbolIndex(prevIndex);
                        // Use setTimeout to ensure DOM is updated
                        setTimeout(() => {
                          const prevButton = document.querySelector(
                            `[data-symbol-index="${prevIndex}"]`
                          ) as HTMLButtonElement;
                          prevButton?.focus();
                        }, 0);
                      }
                    }}
                    data-symbol-index={index}
                    className="w-full px-4 py-3 text-left hover:bg-accent focus:bg-accent focus:outline-none transition-colors flex justify-between items-center"
                    tabIndex={focusedSymbolIndex === index ? 0 : -1}>
                    <span className="font-semibold">{result.symbol}</span>
                    {result.companyName && (
                      <span className="text-muted-foreground text-xs truncate ml-4">
                        {result.companyName}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
                <Label
                  htmlFor="select-all-card-types"
                  className="font-normal cursor-pointer w-full">
                  Select All
                </Label>
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
