// src/components/game/cards/revenue-card/RevenueCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { RevenueCardContent } from "./RevenueCardContent";
import type { RevenueCardData } from "./revenue-card.types";
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

const meta: Meta<CardStoryWrapperProps<RevenueCardData>> = {
  title: "Game/Cards/RevenueCard",
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

const mockStaticData: RevenueCardData["staticData"] = {
  periodLabel: "FY2023",
  reportedCurrency: "USD",
  filingDate: "2023-07-27",
  acceptedDate: "2023-07-27 18:00:00",
  statementDate: "2023-06-30",
  statementPeriod: "FY",
};

const mockLiveData: RevenueCardData["liveData"] = {
  revenue: 211915000000,
  grossProfit: 146052000000,
  operatingIncome: 88523000000,
  netIncome: 72361000000,
  freeCashFlow: 63297000000,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Key financial metrics for ${defaultCompanyName} (${mockStaticData.periodLabel}, ending ${mockStaticData.statementDate}). Includes revenue, profits, and free cash flow.`,
};

const initialMockRevenueCardData: RevenueCardData & DisplayableCardState = {
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
  websiteUrl: null, // Added to satisfy BaseCardData
};

const mockCardContext: CardActionContext = {
  id: initialMockRevenueCardData.id,
  symbol: initialMockRevenueCardData.symbol,
  type: "revenue" as CardType,
  companyName: initialMockRevenueCardData.companyName,
  logoUrl: initialMockRevenueCardData.logoUrl,
  websiteUrl: initialMockRevenueCardData.websiteUrl,
  backData: initialMockRevenueCardData.backData,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<RevenueCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockRevenueCardData, isFlipped: false },
    ContentComponent: RevenueCardContent,
    expectedCardType: "revenue",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockRevenueCardData, isFlipped: true },
  },
};

const minimalMockBackData: BaseCardBackData = {
  description: "Financial highlights for Minimal Inc. (Q1 2024).",
};

// Explicitly type minimalInitialMockData and ensure type is "revenue"
const minimalInitialMockData: RevenueCardData & { isFlipped: boolean } = {
  id: "revenue-minimal-data",
  type: "revenue", // Corrected to "revenue" and ensure it's the literal type
  symbol: "MIN",
  companyName: "Minimal Inc.",
  logoUrl: null,
  createdAt: Date.now(),
  isFlipped: false,
  websiteUrl: null, // Add missing optional BaseCardData property
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
  backData: minimalMockBackData,
};

export const MinimalData: Story = {
  args: {
    ...Default.args, // Spreads default args including expectedCardType: "revenue"
    initialCardData: minimalInitialMockData, // Assign the correctly typed object
    cardContext: {
      ...mockCardContext, // Base context
      id: "revenue-minimal-data",
      symbol: "MIN",
      type: "revenue" as CardType, // Type here is for CardActionContext which expects CardType
      companyName: "Minimal Inc.",
      logoUrl: null,
      websiteUrl: null, // Ensure consistency
      backData: minimalMockBackData,
    },
  },
};
