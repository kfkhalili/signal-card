// src/components/game/cards/profile-card/ProfileCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs";
import { action } from "storybook/actions";
import { ProfileCardContent } from "./ProfileCardContent";
import type { ProfileCardData } from "./profile-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  CardType,
  BaseCardBackData,
  InteractionPayload,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";
import {
  CardStoryWrapper,
  type CardStoryWrapperProps,
} from "../../storybook/CardStoryWrapper"; // Adjust path as needed

const meta: Meta<CardStoryWrapperProps<ProfileCardData>> = {
  title: "Game/Cards/ProfileCard",
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
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/500px-Apple_logo_black.svg.png";

const mockStaticData: ProfileCardData["staticData"] = {
  db_id: "aapl-db-id",
  exchange: "NASDAQ",
  exchange_full_name: "NASDAQ Stock Market",
  industry: "Technology",
  sector: "Electronic Technology",
  description:
    "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. It also sells various related services.",
  website: "https://www.apple.com",
  ceo: "Timothy D. Cook",
  country: "US",
  currency: "USD",
  profile_last_updated: new Date().toISOString(),
  formatted_ipo_date: "December 12, 1980",
  formatted_full_time_employees: "164,000",
  is_etf: false,
  is_adr: false,
  is_fund: false,
  full_address: "One Apple Park Way, Cupertino, CA 95014",
  phone: "408-996-1010",
  last_dividend: 0.96,
  beta: 1.28,
  average_volume: 58000000,
  isin: "US0378331005",
};

const mockLiveData: ProfileCardData["liveData"] = {
  price: 170.34,
  marketCap: 2600000000000,
  revenue: 383285000000,
  eps: 6.13,
  priceToEarningsRatioTTM: 27.79,
  priceToBookRatioTTM: 42.5,
};

const mockBaseBackData: BaseCardBackData = {
  description:
    "This card provides a description of the company's profile and recent market performance. Flip for more details.",
};

const initialMockProfileCardData: ProfileCardData & DisplayableCardState = {
  id: "profile-aapl-123",
  symbol: defaultSymbol,
  type: "profile",
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  websiteUrl: mockStaticData.website,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockProfileCardData.id,
  symbol: initialMockProfileCardData.symbol,
  type: "profile" as CardType,
  companyName: initialMockProfileCardData.companyName,
  logoUrl: initialMockProfileCardData.logoUrl,
  websiteUrl: initialMockProfileCardData.websiteUrl,
  backData: initialMockProfileCardData.backData, // Ensure backData is included
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CardStoryWrapperProps<ProfileCardData>>;

export const Default: Story = {
  args: {
    initialCardData: { ...initialMockProfileCardData, isFlipped: false },
    ContentComponent: ProfileCardContent,
    expectedCardType: "profile",
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args,
    initialCardData: { ...initialMockProfileCardData, isFlipped: true },
  },
};

const minimalMockBackData: BaseCardBackData = {
  description: "Minimal profile information.",
};

const minimalInitialMockData = {
  ...initialMockProfileCardData,
  id: "profile-min-live",
  symbol: "MIN",
  companyName: "Minimal Inc.",
  logoUrl: null,
  websiteUrl: null,
  liveData: {
    price: 100.0,
    marketCap: 50000000,
    revenue: 10000000,
    eps: 0.5,
    priceToEarningsRatioTTM: 200.0,
    priceToBookRatioTTM: null,
  },
  staticData: {
    ...initialMockProfileCardData.staticData,
    db_id: "min-data-id",
    description: "A company with minimal profile data available currently.",
    industry: undefined,
    sector: undefined,
    ceo: undefined,
    website: undefined,
    last_dividend: 0.1,
    beta: 0.5,
    average_volume: 100000,
    isin: "US12345MIN01",
    currency: "USD",
  },
  backData: minimalMockBackData,
  isFlipped: false,
};

export const MinimalLiveDataStory: Story = {
  name: "Minimal Live Data",
  args: {
    ...Default.args,
    initialCardData: minimalInitialMockData,
    cardContext: {
      id: "profile-min-live",
      symbol: "MIN",
      type: "profile" as CardType,
      companyName: "Minimal Inc.",
      logoUrl: null,
      websiteUrl: null,
      backData: minimalMockBackData, // Ensure backData for minimal story
    },
  },
};
