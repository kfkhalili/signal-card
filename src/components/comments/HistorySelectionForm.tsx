// src/components/comments/HistorySelectionForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const HistorySelectionSchema = z.object({
  symbol: z.string().min(1, "Please select a symbol."),
  cardType: z.string().min(1, "Please select a card type."),
});

type FormValues = z.infer<typeof HistorySelectionSchema>;

interface HistorySelectionFormProps {
  // Define the shape of availableSelections inline
  availableSelections: {
    symbol: string;
    card_types: string[];
  }[];
}

export const HistorySelectionForm: React.FC<HistorySelectionFormProps> = ({
  availableSelections,
}) => {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [availableCardTypes, setAvailableCardTypes] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(HistorySelectionSchema),
    defaultValues: {
      symbol: "",
      cardType: "",
    },
  });

  useEffect(() => {
    if (selectedSymbol) {
      const selection = availableSelections.find(
        (s) => s.symbol === selectedSymbol
      );
      setAvailableCardTypes(selection ? selection.card_types : []);
      form.resetField("cardType", { defaultValue: "" });
    } else {
      setAvailableCardTypes([]);
    }
  }, [selectedSymbol, availableSelections, form]);

  useEffect(() => {
    if (!selectedSymbol && availableSelections.length > 0) {
      const firstSymbol = availableSelections[0].symbol;
      setSelectedSymbol(firstSymbol);
      form.setValue("symbol", firstSymbol);
    }
  }, [availableSelections, selectedSymbol, form]);

  const onSubmit = (data: FormValues) => {
    router.push(
      `/history/${data.symbol.toLowerCase()}/${data.cardType.toLowerCase()}`
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symbol</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedSymbol(value);
                }}
                value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a symbol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableSelections.map((item) => (
                    <SelectItem key={item.symbol} value={item.symbol}>
                      {item.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Choose the stock/asset symbol.</FormDescription>
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
                value={field.value}
                disabled={!selectedSymbol || availableCardTypes.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableCardTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the type of signal history.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={!form.formState.isValid}>
          View History
        </Button>
      </form>
    </Form>
  );
};
