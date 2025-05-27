// src/components/game/cards/revenue-card/RevenueCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { RevenueCardContainer } from "./RevenueCardContainer";
import type {
  RevenueCardData,
  RevenueCardStaticData,
  RevenueCardLiveData,
  RevenueCardInteractions,
} from "./revenue-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
} from "../base-card/base-card.types";
import type {
  DisplayableCardState,
  DisplayableCard,
} from "@/components/game/types";

const meta: Meta<typeof RevenueCardContainer> = {
  title: "Game/Cards/RevenueCardContainer",
  component: RevenueCardContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    // Props controlled by the StoryWrapper or internal to it are not listed here for direct control
    // Props for RevenueCardContainer itself that are passed through the wrapper:
    cardData: {
      control: "object",
      description: "The core data for the revenue card.",
    },
    cardContext: {
      control: "object",
      description: "Contextual information about the card.",
    },
    onGenericInteraction: {
      action: "onGenericInteraction",
      description: "Handler for generic card interactions.",
    },
    sourceCardId: {
      control: "text",
      description: "ID of the card triggering an interaction.",
    },
    sourceCardSymbol: {
      control: "text",
      description: "Symbol of the card triggering an interaction.",
    },
    sourceCardType: {
      control: "select",
      options: ["price", "profile", "revenue"],
      description: "Type of the card triggering an interaction.",
    },
    onDeleteRequest: {
      action: "onDeleteRequest",
      description: "Handler for card deletion requests.",
    },
    onHeaderIdentityClick: {
      action: "onHeaderIdentityClick",
      description: "Handler for header clicks.",
    },
    className: { control: "text", description: "Optional outer class names." },
    innerCardClassName: {
      control: "text",
      description: "Optional inner class names for styling.",
    },
    specificInteractions: {
      control: "object",
      description: "Revenue card specific interaction handlers.",
    },
  },
};

export default meta;

// Props for the wrapper component
interface RevenueCardStoryWrapperProps
  extends Omit<
    ComponentProps<typeof RevenueCardContainer>,
    "isFlipped" | "onFlip"
  > {
  initialIsFlipped: boolean;
}

const RevenueCardStoryWrapper: React.FC<RevenueCardStoryWrapperProps> = ({
  initialIsFlipped,
  cardData: initialCardDataFromArgs, // This is DisplayableCard from RevenueCardContainerProps
  ...restOfContainerProps // These are the other props for RevenueCardContainer
}) => {
  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);

  useEffect(() => {
    setLocalIsFlipped(initialIsFlipped);
  }, [initialIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prev) => {
      const newFlippedState = !prev;
      action("onFlip (handled by wrapper)")(initialCardDataFromArgs.id);
      return newFlippedState;
    });
  }, [initialCardDataFromArgs.id]);

  if (
    !restOfContainerProps.onGenericInteraction ||
    !restOfContainerProps.sourceCardId ||
    !restOfContainerProps.sourceCardSymbol ||
    !restOfContainerProps.sourceCardType ||
    !restOfContainerProps.cardContext ||
    !initialCardDataFromArgs ||
    !restOfContainerProps.onDeleteRequest
  ) {
    console.error(
      "[Storybook RevenueCardStoryWrapper] Essential prop(s) missing from story args.",
      { props: restOfContainerProps, cardData: initialCardDataFromArgs }
    );
    return (
      <div
        style={{
          color: "red",
          border: "1px solid red",
          padding: "10px",
          maxWidth: "300px",
          textAlign: "center",
        }}>
        Error: Story args incomplete. Check console.
      </div>
    );
  }

  const currentCardDataForContainer: DisplayableCard = {
    ...(initialCardDataFromArgs as RevenueCardData & DisplayableCardState), // Ensure correct type for spreading
    isFlipped: localIsFlipped,
  };

  return (
    <RevenueCardContainer
      {...restOfContainerProps}
      cardData={currentCardDataForContainer}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
    />
  );
};

