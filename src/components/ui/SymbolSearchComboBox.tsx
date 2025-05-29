// src/components/ui/SymbolSearchComboBox.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { useAuth } from "@/contexts/AuthContext";

interface SymbolSuggestion {
  value: string;
  label: string;
}

interface SymbolSearchComboBoxProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  containerClassName?: string;
  triggerClassName?: string;
  popoverContentClassName?: string;
  forwardedPopoverContentRef?: React.Ref<HTMLDivElement>;
}

export const SymbolSearchComboBox: React.FC<SymbolSearchComboBoxProps> = ({
  value: controlledFormValue = "",
  onChange: onFormChange,
  disabled = false,
  placeholder = "Select symbol...",
  id,
  name,
  containerClassName,
  triggerClassName,
  popoverContentClassName,
  forwardedPopoverContentRef,
}) => {
  const { supabase } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<SymbolSuggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const commandInputRef = React.useRef<HTMLInputElement>(null);

  const fetchSuggestions = React.useCallback(
    async (query: string) => {
      if (!supabase) {
        console.error(
          "Supabase client is not available for fetching suggestions."
        );
        setSuggestions([]);
        setIsLoading(false);
        return;
      }
      if (!query.trim() || disabled) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("supported_symbols")
          .select("symbol")
          .eq("is_active", true)
          .ilike("symbol", `%${query.toUpperCase()}%`)
          .limit(7);
        if (error) {
          console.error("Error fetching symbol suggestions:", error);
          throw error;
        }
        setSuggestions(
          data?.map((s) => ({ value: s.symbol, label: s.symbol })) || []
        );
      } catch (err) {
        console.error("Catch block in fetchSuggestions:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, disabled]
  );

  React.useEffect(() => {
    if (disabled) {
      setOpen(false);
      setSuggestions([]);
      return;
    }
    if (open && inputValue.trim()) {
      const debounceTimer = setTimeout(() => {
        fetchSuggestions(inputValue);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else if (open && !inputValue.trim()) {
      setSuggestions([]);
    }
  }, [inputValue, open, fetchSuggestions, disabled]);

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setInputValue("");
    }
  }, [open]);

  const handleItemSelect = React.useCallback(
    (selectedValue: string) => {
      if (!selectedValue && selectedValue !== "") {
        setOpen(false); // Close if selection is invalid or empty
        return;
      }
      if (onFormChange) {
        onFormChange(selectedValue);
      } else {
        console.error("onFormChange is undefined in handleItemSelect!");
      }
      setOpen(false); // Close the popover. This will trigger onOpenChange, then onCloseAutoFocus.
    },
    [onFormChange] // Removed setOpen from dependencies as it's from useState
  );

  const displayLabel = controlledFormValue || placeholder;

  return (
    <div className={cn("w-full", containerClassName)}>
      <Popover
        modal={true}
        open={open}
        onOpenChange={(newOpenState) => {
          setOpen(newOpenState);
        }}>
        <PopoverTrigger asChild ref={triggerRef} id={id} name={name}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={placeholder}
            className={cn(
              "w-full justify-between font-normal",
              !controlledFormValue && "text-muted-foreground",
              triggerClassName
            )}
            disabled={disabled}>
            {displayLabel}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={forwardedPopoverContentRef}
          className={cn(
            "w-[--radix-popover-trigger-width] p-0",
            popoverContentClassName
          )}>
          <Command shouldFilter={false}>
            <CommandInput
              ref={commandInputRef}
              placeholder="Search symbol..."
              value={inputValue}
              onValueChange={setInputValue}
              disabled={disabled}
            />
            <CommandList>
              {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
              {!isLoading && suggestions.length === 0 && inputValue.trim() && (
                <CommandEmpty>No symbol found.</CommandEmpty>
              )}
              {!isLoading &&
                suggestions.length === 0 &&
                !inputValue.trim() &&
                open && <CommandEmpty>Type to search symbols.</CommandEmpty>}
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.value}
                    value={suggestion.value}
                    onSelect={handleItemSelect}
                    disabled={disabled}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        controlledFormValue.toLowerCase() ===
                          suggestion.value.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {suggestion.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
