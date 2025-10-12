// src/components/game/cards/revenue-breakdown-card/RevenueBreakdownCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "storybook/actions";
import { RevenueBreakdownCardContent } from "./RevenueBreakdownCardContent";
import type {
  RevenueBreakdownCardData,
  SegmentRevenueDataItem,
} from "./revenue-breakdown-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  InteractionPayload,
  CardType,
  BaseCardBackData,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";
import {
  CardStoryWrapper,
  type CardStoryWrapperProps,
} from "../../storybook/CardStoryWrapper"; // Adjust path

const meta: Meta<CardStoryWrapperProps<RevenueBreakdownCardData>> = {
  title: "Game/Cards/RevenueBreakdownCard",
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

const defaultSymbol = "AAPL";
const defaultCompanyName = "Apple Inc.";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/AAPL-2161E0NC.png?t=1633073280";

const mockBreakdown: SegmentRevenueDataItem[] = [
  {
    segmentName: "iPhone",
    currentRevenue: 200583000000,
    previousRevenue: 190000000000,
    yoyChange: (200583 - 190000) / 190000,
  },
  {
    segmentName: "Services",
    currentRevenue: 85200000000,
    previousRevenue: 75000000000,
    yoyChange: (85200 - 75000) / 75000,
  },
  {
    segmentName: "Wearables, Home & Accessories",
    currentRevenue: 39845000000,
    previousRevenue: 41000000000,
    yoyChange: (39845 - 41000) / 41000,
  },
  {
    segmentName: "Mac",
    currentRevenue: 29357000000,
    previousRevenue: 35000000000,
    yoyChange: (29357 - 35000) / 35000,
  },
  {
    segmentName: "iPad",
    currentRevenue: 28300000000,
    previousRevenue: 30000000000,
    yoyChange: (28300 - 30000) / 30000,
  },
  {
    segmentName: "Vision Pro (New)",
    currentRevenue: 1500000000,
    previousRevenue: null,
    yoyChange: null,
  },
];
const totalRevenue = mockBreakdown.reduce(
  (sum, item) => sum + item.currentRevenue,
  0
);

const mockBackData: BaseCardBackData = {
  description: `Revenue breakdown for ${defaultCompanyName} (FY2023).`,
};

const initialMockCardData: RevenueBreakdownCardData & DisplayableCardState = {
  id: `revenuebreakdown-${defaultSymbol}-FY2023`,
  type: "revenuebreakdown",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: {
    currencySymbol: "$",
    latestPeriodLabel: "FY2023 ending 2023-09-30",
    previousPeriodLabel: "FY2022 ending 2022-09-24",
  },
  liveData: {
    totalRevenueLatestPeriod: totalRevenue,
    breakdown: mockBreakdown,
    lastUpdated: new Date().toISOString(),
  },
  backData: mockBackData,
  isFlipped: false,
  websiteUrl: "https://www.apple.com",
};

const mockCardContext: CardActionContext = {
  id: initialMockCardData.id,
  symbol: defaultSymbol,
  type: "revenuebreakdown" as CardType,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  websiteUrl: initialMockCardData.websiteUrl,
  backData: initialMockCardData.backData, // Ensure backData is included
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<RevenueBreakdownCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockCardData, isFlipped: false },
    ContentComponent: RevenueBreakdownCardContent,
    expectedCardType: "revenuebreakdown",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[320px] h-[450px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockCardData, isFlipped: true },
  },
};
