// src/components/game/cards/solvency-card/SolvencyCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { action } from "storybook/actions";
import { SolvencyCardContent } from "./SolvencyCardContent";
import type { SolvencyCardData } from "./solvency-card.types";
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

const meta: Meta<CardStoryWrapperProps<SolvencyCardData>> = {
  title: "Game/Cards/SolvencyCard",
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
  "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg";

const mockStaticData: SolvencyCardData["staticData"] = {
  periodLabel: "FY2023",
  reportedCurrency: "USD",
  filingDate: "2023-10-28",
  acceptedDate: "2023-10-27 18:00:00",
  statementDate: "2023-09-30",
  statementPeriod: "FY",
};

const mockLiveData: SolvencyCardData["liveData"] = {
  totalAssets: 352583000000,
  cashAndShortTermInvestments: 61555000000,
  totalCurrentLiabilities: 145309000000,
  shortTermDebt: 15609000000,
  longTermDebt: 95392000000,
  freeCashFlow: 99597000000,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Key solvency metrics for ${defaultCompanyName} (${mockStaticData.periodLabel}, ending ${mockStaticData.statementDate}). Includes assets, liabilities, debt, and cash flow.`,
};

const initialMockSolvencyCardData: SolvencyCardData & DisplayableCardState = {
  id: `solvency-${defaultSymbol}-${mockStaticData.statementDate}-${mockStaticData.statementPeriod}`,
  type: "solvency",
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
  id: initialMockSolvencyCardData.id,
  symbol: initialMockSolvencyCardData.symbol,
  type: "solvency" as CardType,
  companyName: initialMockSolvencyCardData.companyName,
  logoUrl: initialMockSolvencyCardData.logoUrl,
  websiteUrl: initialMockSolvencyCardData.websiteUrl,
  backData: initialMockSolvencyCardData.backData,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<SolvencyCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockSolvencyCardData, isFlipped: false },
    ContentComponent: SolvencyCardContent,
    expectedCardType: "solvency",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockSolvencyCardData, isFlipped: true },
  },
};

const minimalMockBackData: BaseCardBackData = {
  description: "Financial highlights for Minimal Solvency Inc. (Q1 2024).",
};

// Explicitly typed minimalInitialMockData
const minimalInitialMockData: SolvencyCardData & { isFlipped: boolean } = {
  id: "solvency-minimal-data",
  type: "solvency", // Ensures the type is the literal "solvency"
  symbol: "MINS",
  companyName: "Minimal Solvency Inc.",
  logoUrl: null,
  createdAt: Date.now(),
  isFlipped: false,
  websiteUrl: null, // Added to satisfy BaseCardData
  staticData: {
    periodLabel: "Q1 2024",
    reportedCurrency: "EUR",
    filingDate: null,
    acceptedDate: null,
    statementDate: "2024-03-31",
    statementPeriod: "Q1",
  },
  liveData: {
    totalAssets: 1000000,
    cashAndShortTermInvestments: 50000,
    totalCurrentLiabilities: 200000,
    shortTermDebt: null,
    longTermDebt: 300000,
    freeCashFlow: -10000,
  },
  backData: minimalMockBackData,
};

export const MinimalData: Story = {
  args: {
    ...Default.args, // Spreads default args including expectedCardType: "solvency"
    initialCardData: minimalInitialMockData, // Assign the correctly and explicitly typed object
    cardContext: {
      ...mockCardContext, // Base context
      id: "solvency-minimal-data",
      symbol: "MINS",
      type: "solvency" as CardType,
      companyName: "Minimal Solvency Inc.",
      logoUrl: null,
      websiteUrl: null, // Ensure consistency
      backData: minimalMockBackData,
    },
  },
};
