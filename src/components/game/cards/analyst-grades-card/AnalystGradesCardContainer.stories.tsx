// src/components/game/cards/analyst-grades-card/AnalystGradesCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { AnalystGradesCardContainer } from "./AnalystGradesCardContainer";
import type {
  AnalystGradesCardData,
  AnalystRatingDetail,
} from "./analyst-grades-card.types";
import type { CardActionContext } from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof AnalystGradesCardContainer> = {
  title: "Game/Cards/AnalystGradesCardContainer",
  component: AnalystGradesCardContainer,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type StoryWrapperProps = Pick<
  ComponentProps<typeof AnalystGradesCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
> & {
  initialIsFlipped: boolean;
  initialCardData: AnalystGradesCardData & DisplayableCardState;
};

const StoryWrapper: React.FC<StoryWrapperProps> = (props) => {
  const { initialIsFlipped, initialCardData, ...rest } = props;
  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  const [currentCardData, setCurrentCardData] = useState<
    AnalystGradesCardData & DisplayableCardState
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
      const newState = !prev;
      action("onFlip")(initialCardData.id);
      setCurrentCardData((prevData) => ({ ...prevData, isFlipped: newState }));
      return newState;
    });
  }, [initialCardData.id]);

  if (
    !rest.onGenericInteraction ||
    !rest.cardContext ||
    !currentCardData ||
    !rest.onDeleteRequest
  ) {
    return (
      <div style={{ color: "red", border: "1px solid red", padding: "10px" }}>
        Error: Story args incomplete.
      </div>
    );
  }

  return (
    <AnalystGradesCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      {...rest}
    />
  );
};

const defaultSymbol = "AAPL";
const mockRatingsDistribution: AnalystRatingDetail[] = [
  {
    category: "strongBuy",
    label: "Strong Buy",
    currentValue: 8,
    previousValue: 7,
    change: 1,
    colorClass: "bg-green-500 dark:bg-green-400",
  },
  {
    category: "buy",
    label: "Buy",
    currentValue: 23,
    previousValue: 23,
    change: 0,
    colorClass: "bg-green-400 dark:bg-green-300",
  },
  {
    category: "hold",
    label: "Hold",
    currentValue: 16,
    previousValue: 16,
    change: 0,
    colorClass: "bg-yellow-400 dark:bg-yellow-300",
  },
  {
    category: "sell",
    label: "Sell",
    currentValue: 2,
    previousValue: 3,
    change: -1,
    colorClass: "bg-red-400 dark:bg-red-300",
  },
  {
    category: "strongSell",
    label: "Strong Sell",
    currentValue: 1,
    previousValue: 1,
    change: 0,
    colorClass: "bg-red-500 dark:bg-red-400",
  },
];
const totalAnalysts = mockRatingsDistribution.reduce(
  (sum, r) => sum + r.currentValue,
  0
);

const initialMockCardData: AnalystGradesCardData & DisplayableCardState = {
  id: `analystgrades-${defaultSymbol}-2025-05-01`,
  type: "analystgrades",
  symbol: defaultSymbol,
  companyName: "Apple Inc.",
  logoUrl: "https://companieslogo.com/img/orig/AAPL-2161E0NC.png?t=1633073280",
  createdAt: Date.now(),
  staticData: {
    currentPeriodDate: "May 2025",
    previousPeriodDate: "April 2025",
  },
  liveData: {
    ratingsDistribution: mockRatingsDistribution,
    totalAnalystsCurrent: totalAnalysts,
    totalAnalystsPrevious: totalAnalysts - 1 + 3, // Example change
    consensusLabelCurrent: "Buy Consensus",
    lastUpdated: new Date().toISOString(),
  },
  backData: { description: "Analyst rating distribution for Apple Inc." },
  isFlipped: false,
  websiteUrl: null,
};

const mockCardContext: CardActionContext = {
  id: initialMockCardData.id,
  symbol: defaultSymbol,
  type: "analystgrades",
  companyName: initialMockCardData.companyName,
  logoUrl: initialMockCardData.logoUrl,
  websiteUrl: null,
};

type Story = StoryObj<StoryWrapperProps>;

export const Default: Story = {
  render: (args) => <StoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockCardData,
    cardContext: mockCardContext,
    onDeleteRequest: action("onDeleteRequest"),
    onGenericInteraction: action("onGenericInteraction"),
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  ...Default,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockCardData, isFlipped: true },
  },
};
