"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "use-debounce";
import { fromPromise } from "neverthrow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Loader2 } from "lucide-react";

interface SymbolSearchResult {
  symbol: string;
  companyName: string | null;
}

export default function AnalysisPage() {
  const router = useRouter();
  const { supabase, user, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedSymbolIndex, setFocusedSymbolIndex] = useState<number>(-1);
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router, hasMounted]);

  // Search for symbols as user types
  useEffect(() => {
    if (!supabase || !debouncedSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
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

  const handleSymbolSelect = (symbol: string) => {
    router.push(`/symbol/${symbol}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Analysis</h1>
        <p className="text-muted-foreground text-lg">
          Select a symbol to view comprehensive financial analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Search for a Symbol
          </CardTitle>
          <CardDescription>
            Enter a stock symbol to view detailed analysis including valuation, quality, safety metrics, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Type a symbol (e.g., AAPL, MSFT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                autoFocus
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
                        onClick={() => handleSymbolSelect(result.symbol)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSymbolSelect(result.symbol);
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

            {!debouncedSearchQuery.trim() && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Start typing a symbol to search from {searchResults.length > 0 ? "thousands" : ""} of available stocks
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

