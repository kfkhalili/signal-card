// src/components/game/cards/cash-use-card/CashUseCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { CashUseCardContent } from "./CashUseCardContent";
import type { CashUseCardData } from "./cash-use-card.types";
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

const meta: Meta<CardStoryWrapperProps<CashUseCardData>> = {
  title: "Game/Cards/CashUseCard",
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

const defaultSymbol = "CSCO";
const defaultCompanyName = "Cisco Systems, Inc.";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/CSCO-099a9655.png?t=1633073202";

const mockStaticData: CashUseCardData["staticData"] = {
  reportedCurrency: "USD",
  debtRangePeriodLabel: "2019 - 2023",
  fcfRangePeriodLabel: "2019 - 2023",
  dividendsRangePeriodLabel: "2019 - 2023",
  latestStatementDate: "2023-07-29",
  latestStatementPeriod: "FY",
  latestSharesFloatDate: "2023-10-27",
};

const mockLiveData: CashUseCardData["liveData"] = {
  currentOutstandingShares: 4100000000,
  currentTotalDebt: 25000000000,
  totalDebt_5y_min: 20000000000,
  totalDebt_5y_max: 27000000000,
  currentFreeCashFlow: 15000000000,
  freeCashFlow_5y_min: 12000000000,
  freeCashFlow_5y_max: 16000000000,
  currentNetDividendsPaid: 6000000000,
  netDividendsPaid_5y_min: 5500000000,
  netDividendsPaid_5y_max: 6500000000,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Cash usage metrics for ${defaultCompanyName}. Financials from ${
    mockStaticData.latestStatementPeriod
  } ${mockStaticData.latestStatementDate?.substring(
    0,
    4
  )}. Shares outstanding as of ${mockStaticData.latestSharesFloatDate}.`,
};

const initialMockCashUseCardData: CashUseCardData & DisplayableCardState = {
  id: `cashuse-${defaultSymbol}-${Date.now()}`,
  type: "cashuse",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  websiteUrl: "https://www.cisco.com",
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockCashUseCardData.id,
  symbol: initialMockCashUseCardData.symbol,
  type: "cashuse" as CardType,
  companyName: initialMockCashUseCardData.companyName,
  logoUrl: initialMockCashUseCardData.logoUrl,
  websiteUrl: initialMockCashUseCardData.websiteUrl,
  backData: initialMockCashUseCardData.backData, // Ensure backData is included
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<CashUseCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockCashUseCardData, isFlipped: false },
    ContentComponent: CashUseCardContent,
    expectedCardType: "cashuse",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockCashUseCardData, isFlipped: true },
  },
};

const minimalMockBackData: BaseCardBackData = {
  description:
    "Minimal cash use data for Mini Corp. Shares outstanding as of 2024-01-15.",
};
const minimalInitialMockData = {
  ...initialMockCashUseCardData,
  id: "cashuse-minimal",
  symbol: "MINI",
  companyName: "Mini Corp",
  logoUrl: null,
  websiteUrl: null,
  staticData: {
    reportedCurrency: "USD",
    debtRangePeriodLabel: "N/A",
    fcfRangePeriodLabel: "N/A",
    dividendsRangePeriodLabel: "N/A",
    latestStatementDate: null,
    latestStatementPeriod: null,
    latestSharesFloatDate: "2024-01-15",
  },
  liveData: {
    currentOutstandingShares: 1000000,
    currentTotalDebt: null,
    totalDebt_5y_min: null,
    totalDebt_5y_max: null,
    currentFreeCashFlow: 5000,
    freeCashFlow_5y_min: 0,
    freeCashFlow_5y_max: 10000,
    currentNetDividendsPaid: null,
    netDividendsPaid_5y_min: null,
    netDividendsPaid_5y_max: null,
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
      id: "cashuse-minimal",
      symbol: "MINI",
      companyName: "Mini Corp",
      logoUrl: null,
      websiteUrl: null,
      backData: minimalMockBackData, // Ensure backData is included for minimal story
    },
  },
};
