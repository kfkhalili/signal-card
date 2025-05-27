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
    // Props of ProfileCardContainer after refactor
    cardData: {
      control: "object",
      description:
        "The full data for the profile card, including its type and flip state.",
    },
    isFlipped: {
      control: "boolean",
      description: "Controls the flipped state of the card.",
    },
    cardContext: {
      control: "object",
      description: "Contextual information about the card for actions.",
    },
    onGenericInteraction: {
      action: "onGenericInteraction",
      description: "Handles all generic interactions from the card.",
    },
    onDeleteRequest: {
      action: "onDeleteRequest",
      description: "Callback for when card deletion is requested.",
    },
    className: { control: "text", description: "Optional outer class names." },
    innerCardClassName: {
      control: "text",
      description: "Optional inner class names for styling.",
    },
  },
};

export default meta;

// Adjusted Props for the Storybook wrapper component
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
  // The wrapper will receive the full card data for initial setup
  initialCardData: ProfileCardData & DisplayableCardState;
};

const ProfileCardStoryWrapper: React.FC<ProfileCardStoryWrapperProps> = (
  props
) => {
  const {
    initialIsFlipped,
    initialCardData, // Use this for initial state and as the base for currentCardData
    onGenericInteraction,
    cardContext: propCardContext, // Rename to avoid conflict with derived context
    onDeleteRequest,
    className,
    innerCardClassName,
    children,
  } = props;

  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  // currentCardData now combines initialCardData with the localIsFlipped state
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
    // If initialCardData itself changes (e.g., from story args), update local state
    setCurrentCardData({ ...initialCardData, isFlipped: localIsFlipped });
  }, [initialCardData, localIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prevFlipped) => {
      const newFlippedState = !prevFlipped;
      action("onFlip")(initialCardData.id);
      // Update the cardData prop passed to the container to reflect the flip
      setCurrentCardData((prevCardData) => ({
        ...prevCardData,
        isFlipped: newFlippedState,
      }));
      return newFlippedState;
    });
  }, [initialCardData.id]);

  if (
    !onGenericInteraction ||
    !propCardContext || // Check propCardContext
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
        {" "}
        Error in story setup. Check console.{" "}
      </div>
    );
  }

  return (
    <ProfileCardContainer
      cardData={currentCardData} // Pass the stateful cardData
      isFlipped={localIsFlipped} // isFlipped is now consistent with cardData.isFlipped
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext} // Use the prop directly
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
};

const mockLiveData: ProfileCardLiveData = {
  price: 170.34,
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

type Story = StoryObj<ProfileCardStoryWrapperProps>; // Use the wrapper's props type

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
    ...Default.args, // Spread default args
    initialIsFlipped: true,
    initialCardData: { ...initialMockProfileCardData, isFlipped: true },
  },
};

export const MinimalLiveDataStory: Story = {
  name: "Minimal Live Data", // Name for Storybook display
  render: (args) => <ProfileCardStoryWrapper {...args} />,
  args: {
    ...Default.args, // Spread default args
    initialIsFlipped: false,
    initialCardData: {
      ...initialMockProfileCardData, // Start with full mock
      id: "profile-min-live",
      symbol: "MIN",
      companyName: "Minimal Inc.",
      logoUrl: null,
      websiteUrl: null,
      liveData: {
        price: 100.0,
      },
      staticData: {
        ...initialMockProfileCardData.staticData, // Keep other static data
        db_id: "min-data-id",
        description: "A company with minimal profile data available currently.",
        industry: undefined, // Explicitly undefined for minimal
        sector: undefined,
        ceo: undefined,
        website: undefined,
      },
      isFlipped: false, // Ensure flip state is set
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
  // Renamed to avoid conflict
  render: (args) => <ProfileCardStoryWrapper {...args} />,
  args: {
    ...Default.args, // Spread default args
    initialIsFlipped: false,
    initialCardData: { ...initialMockProfileCardData, isFlipped: false },
    onGenericInteraction: (payload: InteractionPayload) => {
      action("onGenericInteraction (NoInteractionsStory)")(payload);
      // No actual interaction handling for this story, just logging
    },
  },
};
