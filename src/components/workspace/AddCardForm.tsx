// src/components/workspace/AddCardForm.tsx
"use client";

import React, { useEffect } from "react"; // Added useEffect
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Lock } from "lucide-react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard } from "@/components/game/types";

const AVAILABLE_CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "profile", label: "Profile Card" },
  { value: "price", label: "Price Card" },
  { value: "revenue", label: "Revenue Card" },
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
  isPremiumUser: boolean;
  triggerButton?: React.ReactNode;
  /** If provided and user is not premium, symbol field is locked to this value */
  lockedSymbolForRegularUser?: string | null;
}

export const AddCardForm: React.FC<AddCardFormProps> = ({
  onAddCard,
  existingCards,
  isPremiumUser,
  triggerButton,
  lockedSymbolForRegularUser,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddCardFormValues>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      symbol:
        lockedSymbolForRegularUser && !isPremiumUser
          ? lockedSymbolForRegularUser
          : "",
      cardType: "profile",
    },
  });

  // Effect to update form defaults if lockedSymbolForRegularUser changes (e.g., after workspace clear)
  // or when dialog opens.
  useEffect(() => {
    if (isOpen) {
      const defaultSymbol =
        lockedSymbolForRegularUser && !isPremiumUser
          ? lockedSymbolForRegularUser
          : "";
      const defaultCardType = isPremiumUser
        ? form.getValues("cardType")
        : "profile";

      form.reset({
        symbol: defaultSymbol,
        cardType: defaultCardType,
      });
    }
  }, [isOpen, lockedSymbolForRegularUser, isPremiumUser, form]);

  const handleSubmit = async (values: AddCardFormValues) => {
    setIsSubmitting(true);
    // Ensure the submitted symbol is the locked one for regular users if applicable
    const finalValues = {
      ...values,
      symbol:
        lockedSymbolForRegularUser && !isPremiumUser
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
    // form.reset() is now handled by the useEffect on isOpen
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
            {lockedSymbolForRegularUser && !isPremiumUser
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
                      placeholder="e.g., AAPL, BTC-USD"
                      {...field}
                      // Lock symbol input if lockedSymbolForRegularUser is set and user is not premium
                      disabled={
                        isSubmitting ||
                        (!!lockedSymbolForRegularUser && !isPremiumUser)
                      }
                      autoFocus={!lockedSymbolForRegularUser || isPremiumUser}
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
                      disabled={isSubmitting} // General submission lock
                    >
                      {AVAILABLE_CARD_TYPES.map((typeOpt) => (
                        <FormItem
                          key={typeOpt.value}
                          className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value={typeOpt.value}
                              // Disable if not premium AND type is not 'profile'
                              disabled={
                                isSubmitting ||
                                (!isPremiumUser && typeOpt.value !== "profile")
                              }
                            />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            {typeOpt.label}
                            {!isPremiumUser && typeOpt.value !== "profile" && (
                              <Lock
                                size={12}
                                className="ml-2 text-muted-foreground"
                              />
                            )}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  {!isPremiumUser && (
                    <FormDescription className="flex items-center text-xs">
                      Card type is locked to Profile. Symbol is locked once
                      first card is added.
                      <Lock size={12} className="ml-1 text-muted-foreground" />
                    </FormDescription>
                  )}
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
