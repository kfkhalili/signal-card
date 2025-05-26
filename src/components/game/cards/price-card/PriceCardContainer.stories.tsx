// src/components/game/cards/price-card/PriceCardContainer.stories.tsx
import React, { useState, useCallback, useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { PriceCardContainer } from "./PriceCardContainer";
import type {
  PriceCardData,
  PriceCardStaticData,
  PriceCardLiveData,
  PriceCardInteractions,
} from "./price-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  CardType,
  BaseCardBackData,
  InteractionPayload,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof PriceCardContainer> = {
  title: "Game/Cards/PriceCardContainer",
  component: PriceCardContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    isFlipped: { control: "boolean" },
    cardContext: { control: "object" },
  },
};

export default meta;
type Story = StoryObj<typeof PriceCardContainer>;

const defaultSymbol = "TSLA";
const defaultCompanyName = "Tesla, Inc.";
const defaultLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png";

const mockStaticData: PriceCardStaticData = {
  exchange_code: "NASDAQ",
};

const mockLiveData: PriceCardLiveData = {
  timestamp: Date.now(),
  price: 180.5,
  dayChange: 2.1,
  changePercentage: 1.18,
  dayHigh: 182.0,
  dayLow: 178.0,
  dayOpen: 179.0,
  previousClose: 178.4,
  volume: 75000000,
  yearHigh: 250.0,
  yearLow: 150.0,
  marketCap: 570000000000,
  sma50d: 175.0,
  sma200d: 190.0,
};

const mockBaseBackData: BaseCardBackData = {
  description:
    "This card shows the latest market price and key trading indicators for the stock. Flip for more technical data.",
};

const initialMockCardData: PriceCardData & DisplayableCardState = {
  id: "price-tsla-456",
  symbol: defaultSymbol,
  type: "price",
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockCardData.id,
  symbol: initialMockCardData.symbol,
  type: "price" as CardType,
  companyName: initialMockCardData.companyName,
  logoUrl: initialMockCardData.logoUrl,
  websiteUrl: null, // Price cards don't typically have a primary website URL in the same way profile cards do
};

const mockSpecificInteractions: PriceCardInteractions = {
  onPriceCardSmaClick: (cardData, smaPeriod, smaValue) =>
    action("specific:smaClick")(cardData.symbol, smaPeriod, smaValue),
  onPriceCardRangeContextClick: (cardData, levelType, levelValue) =>
    action("specific:rangeContextClick")(
      cardData.symbol,
      levelType,
      levelValue
    ),
  onPriceCardOpenPriceClick: (cardData) =>
    action("specific:openPriceClick")(cardData.symbol),
  onPriceCardGenerateDailyPerformanceSignal: (cardData) =>
    action("specific:generateSignal")(cardData.symbol),
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

export const Default: Story = {
  render: (args) => {
    const [localIsFlipped, setLocalIsFlipped] = useState(args.isFlipped);

    useEffect(() => {
      setLocalIsFlipped(args.isFlipped);
    }, [args.isFlipped]);

    const handleFlip = useCallback(() => {
      setLocalIsFlipped((prev) => {
        const newFlippedState = !prev;
        action("onFlip")(args.cardData?.id || "unknown-id");
        return newFlippedState;
      });
    }, [args.cardData?.id]);

    const currentCardData = {
      ...(args.cardData as PriceCardData & DisplayableCardState),
      isFlipped: localIsFlipped,
    };

    return (
      <PriceCardContainer
        {...args}
        cardData={currentCardData}
        isFlipped={localIsFlipped}
        onFlip={handleFlip}
      />
    );
  },
  args: {
    cardData: { ...initialMockCardData, isFlipped: false },
    isFlipped: false,
    cardContext: mockCardContext,
    onDeleteRequest: (context) => action("onDeleteRequest")(context),
    onHeaderIdentityClick: (context) =>
      action("onHeaderIdentityClick")(context),
    onGenericInteraction: mockOnGenericInteraction,
    sourceCardId: initialMockCardData.id,
    sourceCardSymbol: initialMockCardData.symbol,
    sourceCardType: "price",
    priceSpecificInteractions: mockSpecificInteractions,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
      isFlipped: true,
    },
    isFlipped: true,
  },
};

export const MinimalData: Story = {
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
      isFlipped: Default.args?.isFlipped ?? false,
      companyName: "Bitcoin",
      logoUrl: null, // No logo for BTC
      liveData: {
        timestamp: Date.now(),
        price: 60000.0,
        dayChange: -500.0,
        changePercentage: -0.83,
        dayHigh: null,
        dayLow: null,
        dayOpen: 60500.0,
        previousClose: 60500.0,
        volume: null,
        yearHigh: null,
        yearLow: null,
        marketCap: 1200000000000,
        sma50d: null,
        sma200d: null,
      },
      staticData: {
        exchange_code: "Crypto",
      },
    },
  },
};

export const NoInteractions: Story = {
  args: {
    ...Default.args,
    priceSpecificInteractions: undefined,
    onDeleteRequest: undefined,
    onHeaderIdentityClick: undefined,
  },
};
