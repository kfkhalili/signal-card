// src/components/game/cards/dividends-history-card/DividendsHistoryCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { DividendsHistoryCardContainer } from "./DividendsHistoryCardContainer";
import type {
  DividendsHistoryCardData,
  DividendsHistoryCardStaticData,
  DividendsHistoryCardLiveData,
  LatestDividendInfo,
  AnnualDividendTotal,
} from "./dividends-history-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof DividendsHistoryCardContainer> = {
  title: "Game/Cards/DividendsHistoryCardContainer",
  component: DividendsHistoryCardContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    cardData: { control: "object" },
    isFlipped: { control: "boolean" },
    cardContext: { control: "object" },
    onGenericInteraction: { action: "onGenericInteraction" },
    onDeleteRequest: { action: "onDeleteRequest" },
  },
};

export default meta;

type DividendsHistoryCardStoryWrapperProps = Pick<
  ComponentProps<typeof DividendsHistoryCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
  | "children"
> & {
  initialIsFlipped: boolean;
  initialCardData: DividendsHistoryCardData & DisplayableCardState;
};

const DividendsHistoryCardStoryWrapper: React.FC<
  DividendsHistoryCardStoryWrapperProps
> = ({
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
    DividendsHistoryCardData & DisplayableCardState
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
    return (
      <div style={{ color: "red", border: "1px solid red", padding: "10px" }}>
        Error: Story args incomplete.
      </div>
    );
  }

  return (
    <DividendsHistoryCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
      {children}
    </DividendsHistoryCardContainer>
  );
};

const defaultSymbol = "MSFT";
const defaultCompanyName = "Microsoft Corporation";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/MSFT-a203b22d.png?t=1633073277";

const mockLatestDividend: LatestDividendInfo = {
  amount: 0.75,
  adjAmount: 0.75,
  exDividendDate: "2024-11-20",
  paymentDate: "2024-12-12",
  declarationDate: "2024-09-19",
  yieldAtDistribution: 0.0068, // (0.75*4) / current_price_at_distribution
  frequency: "Quarterly",
};

const mockAnnualTotals: AnnualDividendTotal[] = [
  { year: 2023, totalDividend: 2.79 },
  { year: 2022, totalDividend: 2.48 },
  { year: 2021, totalDividend: 2.24 },
];

const mockStaticData: DividendsHistoryCardStaticData = {
  reportedCurrency: "USD",
  typicalFrequency: "Quarterly",
};

const mockLiveData: DividendsHistoryCardLiveData = {
  latestDividend: mockLatestDividend,
  annualTotalsLast3Years: mockAnnualTotals,
  lastFullYearDividendGrowthYoY: (2.79 - 2.48) / 2.48, // Approx 0.125
  lastUpdated: new Date().toISOString(),
};

const mockBaseBackData: BaseCardBackData = {
  description: `Historical dividend payments and trends for ${defaultCompanyName}, including recent payments and annual totals.`,
};

const initialMockCardData: DividendsHistoryCardData & DisplayableCardState = {
  id: `dividendshistory-${defaultSymbol}-${Date.now()}`,
  type: "dividendshistory",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
  websiteUrl: null,
};

const mockCardContext: CardActionContext = {
  id: initialMockCardData.id,
  symbol: initialMockCardData.symbol,
  type: "dividendshistory" as CardType,
  companyName: initialMockCardData.companyName,
  logoUrl: initialMockCardData.logoUrl,
  websiteUrl: null,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<DividendsHistoryCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <DividendsHistoryCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockCardData,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <DividendsHistoryCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockCardData, isFlipped: true },
  },
};

export const MinimalData: Story = {
  render: (args) => <DividendsHistoryCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialCardData: {
      ...initialMockCardData,
      id: "dividendshistory-minimal",
      symbol: "NODIV",
      companyName: "No Dividend Corp",
      logoUrl: null,
      staticData: {
        reportedCurrency: "USD",
        typicalFrequency: null,
      },
      liveData: {
        latestDividend: null,
        annualTotalsLast3Years: [
          { year: 2023, totalDividend: 0 },
          { year: 2022, totalDividend: 0 },
          { year: 2021, totalDividend: 0 },
        ],
        lastFullYearDividendGrowthYoY: null,
        lastUpdated: new Date().toISOString(),
      },
      backData: {
        description: "No dividend history found for No Dividend Corp.",
      },
    },
    cardContext: {
      ...mockCardContext,
      id: "dividendshistory-minimal",
      symbol: "NODIV",
      companyName: "No Dividend Corp",
      logoUrl: null,
    },
  },
};