// --- Mock Data ---
const defaultSymbol = "MSFT";
const defaultCompanyName = "Microsoft Corporation";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/MSFT-a203b22d.png?t=1633073277";

const mockStaticData: RevenueCardStaticData = {
  periodLabel: "FY2023",
  reportedCurrency: "USD",
  filingDate: "2023-07-27",
  acceptedDate: "2023-07-27 18:00:00",
  statementDate: "2023-06-30",
  statementPeriod: "FY",
};

const mockLiveData: RevenueCardLiveData = {
  revenue: 211915000000,
  grossProfit: 146052000000,
  operatingIncome: 88523000000,
  netIncome: 72361000000,
  freeCashFlow: 63297000000,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Key financial metrics for ${defaultCompanyName} (${mockStaticData.periodLabel}, ending ${mockStaticData.statementDate}). Includes revenue, profits, and free cash flow.`,
};

// This is the full data structure for a RevenueCard, including its display state.
const initialMockDisplayableRevenueCard: RevenueCardData &
  DisplayableCardState = {
  id: `revenue-${defaultSymbol}-${mockStaticData.statementDate}-${mockStaticData.statementPeriod}`,
  type: "revenue",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false, // Default flip state for the mock data
};

const mockCardContext: CardActionContext = {
  id: initialMockDisplayableRevenueCard.id,
  symbol: initialMockDisplayableRevenueCard.symbol,
  type: "revenue",
  companyName: initialMockDisplayableRevenueCard.companyName,
  logoUrl: initialMockDisplayableRevenueCard.logoUrl,
  websiteUrl: null,
};

const mockSpecificInteractions: RevenueCardInteractions = {};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

// --- Stories ---
type Story = StoryObj<RevenueCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    // Props for RevenueCardStoryWrapperProps
    initialIsFlipped: false,
    // Props for RevenueCardContainer (passed via ...restOfContainerProps)
    cardData: initialMockDisplayableRevenueCard, // Pass the complete DisplayableCard object
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onHeaderIdentityClick: (context) =>
      action("onHeaderIdentityClick")(context),
    onGenericInteraction: mockOnGenericInteraction,
    sourceCardId: initialMockDisplayableRevenueCard.id,
    sourceCardSymbol: initialMockDisplayableRevenueCard.symbol,
    sourceCardType: "revenue",
    specificInteractions: mockSpecificInteractions,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    // cardData's internal isFlipped will be overridden by localIsFlipped in the wrapper
    // but it's good practice for the mock to reflect the intended initial state.
    cardData: { ...initialMockDisplayableRevenueCard, isFlipped: true },
  },
};

export const MinimalData: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    cardData: {
      // This is DisplayableCard (RevenueCardData & DisplayableCardState)
      id: "revenue-minimal-data",
      type: "revenue",
      symbol: "MIN",
      companyName: "Minimal Inc.",
      logoUrl: null,
      createdAt: Date.now(),
      isFlipped: false,
      staticData: {
        periodLabel: "Q1 2024",
        reportedCurrency: "CAD",
        filingDate: null,
        acceptedDate: null,
        statementDate: "2024-03-31",
        statementPeriod: "Q1",
      },
      liveData: {
        revenue: 1000000,
        grossProfit: null,
        operatingIncome: -50000,
        netIncome: null,
        freeCashFlow: 200000,
      },
      backData: {
        description: "Financial highlights for Minimal Inc. (Q1 2024).",
      },
    },
    sourceCardId: "revenue-minimal-data",
    sourceCardSymbol: "MIN",
    cardContext: {
      ...mockCardContext,
      id: "revenue-minimal-data",
      symbol: "MIN",
      companyName: "Minimal Inc.",
      logoUrl: null,
    },
  },
};

export const NoInteractions: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    onHeaderIdentityClick: undefined,
    specificInteractions: undefined,
  },
};
