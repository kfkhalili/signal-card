// src/components/game/cards/profile-card/ProfileCardContainer.stories.tsx
import React, { useState, useCallback, useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { ProfileCardContainer } from "./ProfileCardContainer";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
  ProfileCardInteractions,
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
    isFlipped: { control: "boolean" },
    cardContext: { control: "object" },
    onGenericInteraction: { action: "onGenericInteraction" },
    sourceCardId: { control: "text" },
    sourceCardSymbol: { control: "text" },
    sourceCardType: { control: "text" },
    onDeleteRequest: { action: "onDeleteRequest" },
    onHeaderIdentityClick: { action: "onHeaderIdentityClick" },
    className: { control: "text" },
    innerCardClassName: { control: "text" },
    specificInteractions: { control: "object" },
  },
};

export default meta;

type ProfileCardStoryWrapperProps = StoryObj<
  typeof ProfileCardContainer
>["args"] & {
  initialIsFlipped: boolean;
};

const ProfileCardStoryWrapper: React.FC<ProfileCardStoryWrapperProps> = (
  props
) => {
  const {
    initialIsFlipped,
    cardData: initialCardDataFromArgs,
    onGenericInteraction,
    sourceCardId,
    sourceCardSymbol,
    sourceCardType,
    cardContext,
    onDeleteRequest, // Destructure onDeleteRequest
    onHeaderIdentityClick,
    className,
    innerCardClassName,
    specificInteractions,
    children,
  } = props;

  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);

  useEffect(() => {
    setLocalIsFlipped(initialIsFlipped);
  }, [initialIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prev) => {
      const newFlippedState = !prev;
      action("onFlip")(initialCardDataFromArgs?.id || "unknown-id");
      return newFlippedState;
    });
  }, [initialCardDataFromArgs?.id]);

  // Extended guard clause including onDeleteRequest
  if (
    !onGenericInteraction ||
    !sourceCardId ||
    !sourceCardSymbol ||
    !sourceCardType ||
    !cardContext ||
    !initialCardDataFromArgs ||
    !onDeleteRequest // Add onDeleteRequest to the guard
  ) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[Storybook ProfileCardStoryWrapper] Essential prop(s) missing from story args. " +
          "ProfileCardContainer requires: onGenericInteraction, sourceCardId, sourceCardSymbol, sourceCardType, cardContext, cardData, and onDeleteRequest.",
        {
          onGenericInteraction,
          sourceCardId,
          sourceCardSymbol,
          sourceCardType,
          cardContext,
          initialCardDataFromArgs,
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
        Error: Story args are incomplete. Check console.
      </div>
    );
  }

  const currentCardDataForContainer = {
    ...(initialCardDataFromArgs as ProfileCardData & DisplayableCardState),
    isFlipped: localIsFlipped,
  };

  return (
    <ProfileCardContainer
      cardData={currentCardDataForContainer}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      sourceCardId={sourceCardId}
      sourceCardSymbol={sourceCardSymbol}
      sourceCardType={sourceCardType}
      cardContext={cardContext}
      onDeleteRequest={onDeleteRequest} // Now known to be non-undefined
      onHeaderIdentityClick={onHeaderIdentityClick}
      className={className}
      innerCardClassName={innerCardClassName}
      specificInteractions={specificInteractions}>
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
};

const mockLiveData: ProfileCardLiveData = {
  price: 170.34,
};

const mockBaseBackData: BaseCardBackData = {
  description:
    "This card provides a description of the company's profile and recent market performance. Flip for more details.",
};

const initialMockCardData: ProfileCardData & DisplayableCardState = {
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
  id: initialMockCardData.id,
  symbol: initialMockCardData.symbol,
  type: "profile" as CardType,
  companyName: initialMockCardData.companyName,
  logoUrl: initialMockCardData.logoUrl,
  websiteUrl: initialMockCardData.websiteUrl,
};

const mockProfileSpecificInteractions: ProfileCardInteractions = {
  onWebsiteClick: (websiteUrl: string) =>
    action("specific:websiteClick")(websiteUrl),
  onFilterByField: (fieldType, value) =>
    action("specific:filterByField")(fieldType, value),
  onRequestPriceCard: (context) => action("specific:requestPriceCard")(context),
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<typeof ProfileCardContainer>;

export const Default: Story = {
  render: (args) => (
    <ProfileCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? false}
    />
  ),
  args: {
    cardData: { ...initialMockCardData, isFlipped: false },
    isFlipped: false,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onHeaderIdentityClick: (context) =>
      action("onHeaderIdentityClick")(context),
    onGenericInteraction: mockOnGenericInteraction,
    sourceCardId: initialMockCardData.id,
    sourceCardSymbol: initialMockCardData.symbol,
    sourceCardType: "profile",
    specificInteractions: mockProfileSpecificInteractions,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => (
    <ProfileCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? true}
    />
  ),
  args: {
    ...Default.args,
    cardData: {
      ...(Default.args?.cardData as ProfileCardData & DisplayableCardState),
      isFlipped: true,
    },
    isFlipped: true,
  },
};

export const MinimalLiveDataStory: Story = {
  name: "Minimal Live Data",
  render: (args) => (
    <ProfileCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? false}
    />
  ),
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
      id: "profile-min-live",
      symbol: "MIN",
      isFlipped: Default.args?.isFlipped ?? false,
      liveData: {
        price: 100.0,
      },
      staticData: {
        ...mockStaticData,
        db_id: "min-data-id",
        description: "A company with minimal profile data available currently.",
        industry: undefined,
        sector: undefined,
        ceo: undefined,
      },
    },
    sourceCardId: "profile-min-live",
    sourceCardSymbol: "MIN",
    cardContext: {
      ...(Default.args?.cardContext as CardActionContext),
      id: "profile-min-live",
      symbol: "MIN",
    },
  },
};

export const NoInteractions: Story = {
  render: (args) => (
    <ProfileCardStoryWrapper
      {...args}
      initialIsFlipped={args.isFlipped ?? false}
    />
  ),
  args: {
    ...Default.args,
    // Provide a non-undefined onDeleteRequest to satisfy the guard, even if it's a no-op
    onDeleteRequest: (context) => {
      action("onDeleteRequest (no-op for NoInteractions story)")(context);
    },
    onHeaderIdentityClick: undefined,
    specificInteractions: undefined,
  },
};
