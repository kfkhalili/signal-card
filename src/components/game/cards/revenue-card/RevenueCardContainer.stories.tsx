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
} from "./revenue-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof RevenueCardContainer> = {
  title: "Game/Cards/RevenueCardContainer",
  component: RevenueCardContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    cardData: {
      control: "object",
      description: "The core data for the revenue card, including flip state.",
    },
    isFlipped: {
      control: "boolean",
      description: "Controls the flipped state of the card.",
    },
    cardContext: {
      control: "object",
      description: "Contextual information about the card.",
    },
    onGenericInteraction: {
      action: "onGenericInteraction",
      description: "Handler for generic card interactions.",
    },
    onDeleteRequest: {
      action: "onDeleteRequest",
      description: "Handler for card deletion requests.",
    },
    className: { control: "text", description: "Optional outer class names." },
    innerCardClassName: {
      control: "text",
      description: "Optional inner class names for styling.",
    },
  },
};

export default meta;

// Adjusted Props for the Storybook wrapper component
type RevenueCardStoryWrapperProps = Pick<
  ComponentProps<typeof RevenueCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
  | "children"
> & {
  initialIsFlipped: boolean;
  initialCardData: RevenueCardData & DisplayableCardState;
};

const RevenueCardStoryWrapper: React.FC<RevenueCardStoryWrapperProps> = ({
  initialIsFlipped,
  initialCardData,
  onGenericInteraction,
  cardContext: propCardContext,
  onDeleteRequest,
  className,
  innerCardClassName,
  children,
}) => {
  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  const [currentCardData, setCurrentCardData] = useState<
    RevenueCardData & DisplayableCardState
  >({
    ...initialCardData,
    isFlipped: initialIsFlipped,
  });

  useEffect(() => {
    setLocalIsFlipped(initialIsFlipped);
    setCurrentCardData((prev) => ({ ...prev, isFlipped: initialIsFlipped }));
  }, [initialIsFlipped]);

  useEffect(() => {
    setCurrentCardData({ ...initialCardData, isFlipped: localIsFlipped });
  }, [initialCardData, localIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prev) => {
      const newFlippedState = !prev;
      action("onFlip (handled by wrapper)")(initialCardData.id);
      setCurrentCardData((prevCardData) => ({
        ...prevCardData,
        isFlipped: newFlippedState,
      }));
      return newFlippedState;
    });
  }, [initialCardData.id]);

  if (
    !onGenericInteraction ||
    !propCardContext ||
    !currentCardData ||
    !onDeleteRequest
  ) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[Storybook RevenueCardStoryWrapper] Essential prop(s) missing from story args.",
        {
          onGenericInteraction,
          propCardContext,
          currentCardData,
          onDeleteRequest,
        }
      );
    }
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

  return (
    <RevenueCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
      {children}
    </RevenueCardContainer>
  );
};

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
  isFlipped: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockDisplayableRevenueCard.id,
  symbol: initialMockDisplayableRevenueCard.symbol,
  type: "revenue" as CardType,
  companyName: initialMockDisplayableRevenueCard.companyName,
  logoUrl: initialMockDisplayableRevenueCard.logoUrl,
  websiteUrl: null,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<RevenueCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockDisplayableRevenueCard,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockDisplayableRevenueCard, isFlipped: true },
  },
};

export const MinimalData: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: {
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
    cardContext: {
      ...mockCardContext,
      id: "revenue-minimal-data",
      symbol: "MIN",
      type: "revenue" as CardType,
      companyName: "Minimal Inc.",
      logoUrl: null,
    },
  },
};

export const NoInteractionsStory: Story = {
  render: (args) => <RevenueCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: { ...initialMockDisplayableRevenueCard, isFlipped: false },
    onGenericInteraction: (payload: InteractionPayload) => {
      action("onGenericInteraction (NoInteractionsStory)")(payload);
    },
  },
};
