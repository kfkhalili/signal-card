// src/components/game/cards/price-card/PriceCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { PriceCardContent } from "./PriceCardContent"; // Import the Content component
import type { PriceCardData } from "./price-card.types"; // Import the specific Data type
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";
import {
  CardStoryWrapper,
  type CardStoryWrapperProps,
} from "../../storybook/CardStoryWrapper"; // Adjust path to your generic wrapper

const meta: Meta<CardStoryWrapperProps<PriceCardData>> = {
  // Use CardStoryWrapperProps with PriceCardData
  title: "Game/Cards/PriceCard", // Updated title
  component: CardStoryWrapper, // The component is now the generic wrapper
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  // ArgTypes can be defined on the wrapper's props if needed,
  // or you can define args for initialCardData's fields directly.
  argTypes: {
    initialCardData: { control: "object" },
    // cardContext, onGenericInteraction, onDeleteRequest will be actions or controlled objects
  },
};
export default meta;

// REMOVE the old PriceCardStoryWrapper component

const defaultSymbol = "TSLA";
const defaultCompanyName = "Tesla, Inc.";
const defaultLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png";

// Your mock data remains similar
const mockStaticData = {
  // Conforms to PriceCardStaticData
  exchange_code: "NASDAQ",
};

const mockLiveData = {
  // Conforms to PriceCardLiveData
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

// This is the full data structure for a PriceCard, including its display state.
const initialMockPriceCardData: PriceCardData & DisplayableCardState = {
  id: "price-tsla-456",
  symbol: defaultSymbol,
  type: "price", // Important: type must be correct
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false, // Default flip state for the mock data
};

const mockCardContext: CardActionContext = {
  id: initialMockPriceCardData.id,
  symbol: initialMockPriceCardData.symbol,
  type: "price" as CardType,
  companyName: initialMockPriceCardData.companyName,
  logoUrl: initialMockPriceCardData.logoUrl,
  websiteUrl: null,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

// Type for the story, using the generic wrapper's props with PriceCardData
type Story = StoryObj<CardStoryWrapperProps<PriceCardData>>;

export const Default: Story = {
  // render is implicitly handled by Storybook using the component defined in meta
  args: {
    initialCardData: { ...initialMockPriceCardData, isFlipped: false },
    ContentComponent: PriceCardContent,
    expectedCardType: "price",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args, // Spread default args
    initialCardData: { ...initialMockPriceCardData, isFlipped: true },
  },
};

export const MinimalData: Story = {
  args: {
    ...Default.args,
    initialCardData: {
      id: "price-btc-minimal",
      symbol: "BTC",
      type: "price",
      companyName: "Bitcoin",
      logoUrl: null,
      createdAt: Date.now(),
      staticData: { exchange_code: "Crypto" },
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
      backData: { description: "Minimal price data for Bitcoin." },
      isFlipped: false,
    },
    cardContext: {
      id: "price-btc-minimal",
      symbol: "BTC",
      type: "price" as CardType,
      companyName: "Bitcoin",
      logoUrl: null,
      websiteUrl: null,
    },
  },
};
