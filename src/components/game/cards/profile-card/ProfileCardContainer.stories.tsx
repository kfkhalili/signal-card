// src/components/game/cards/profile-card/ProfileCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { ProfileCardContainer } from "./ProfileCardContainer";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
} from "./profile-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  CardType,
  BaseCardBackData,
  InteractionPayload,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof ProfileCardContainer> = {
  title: "Game/Cards/ProfileCardContainer",
  component: ProfileCardContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    cardData: { control: "object" },
    isFlipped: { control: "boolean" },
    cardContext: { control: "object" },
    onGenericInteraction: { action: "onGenericInteraction" },
    onDeleteRequest: { action: "onDeleteRequest" },
    className: { control: "text" },
    innerCardClassName: { control: "text" },
  },
};

export default meta;

type ProfileCardStoryWrapperProps = Pick<
  ComponentProps<typeof ProfileCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
  | "children"
> & {
  initialIsFlipped: boolean;
  initialCardData: ProfileCardData & DisplayableCardState;
};

const ProfileCardStoryWrapper: React.FC<ProfileCardStoryWrapperProps> = (
  props
) => {
  const {
    initialIsFlipped,
    initialCardData,
    onGenericInteraction,
    cardContext: propCardContext,
    onDeleteRequest,
    className,
    innerCardClassName,
    children,
  } = props;

  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  const [currentCardData, setCurrentCardData] = useState<
    ProfileCardData & DisplayableCardState
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
    setLocalIsFlipped((prevFlipped) => {
      const newFlippedState = !prevFlipped;
      action("onFlip")(initialCardData.id);
      setCurrentCardData((prevCardData) => ({
        ...prevCardData,
        isFlipped: newFlippedState,
      }));
      return newFlippedState;
    });
  }, [initialCardData.id]);

  if (
    !onGenericInteraction ||
    !propCardContext ||
    !currentCardData ||
    !onDeleteRequest
  ) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[Storybook ProfileCardStoryWrapper] Essential prop(s) missing from story args. ",
        {
          onGenericInteraction,
          propCardContext,
          currentCardData,
          onDeleteRequest,
        }
      );
    }
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid red",
          color: "red",
          backgroundColor: "lightpink",
          maxWidth: "300px",
          textAlign: "center",
        }}>
        Error in story setup. Check console.
      </div>
    );
  }

  return (
    <ProfileCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
      {children}
    </ProfileCardContainer>
  );
};

const defaultSymbol = "AAPL";
const defaultCompanyName = "Apple Inc.";
const defaultLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/500px-Apple_logo_black.svg.png";

const mockStaticData: ProfileCardStaticData = {
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

const mockLiveData: ProfileCardLiveData = {
  price: 170.34,
  marketCap: 2600000000000,
  revenue: 383285000000, // TTM Revenue
  eps: 6.13, // TTM EPS from ratios_ttm
  priceToEarningsRatioTTM: 27.79, // Example TTM P/E
  priceToBookRatioTTM: 42.5, // Example TTM P/B
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
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<ProfileCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <ProfileCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: { ...initialMockProfileCardData, isFlipped: false },
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <ProfileCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockProfileCardData, isFlipped: true },
  },
};

export const MinimalLiveDataStory: Story = {
  name: "Minimal Live Data",
  render: (args) => <ProfileCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: {
      ...initialMockProfileCardData,
      id: "profile-min-live",
      symbol: "MIN",
      companyName: "Minimal Inc.",
      logoUrl: null,
      websiteUrl: null,
      liveData: {
        // Includes new ratios as potentially null
        price: 100.0,
        marketCap: 50000000,
        revenue: 10000000,
        eps: 0.5, // TTM EPS
        priceToEarningsRatioTTM: 200.0, // Calculated from price and EPS
        priceToBookRatioTTM: null, // Example of a missing ratio
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
        currency: "USD", // Added currency for minimal data
      },
      isFlipped: false,
    },
    cardContext: {
      id: "profile-min-live",
      symbol: "MIN",
      type: "profile" as CardType,
      companyName: "Minimal Inc.",
      logoUrl: null,
      websiteUrl: null,
    },
  },
};

export const NoInteractionsStory: Story = {
  render: (args) => <ProfileCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: { ...initialMockProfileCardData, isFlipped: false },
    onGenericInteraction: (payload: InteractionPayload) => {
      action("onGenericInteraction (NoInteractionsStory)")(payload);
    },
  },
};
