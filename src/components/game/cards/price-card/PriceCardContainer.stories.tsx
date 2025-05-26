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
    onGenericInteraction: { action: "onGenericInteraction" },
    sourceCardId: { control: "text" },
    sourceCardSymbol: { control: "text" },
    sourceCardType: { control: "text" },
    onDeleteRequest: { action: "onDeleteRequest" },
    onHeaderIdentityClick: { action: "onHeaderIdentityClick" },
    className: { control: "text" },
    innerCardClassName: { control: "text" },
    priceSpecificInteractions: { control: "object" },
  },
};

export default meta;

type PriceCardStoryWrapperProps = StoryObj<
  typeof PriceCardContainer
>["args"] & {
  initialIsFlipped: boolean;
};

const PriceCardStoryWrapper: React.FC<PriceCardStoryWrapperProps> = (props) => {
  const {
    initialIsFlipped,
    cardData: initialCardDataFromArgs,
    onGenericInteraction,
    sourceCardId,
    sourceCardSymbol,
    sourceCardType,
    cardContext,
    onDeleteRequest, // Destructure onDeleteRequest
    onHeaderIdentityClick,
    className,
    innerCardClassName,
    priceSpecificInteractions,
    children,
  } = props;

  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);

  useEffect(() => {
    setLocalIsFlipped(initialIsFlipped);
  }, [initialIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prev) => {
      const newFlippedState = !prev;
      action("onFlip")(initialCardDataFromArgs?.id || "unknown-id");
      return newFlippedState;
    });
  }, [initialCardDataFromArgs?.id]);

  // Extended guard clause
  if (
    !onGenericInteraction ||
    !sourceCardId ||
    !sourceCardSymbol ||
    !sourceCardType ||
    !cardContext ||
    !initialCardDataFromArgs ||
    !onDeleteRequest // Add onDeleteRequest to the guard
  ) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[Storybook PriceCardStoryWrapper] Essential prop(s) missing from story args. " +
          "PriceCardContainer requires: onGenericInteraction, sourceCardId, sourceCardSymbol, sourceCardType, cardContext, cardData, and onDeleteRequest.",
        {
          onGenericInteraction,
          sourceCardId,
          sourceCardSymbol,
          sourceCardType,
          cardContext,
          initialCardDataFromArgs,
          onDeleteRequest,
        }
      );
    }
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid red",
          color: "red",
          backgroundColor: "lightpink",
          maxWidth: "300px",
          textAlign: "center",
        }}></div>
    );
  }

  const currentCardDataForContainer = {
    ...(initialCardDataFromArgs as PriceCardData & DisplayableCardState),
    isFlipped: localIsFlipped,
  };

  return (
    <PriceCardContainer
      cardData={currentCardDataForContainer}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      sourceCardId={sourceCardId}
      sourceCardSymbol={sourceCardSymbol}
      sourceCardType={sourceCardType}
      cardContext={cardContext}
      onDeleteRequest={onDeleteRequest} // Now known to be non-undefined
      onHeaderIdentityClick={onHeaderIdentityClick}
      className={className}
      innerCardClassName={innerCardClassName}
      priceSpecificInteractions={priceSpecificInteractions}>
      {children}
    </PriceCardContainer>
  );
};

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
  websiteUrl: null,
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

// Define a default mock for onDeleteRequest for convenience
const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<typeof PriceCardContainer>;

export const Default: Story = {
  render: (args) => (
    <PriceCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? false}
    />
  ),
  args: {
    cardData: { ...initialMockCardData, isFlipped: false },
    isFlipped: false,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest, // Use the defined mock
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
  render: (args) => (
    <PriceCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? true}
    />
  ),
  args: {
    ...Default.args,
    cardData: {
      ...(Default.args?.cardData as PriceCardData & DisplayableCardState),
      isFlipped: true,
    },
    isFlipped: true,
  },
};

export const MinimalData: Story = {
  render: (args) => (
    <PriceCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? false}
    />
  ),
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
      id: "price-btc-minimal",
      symbol: "BTC",
      isFlipped: Default.args?.isFlipped ?? false,
      companyName: "Bitcoin",
      logoUrl: null,
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
    sourceCardId: "price-btc-minimal",
    sourceCardSymbol: "BTC",
    cardContext: {
      ...(Default.args?.cardContext as CardActionContext),
      id: "price-btc-minimal",
      symbol: "BTC",
      companyName: "Bitcoin",
      logoUrl: null,
    },
  },
};

export const NoInteractions: Story = {
  render: (args) => (
    <PriceCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? false}
    />
  ),
  args: {
    ...Default.args,
    // To satisfy the guard, NoInteractions must now provide a non-undefined onDeleteRequest.
    // If it's truly "no interactions", this would be a no-op.
    onDeleteRequest: (context) => {
      action("onDeleteRequest (no-op for NoInteractions story)")(context);
    },
    onHeaderIdentityClick: undefined,
    priceSpecificInteractions: undefined,
  },
};
