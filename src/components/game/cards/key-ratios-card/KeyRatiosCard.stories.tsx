// src/components/game/cards/key-ratios-card/KeyRatiosCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { KeyRatiosCardContent } from "./KeyRatiosCardContent";
import type { KeyRatiosCardData } from "./key-ratios-card.types";
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

const meta: Meta<CardStoryWrapperProps<KeyRatiosCardData>> = {
  title: "Game/Cards/KeyRatiosCard",
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

const mockStaticData: KeyRatiosCardData["staticData"] = {
  lastUpdated: new Date().toISOString(),
  reportedCurrency: "USD",
};

const mockLiveData: KeyRatiosCardData["liveData"] = {
  priceToEarningsRatioTTM: 25.5,
  priceToSalesRatioTTM: 10.2,
  priceToBookRatioTTM: 12.1,
  priceToFreeCashFlowRatioTTM: 22.8,
  enterpriseValueMultipleTTM: 18.5,
  netProfitMarginTTM: 0.352, // Store as decimal
  grossProfitMarginTTM: 0.689, // Store as decimal
  ebitdaMarginTTM: 0.453, // Store as decimal
  debtToEquityRatioTTM: 0.5,
  dividendYieldTTM: 0.0098, // Store as decimal
  dividendPayoutRatioTTM: 0.28, // Store as decimal
  earningsPerShareTTM: 9.8,
  revenuePerShareTTM: 28.0,
  bookValuePerShareTTM: 8.1,
  freeCashFlowPerShareTTM: 11.5,
  effectiveTaxRateTTM: 0.185, // Store as decimal
  currentRatioTTM: 2.1,
  quickRatioTTM: 1.8,
  assetTurnoverTTM: 0.65,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Key Trailing Twelve Months (TTM) financial ratios for ${defaultCompanyName}. Ratios last updated on ${
    new Date(mockStaticData.lastUpdated || Date.now()).toLocaleDateString() ||
    "N/A"
  }.`,
};

const initialMockKeyRatiosCardData: KeyRatiosCardData & DisplayableCardState = {
  id: `keyratios-${defaultSymbol}-${Date.now()}`,
  type: "keyratios",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  websiteUrl: "https://www.microsoft.com",
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockKeyRatiosCardData.id,
  symbol: initialMockKeyRatiosCardData.symbol,
  type: "keyratios" as CardType,
  companyName: initialMockKeyRatiosCardData.companyName,
  logoUrl: initialMockKeyRatiosCardData.logoUrl,
  websiteUrl: initialMockKeyRatiosCardData.websiteUrl,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<KeyRatiosCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockKeyRatiosCardData, isFlipped: false },
    ContentComponent: KeyRatiosCardContent,
    expectedCardType: "keyratios",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockKeyRatiosCardData, isFlipped: true },
  },
};

export const MinimalData: Story = {
  args: {
    ...Default.args,
    initialCardData: {
      ...initialMockKeyRatiosCardData,
      id: "keyratios-minimal",
      symbol: "MINR",
      companyName: "Minimal Ratios Corp",
      logoUrl: null,
      websiteUrl: null,
      staticData: {
        lastUpdated: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        reportedCurrency: "EUR",
      },
      liveData: {
        priceToEarningsRatioTTM: 15.0,
        priceToSalesRatioTTM: null,
        priceToBookRatioTTM: 2.5,
        priceToFreeCashFlowRatioTTM: null,
        enterpriseValueMultipleTTM: 10.1,
        netProfitMarginTTM: 0.082, // Store as decimal
        grossProfitMarginTTM: null,
        ebitdaMarginTTM: 0.125, // Store as decimal
        debtToEquityRatioTTM: null,
        dividendYieldTTM: 0.021, // Store as decimal
        dividendPayoutRatioTTM: null,
        earningsPerShareTTM: 1.2,
        revenuePerShareTTM: null,
        bookValuePerShareTTM: 0.48,
        freeCashFlowPerShareTTM: null,
        effectiveTaxRateTTM: 0.22, // Store as decimal
        currentRatioTTM: null,
        quickRatioTTM: 0.8,
        assetTurnoverTTM: null,
      },
      backData: {
        description: "Key TTM financial ratios for Minimal Ratios Corp.",
      },
      isFlipped: false,
    },
    cardContext: {
      ...mockCardContext,
      id: "keyratios-minimal",
      symbol: "MINR",
      companyName: "Minimal Ratios Corp",
      logoUrl: null,
      websiteUrl: null,
    },
  },
};
