// src/components/game/cards/analyst-grades-card/AnalystGradesCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { AnalystGradesCardContent } from "./AnalystGradesCardContent";
import type {
  AnalystGradesCardData,
  AnalystRatingDetail,
} from "./analyst-grades-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";
import {
  CardStoryWrapper,
  type CardStoryWrapperProps,
} from "../../storybook/CardStoryWrapper"; // Adjust path

const meta: Meta<CardStoryWrapperProps<AnalystGradesCardData>> = {
  title: "Game/Cards/AnalystGradesCard",
  component: CardStoryWrapper,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    initialCardData: { control: "object" },
  },
};
export default meta;

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
    totalAnalystsPrevious: totalAnalysts - 1 + 3,
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
  type: "analystgrades" as CardType,
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

type Story = StoryObj<CardStoryWrapperProps<AnalystGradesCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockCardData, isFlipped: false },
    ContentComponent: AnalystGradesCardContent,
    expectedCardType: "analystgrades",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockCardData, isFlipped: true },
  },
};
