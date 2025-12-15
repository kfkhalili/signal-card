// src/components/game/cards/cash-use-card/CashUseCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { action } from "storybook/actions";
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
  latestStatementDate: "2023-07-29",
  latestStatementPeriod: "FY",
};

const mockLiveData: CashUseCardData["liveData"] = {
  weightedAverageShsOut: 4100000000,
  outstandingShares_annual_data: [
    { year: 2019, value: 4300000000 },
    { year: 2020, value: 4250000000 },
    { year: 2021, value: 4200000000 },
    { year: 2022, value: 4150000000 },
    { year: 2023, value: 4100000000 },
  ],
  currentTotalDebt: 25000000000,
  totalDebt_annual_data: [
    { year: 2019, value: 22000000000 },
    { year: 2020, value: 27000000000 },
    { year: 2021, value: 24000000000 },
    { year: 2022, value: 26000000000 },
    { year: 2023, value: 25000000000 },
  ],
  currentFreeCashFlow: 15000000000,
  freeCashFlow_annual_data: [
    { year: 2019, value: 12500000000 },
    { year: 2020, value: 12000000000 },
    { year: 2021, value: 16000000000 },
    { year: 2022, value: 14000000000 },
    { year: 2023, value: 15000000000 },
  ],
  currentNetDividendsPaid: 6200000000,
  netDividendsPaid_annual_data: [
    { year: 2019, value: 5500000000 },
    { year: 2020, value: 5800000000 },
    { year: 2021, value: 6000000000 },
    { year: 2022, value: 6100000000 },
    { year: 2023, value: 6200000000 },
  ],
};

const mockBaseBackData: BaseCardBackData = {
  description: `Cash usage metrics for ${defaultCompanyName}. Financial data from ${mockStaticData.latestStatementDate} (${mockStaticData.latestStatementPeriod}).`,
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
  backData: initialMockCashUseCardData.backData,
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
  description: "Minimal cash use data for Mini Corp.",
};
const minimalInitialMockData: CashUseCardData & DisplayableCardState = {
  id: "cashuse-minimal",
  type: "cashuse",
  symbol: "MINI",
  companyName: "Mini Corp",
  logoUrl: null,
  websiteUrl: null,
  createdAt: Date.now(),
  staticData: {
    reportedCurrency: "USD",
    latestStatementDate: null,
    latestStatementPeriod: null,
  },
  liveData: {
    weightedAverageShsOut: 1000000,
    outstandingShares_annual_data: [
      { year: 2022, value: 1200000 },
      { year: 2023, value: 1000000 },
    ],
    currentTotalDebt: null,
    totalDebt_annual_data: [], // empty array tests conditional render
    currentFreeCashFlow: 5000,
    freeCashFlow_annual_data: [
      { year: 2022, value: -1000 },
      { year: 2023, value: 5000 },
    ],
    currentNetDividendsPaid: 0,
    netDividendsPaid_annual_data: [
      { year: 2022, value: 0 },
      { year: 2023, value: 0 },
    ], // All zeros tests conditional render
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
      backData: minimalMockBackData,
    },
  },
};
