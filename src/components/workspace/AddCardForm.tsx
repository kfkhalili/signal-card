// src/components/workspace/AddCardForm.tsx
"use client";

import React, { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle } from "lucide-react"; // Lock icon removed as it's no longer used
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard } from "@/components/game/types";

const AVAILABLE_CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "profile", label: "Profile Card" },
  { value: "price", label: "Price Card" },
  { value: "revenue", label: "Revenue Card" },
  { value: "solvency", label: "Solvency Card" },
  { value: "cashuse", label: "Cash Use Card" },
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
  lockedSymbolForRegularUser?: string | null; // This can now be simplified or removed if not needed
}

export const AddCardForm: React.FC<AddCardFormProps> = ({
  onAddCard,
  existingCards,
  triggerButton,
  lockedSymbolForRegularUser,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol: lockedSymbolForRegularUser || "", // Simplified default symbol
      cardType: "profile",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultSymbol = lockedSymbolForRegularUser || "";
      const defaultCardType = form.getValues("cardType") || "profile";

      form.reset({
        symbol: defaultSymbol,
        cardType: defaultCardType,
      });
    }
  }, [isOpen, lockedSymbolForRegularUser, form]);

  const handleSubmit = async (values: AddCardFormValues) => {
    setIsSubmitting(true);
    const finalValues = {
      ...values,
      symbol: lockedSymbolForRegularUser
        ? lockedSymbolForRegularUser
        : values.symbol,
    };

    const cardExists = existingCards.some(
      (card) =>
        card.symbol === finalValues.symbol && card.type === finalValues.cardType
    );

    if (cardExists) {
      form.setError("symbol", {
        type: "manual",
        message: `A ${finalValues.cardType} card for ${finalValues.symbol} already exists.`,
      });
      setIsSubmitting(false);
      return;
    }

    await onAddCard(finalValues);
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
            {lockedSymbolForRegularUser // Simplified description
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
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., AAPL, GOOG, TSLA"
                      {...field}
                      disabled={
                        isSubmitting || !!lockedSymbolForRegularUser // Symbol is locked if lockedSymbolForRegularUser is present
                      }
                      autoFocus={!lockedSymbolForRegularUser}
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
                <FormItem className="space-y-2">
                  <FormLabel>Card Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                      disabled={isSubmitting}>
                      {AVAILABLE_CARD_TYPES.map((typeOpt) => {
                        return (
                          <FormItem
                            key={typeOpt.value}
                            className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value={typeOpt.value}
                                disabled={isSubmitting} // Only disabled if submitting
                              />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              {typeOpt.label}
                              {/* Lock icon removed */}
                            </FormLabel>
                          </FormItem>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Card"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
