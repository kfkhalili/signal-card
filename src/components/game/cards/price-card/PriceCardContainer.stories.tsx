// src/components/game/cards/price-card/PriceCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { PriceCardContainer } from "./PriceCardContainer";
import type {
  PriceCardData,
  PriceCardStaticData,
  PriceCardLiveData,
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
    cardData: { control: "object" }, // Keep cardData
    cardContext: { control: "object" },
    onGenericInteraction: { action: "onGenericInteraction" }, // This is the key interaction prop now
    onDeleteRequest: { action: "onDeleteRequest" },
    className: { control: "text" },
    innerCardClassName: { control: "text" },
  },
};

export default meta;

// Adjusted Props for the wrapper, PriceCardContainer itself has a leaner API now
type PriceCardStoryWrapperProps = Omit<
  ComponentProps<typeof PriceCardContainer>,
  "isFlipped" | "onFlip" | "cardData"
> & {
  initialIsFlipped: boolean;
  // Pass the full cardData object to the wrapper, which includes isFlipped state for the initial setup
  initialCardData: PriceCardData & DisplayableCardState;
};

const PriceCardStoryWrapper: React.FC<PriceCardStoryWrapperProps> = (props) => {
  const {
    initialIsFlipped,
    initialCardData, // Use this for initial state
    onGenericInteraction,
    cardContext,
    onDeleteRequest,
    className,
    innerCardClassName,
    children,
  } = props;

  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  // The cardData for the container now also derives its flip state from localIsFlipped
  const [currentCardData, setCurrentCardData] = useState<
    PriceCardData & DisplayableCardState
  >({
    ...initialCardData,
    isFlipped: initialIsFlipped,
  });

  useEffect(() => {
    setLocalIsFlipped(initialIsFlipped);
    setCurrentCardData((prev) => ({ ...prev, isFlipped: initialIsFlipped }));
  }, [initialIsFlipped]);

  useEffect(() => {
    // If initialCardData itself changes (e.g., from story args), update local state
    setCurrentCardData({ ...initialCardData, isFlipped: localIsFlipped });
  }, [initialCardData, localIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prevFlipped) => {
      const newFlippedState = !prevFlipped;
      action("onFlip")(initialCardData.id);
      // Update the cardData prop passed to the container to reflect the flip
      setCurrentCardData((prevCardData) => ({
        ...prevCardData,
        isFlipped: newFlippedState,
      }));
      return newFlippedState;
    });
  }, [initialCardData.id]);

  if (
    !onGenericInteraction ||
    !cardContext ||
    !currentCardData || // Check currentCardData
    !onDeleteRequest
  ) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[Storybook PriceCardStoryWrapper] Essential prop(s) missing from story args. ",
        {
          onGenericInteraction,
          cardContext,
          currentCardData,
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
        }}>
        {" "}
        Error in story setup. Check console.{" "}
      </div>
    );
  }

  return (
    <PriceCardContainer
      cardData={currentCardData} // Pass the stateful cardData
      isFlipped={localIsFlipped} // isFlipped is now consistent with cardData.isFlipped
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={cardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
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

// This is the full data structure for a PriceCard, including its display state.
const initialMockPriceCardData: PriceCardData & DisplayableCardState = {
  id: "price-tsla-456",
  symbol: defaultSymbol,
  type: "price",
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
  websiteUrl: null, // Price cards typically don't have a primary website URL
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<PriceCardStoryWrapperProps>; // Use the wrapper's props type

export const Default: Story = {
  render: (args) => <PriceCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockPriceCardData, // Pass the full initial card data
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <PriceCardStoryWrapper {...args} />,
  args: {
    ...Default.args, // Spread default args
    initialIsFlipped: true,
    initialCardData: { ...initialMockPriceCardData, isFlipped: true }, // Ensure mock reflects this
  },
};

export const MinimalData: Story = {
  render: (args) => <PriceCardStoryWrapper {...args} />,
  args: {
    ...Default.args, // Spread default args
    initialIsFlipped: false,
    initialCardData: {
      // This is DisplayableCard (PriceCardData & DisplayableCardState)
      ...initialMockPriceCardData, // Start with full mock
      id: "price-btc-minimal",
      symbol: "BTC",
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
      isFlipped: false, // Explicitly set
    },
    cardContext: {
      id: "price-btc-minimal", // Ensure context matches cardData
      symbol: "BTC",
      type: "price" as CardType,
      companyName: "Bitcoin",
      logoUrl: null,
      websiteUrl: null,
    },
  },
};

export const NoInteractionsStory: Story = {
  // Renamed to avoid conflict with type
  render: (args) => <PriceCardStoryWrapper {...args} />,
  args: {
    ...Default.args, // Spread default args
    initialIsFlipped: false,
    initialCardData: { ...initialMockPriceCardData, isFlipped: false }, // Use a distinct card data if needed
    onGenericInteraction: (payload: InteractionPayload) => {
      action("onGenericInteraction (NoInteractionsStory)")(payload);
      // No actual interaction handling for this story, just logging
    },
  },
};
