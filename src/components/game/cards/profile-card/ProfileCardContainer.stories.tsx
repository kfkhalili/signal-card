// src/components/game/cards/profile-card/ProfileCardContainer.stories.tsx
import React, { useState, useCallback, useEffect } from "react"; // Added React imports
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
  BaseCardSocialInteractions,
  OnGenericInteraction,
  CardType,
  BaseCardBackData,
  InteractionPayload,
} from "../base-card/base-card.types";
import { RARITY_LEVELS } from "@/components/game/rarityCalculator";
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
    currentRarity: { control: "select", options: Object.values(RARITY_LEVELS) },
    likeCount: { control: "number" },
    commentCount: { control: "number" },
    collectionCount: { control: "number" },
    isLikedByCurrentUser: { control: "boolean" },
    isSavedByCurrentUser: { control: "boolean" },
    isSaveDisabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileCardContainer>;

const defaultSymbol: string = "AAPL";
const defaultCompanyName: string = "Apple Inc.";
const defaultLogoUrl: string =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/500px-Apple_logo_black.svg.png"; // User updated logo

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
    "This card provides a snapshot of the company's profile and recent market performance. Flip for more details.",
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
  currentRarity: RARITY_LEVELS.COMMON,
  rarityReason: null,
  likeCount: 120,
  commentCount: 15,
  collectionCount: 45,
  isLikedByCurrentUser: false,
  isSavedByCurrentUser: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockCardData.id,
  symbol: initialMockCardData.symbol,
  type: "profile" as CardType,
  companyName: initialMockCardData.companyName,
  logoUrl: initialMockCardData.logoUrl,
  websiteUrl: initialMockCardData.websiteUrl,
};

const mockSocialInteractions: BaseCardSocialInteractions = {
  onLike: (context) => action("social:like")(context),
  onComment: (context) => action("social:comment")(context),
  onShare: (context) => action("social:share")(context),
  onSave: (context) => action("social:save")(context),
};

const mockSpecificInteractions: ProfileCardInteractions = {
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

// Default story now uses a render function for interactive flip
export const Default: Story = {
  render: (args) => {
    // Use local state for isFlipped, initialized by args.isFlipped (from controls)
    const [localIsFlipped, setLocalIsFlipped] = useState(args.isFlipped);

    // Effect to update local state if args.isFlipped changes (e.g., via Storybook controls)
    useEffect(() => {
      setLocalIsFlipped(args.isFlipped);
    }, [args.isFlipped]);

    const handleFlip = useCallback(() => {
      setLocalIsFlipped((prev) => {
        const newFlippedState = !prev;
        // Log the action, passing the card ID
        action("onFlip")(args.cardData?.id || "unknown-id");
        return newFlippedState;
      });
    }, [args.cardData?.id]); // Removed args.onFlip from deps as it's just action()

    // Ensure the cardData prop also reflects the current flipped state
    const currentCardData = {
      ...(args.cardData as ProfileCardData & DisplayableCardState), // Cast to ensure type safety
      isFlipped: localIsFlipped,
    };

    return (
      <ProfileCardContainer
        {...args} // Spread all other args from the story
        cardData={currentCardData} // Pass the cardData with updated isFlipped
        isFlipped={localIsFlipped} // Pass the local isFlipped state as a direct prop
        onFlip={handleFlip} // Use the custom handler
      />
    );
  },
  args: {
    cardData: { ...initialMockCardData, isFlipped: false }, // Initial state for cardData
    isFlipped: false, // Initial state for the direct isFlipped prop
    currentRarity: initialMockCardData.currentRarity,
    rarityReason: initialMockCardData.rarityReason,
    likeCount: initialMockCardData.likeCount,
    commentCount: initialMockCardData.commentCount,
    collectionCount: initialMockCardData.collectionCount,
    isLikedByCurrentUser: initialMockCardData.isLikedByCurrentUser,
    isSavedByCurrentUser: initialMockCardData.isSavedByCurrentUser,
    cardContext: mockCardContext,
    socialInteractions: mockSocialInteractions,
    onDeleteRequest: (context) => action("onDeleteRequest")(context),
    onHeaderIdentityClick: (context) =>
      action("onHeaderIdentityClick")(context),
    isSaveDisabled: false,
    onGenericInteraction: mockOnGenericInteraction,
    sourceCardId: initialMockCardData.id,
    sourceCardSymbol: initialMockCardData.symbol,
    sourceCardType: "profile",
    specificInteractions: mockSpecificInteractions,
    className: "w-[300px] h-[420px]",
    // onFlip: action("onFlip") // This is implicitly handled by the render function's handleFlip
  },
};

export const Flipped: Story = {
  args: {
    ...Default.args, // Start with Default's args structure
    cardData: {
      // Override cardData
      ...initialMockCardData,
      isFlipped: true,
    },
    isFlipped: true, // Override direct prop
  },
};

export const WithActiveSocialInteractions: Story = {
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
      isFlipped: Default.args?.isFlipped ?? false, // Maintain default flip state or specific for this story
      isLikedByCurrentUser: true,
      isSavedByCurrentUser: true,
      likeCount: (initialMockCardData.likeCount ?? 0) + 1,
      collectionCount: (initialMockCardData.collectionCount ?? 0) + 1,
    },
    isLikedByCurrentUser: true,
    isSavedByCurrentUser: true,
    likeCount: (Default.args?.likeCount ?? 0) + 1,
    collectionCount: (Default.args?.collectionCount ?? 0) + 1,
  },
};

export const RareCard: Story = {
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
      isFlipped: Default.args?.isFlipped ?? false,
      currentRarity: RARITY_LEVELS.RARE,
      rarityReason: "Significant news event today.",
    },
    currentRarity: RARITY_LEVELS.RARE,
    rarityReason: "Significant news event today.",
  },
};

export const MinimalLiveDataStory: Story = {
  name: "Minimal Live Data",
  args: {
    ...Default.args,
    cardData: {
      ...initialMockCardData,
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
  },
};

export const NoInteractions: Story = {
  args: {
    ...Default.args,
    socialInteractions: undefined,
    specificInteractions: undefined,
    onDeleteRequest: undefined,
    onHeaderIdentityClick: undefined,
  },
};
