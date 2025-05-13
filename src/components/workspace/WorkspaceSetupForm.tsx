// src/components/workspace/WorkspaceSetupForm.tsx
"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react"; // Import Lock icon
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

// Define the schema for the form
const FormSchema = z.object({
  symbol: z
    .string()
    .min(1, { message: "Symbol cannot be empty." })
    .max(10, { message: "Symbol seems too long." })
    .regex(/^[A-Za-z0-9.-]+$/, { message: "Invalid characters in symbol." })
    .transform((val) => val.toUpperCase()), // Always convert to uppercase
  // Card type is fixed for MVP
  cardType: z.literal<CardType>("profile", {
    errorMap: () => ({ message: "Starting card must be Profile for now." }),
  }),
});

type FormValues = z.infer<typeof FormSchema>;

interface WorkspaceSetupFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading: boolean;
  // Placeholder for premium status - replace with actual logic later
  isPremiumUser?: boolean;
}

export const WorkspaceSetupForm: React.FC<WorkspaceSetupFormProps> = ({
  onSubmit,
  isLoading,
  isPremiumUser = false, // Default to false for MVP
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      symbol: "",
      cardType: "profile", // Hardcoded default
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Start a New Workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-6">
              {/* Symbol Input */}
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financial Symbol</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., AAPL, BTC-USD, MSFT"
                        {...field}
                        disabled={isLoading}
                        autoFocus
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the stock, crypto, or ETF symbol.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Card Type Selection (Locked for MVP) */}
              <FormField
                control={form.control}
                name="cardType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Starting Card Type</FormLabel>
                    <FormControl>
                      {/* Use RadioGroup but disable choices */}
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                        // Disable the entire group based on premium status (future)
                        // disabled={!isPremiumUser || isLoading}
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value="profile"
                              disabled={isLoading} // Always selectable (or default)
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Profile Card (Default)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 opacity-60 cursor-not-allowed">
                          <FormControl>
                            {/* This one is visibly disabled */}
                            <RadioGroupItem
                              value="price"
                              disabled={true || isLoading} // Always disabled for MVP
                            />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            Price Card
                            {!isPremiumUser && (
                              <Lock
                                size={12}
                                className="ml-2 text-muted-foreground"
                              />
                            )}
                          </FormLabel>
                        </FormItem>
                        {/* Add other potential starting cards here, disabled */}
                      </RadioGroup>
                    </FormControl>
                    <FormDescription className="flex items-center">
                      {!isPremiumUser
                        ? "Choosing starting card type is a premium feature."
                        : "Select the initial card for your workspace."}
                      {!isPremiumUser && (
                        <Lock
                          size={12}
                          className="ml-1 text-muted-foreground"
                        />
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Loading..." : "Load Workspace"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
