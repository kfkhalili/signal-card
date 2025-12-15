// src/components/game/cards/price-card/PriceCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { action } from "storybook/actions";
import { PriceCardContent } from "./PriceCardContent";
import type { PriceCardData } from "./price-card.types";
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
} from "../../storybook/CardStoryWrapper";

const meta: Meta<CardStoryWrapperProps<PriceCardData>> = {
  title: "Game/Cards/PriceCard",
  component: CardStoryWrapper,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    initialCardData: { control: "object" },
  },
};
export default meta;

const defaultSymbol = "TSLA";
const defaultCompanyName = "Tesla, Inc.";
const defaultLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png";

const mockStaticData: PriceCardData["staticData"] = {
  // Correctly typed via PriceCardData
  exchange_code: "NASDAQ",
  currency: "USD",
};

const mockLiveData: PriceCardData["liveData"] = {
  // Correctly typed via PriceCardData
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

const initialMockPriceCardData: PriceCardData & DisplayableCardState = {
  id: "price-tsla-456",
  type: "price", // Correct literal type
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
  websiteUrl: null, // Added for BaseCardData consistency
};

const mockCardContext: CardActionContext = {
  id: initialMockPriceCardData.id,
  symbol: initialMockPriceCardData.symbol,
  type: "price" as CardType,
  companyName: initialMockPriceCardData.companyName,
  logoUrl: initialMockPriceCardData.logoUrl,
  websiteUrl: initialMockPriceCardData.websiteUrl,
  backData: initialMockPriceCardData.backData,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<PriceCardData>>;

export const Default: Story = {
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
    ...Default.args,
    initialCardData: { ...initialMockPriceCardData, isFlipped: true },
  },
};

const minimalMockBackData: BaseCardBackData = {
  description: "Minimal price data for Bitcoin.",
};

// Explicitly type minimalInitialMockData and ensure type is "price"
const minimalInitialMockData: PriceCardData & { isFlipped: boolean } = {
  id: "price-btc-minimal",
  type: "price", // Ensure the type is the literal "price"
  symbol: "BTC",
  companyName: "Bitcoin",
  logoUrl: null,
  createdAt: Date.now(),
  isFlipped: false,
  websiteUrl: null, // Added missing optional BaseCardData property
  staticData: { exchange_code: "Crypto", currency: "USD" },
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
  backData: minimalMockBackData,
};

export const MinimalData: Story = {
  args: {
    ...Default.args, // Spreads default args including expectedCardType: "price"
    initialCardData: minimalInitialMockData, // Assign the correctly and explicitly typed object
    cardContext: {
      ...mockCardContext, // Base context from Default story
      id: "price-btc-minimal",
      symbol: "BTC",
      type: "price" as CardType, // Type here is for CardActionContext which expects CardType
      companyName: "Bitcoin",
      logoUrl: null,
      websiteUrl: null, // Ensure consistency
      backData: minimalMockBackData,
    },
  },
};
