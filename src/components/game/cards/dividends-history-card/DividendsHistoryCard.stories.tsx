// src/components/game/cards/dividends-history-card/DividendsHistoryCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "storybook/actions";
import { DividendsHistoryCardContent } from "./DividendsHistoryCardContent";
import type {
  DividendsHistoryCardData,
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
import {
  CardStoryWrapper,
  type CardStoryWrapperProps,
} from "../../storybook/CardStoryWrapper"; // Adjust path

const meta: Meta<CardStoryWrapperProps<DividendsHistoryCardData>> = {
  title: "Game/Cards/DividendsHistoryCard",
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
  yieldAtDistribution: 0.0068,
  frequency: "Quarterly",
};

const mockAnnualTotals: AnnualDividendTotal[] = [
  { year: 2022, totalDividend: 2.24 },
  { year: 2023, totalDividend: 2.48 },
  { year: 2024, totalDividend: 2.79 },
  { year: 2025, totalDividend: 3.0, isEstimate: true },
];

const mockStaticData: DividendsHistoryCardData["staticData"] = {
  reportedCurrency: "USD",
  typicalFrequency: "Quarterly",
};

const mockLiveData: DividendsHistoryCardData["liveData"] = {
  latestDividend: mockLatestDividend,
  annualDividendFigures: mockAnnualTotals,
  lastFullYearDividendGrowthYoY: (2.79 - 2.48) / 2.48,
  lastUpdated: new Date().toISOString(),
};

const mockBaseBackData: BaseCardBackData = {
  description: `Historical dividend payments and trends for ${defaultCompanyName}, including recent payments and annual totals.`,
};

const initialMockDividendsHistoryCardData: DividendsHistoryCardData &
  DisplayableCardState = {
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
  id: initialMockDividendsHistoryCardData.id,
  symbol: initialMockDividendsHistoryCardData.symbol,
  type: "dividendshistory" as CardType,
  companyName: initialMockDividendsHistoryCardData.companyName,
  logoUrl: initialMockDividendsHistoryCardData.logoUrl,
  websiteUrl: null,
  backData: initialMockDividendsHistoryCardData.backData, // Ensure backData is included
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<DividendsHistoryCardData>>;

export const Default: Story = {
  args: {
    initialCardData: {
      ...initialMockDividendsHistoryCardData,
      isFlipped: false,
    },
    ContentComponent: DividendsHistoryCardContent,
    expectedCardType: "dividendshistory",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: {
      ...initialMockDividendsHistoryCardData,
      isFlipped: true,
    },
  },
};

const minimalMockBackData: BaseCardBackData = {
  description: "No dividend history found for No Dividend Corp.",
};

const minimalInitialMockData = {
  ...initialMockDividendsHistoryCardData,
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
    annualDividendFigures: [
      { year: 2021, totalDividend: 0 },
      { year: 2022, totalDividend: 0 },
      { year: 2023, totalDividend: 0 },
    ],
    lastFullYearDividendGrowthYoY: null,
    lastUpdated: new Date().toISOString(),
  },
  backData: minimalMockBackData,
  isFlipped: false,
};

export const MinimalData: Story = {
  args: {
    ...Default.args,
    initialCardData: minimalInitialMockData,
    cardContext: {
      ...mockCardContext,
      id: "dividendshistory-minimal",
      symbol: "NODIV",
      companyName: "No Dividend Corp",
      logoUrl: null,
      backData: minimalMockBackData, // Ensure backData for minimal story
    },
  },
};
