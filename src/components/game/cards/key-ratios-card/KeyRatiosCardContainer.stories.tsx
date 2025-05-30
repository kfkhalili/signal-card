// src/components/game/cards/key-ratios-card/KeyRatiosCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { KeyRatiosCardContainer } from "./KeyRatiosCardContainer";
import type {
  KeyRatiosCardData,
  KeyRatiosCardStaticData,
  KeyRatiosCardLiveData,
} from "./key-ratios-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof KeyRatiosCardContainer> = {
  title: "Game/Cards/KeyRatiosCardContainer",
  component: KeyRatiosCardContainer,
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

type KeyRatiosCardStoryWrapperProps = Pick<
  ComponentProps<typeof KeyRatiosCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
  | "children"
> & {
  initialIsFlipped: boolean;
  initialCardData: KeyRatiosCardData & DisplayableCardState;
};

const KeyRatiosCardStoryWrapper: React.FC<KeyRatiosCardStoryWrapperProps> = ({
  initialIsFlipped,
  initialCardData,
  onGenericInteraction,
  cardContext: propCardContext,
  onDeleteRequest,
  className,
  innerCardClassName,
  children,
}) => {
  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  const [currentCardData, setCurrentCardData] = useState<
    KeyRatiosCardData & DisplayableCardState
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
    setLocalIsFlipped((prev) => {
      const newFlippedState = !prev;
      action("onFlip (handled by wrapper)")(initialCardData.id);
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
    return (
      <div style={{ color: "red", border: "1px solid red", padding: "10px" }}>
        Error: Story args incomplete. Check console.
      </div>
    );
  }

  return (
    <KeyRatiosCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
      {children}
    </KeyRatiosCardContainer>
  );
};

const defaultSymbol = "MSFT";
const defaultCompanyName = "Microsoft Corporation";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/MSFT-a203b22d.png?t=1633073277";

const mockStaticData: KeyRatiosCardStaticData = {
  lastUpdated: new Date().toISOString(),
  reportedCurrency: "USD",
};

const mockLiveData: KeyRatiosCardLiveData = {
  priceToEarningsRatioTTM: 25.5,
  priceToSalesRatioTTM: 10.2,
  priceToBookRatioTTM: 12.1,
  priceToFreeCashFlowRatioTTM: 22.8,
  enterpriseValueMultipleTTM: 18.5,
  netProfitMarginTTM: 35.2,
  grossProfitMarginTTM: 68.9,
  ebitdaMarginTTM: 45.3,
  debtToEquityRatioTTM: 0.5,
  dividendYieldTTM: 0.98,
  dividendPayoutRatioTTM: 28.0,
  earningsPerShareTTM: 9.8,
  revenuePerShareTTM: 28.0,
  bookValuePerShareTTM: 8.1,
  freeCashFlowPerShareTTM: 11.5,
  effectiveTaxRateTTM: 18.5,
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

type Story = StoryObj<KeyRatiosCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <KeyRatiosCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockKeyRatiosCardData,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <KeyRatiosCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockKeyRatiosCardData, isFlipped: true },
  },
};

export const MinimalData: Story = {
  render: (args) => <KeyRatiosCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
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
        netProfitMarginTTM: 8.2,
        grossProfitMarginTTM: null,
        ebitdaMarginTTM: 12.5,
        debtToEquityRatioTTM: null,
        dividendYieldTTM: 2.1,
        dividendPayoutRatioTTM: null,
        earningsPerShareTTM: 1.2,
        revenuePerShareTTM: null,
        bookValuePerShareTTM: 0.48,
        freeCashFlowPerShareTTM: null,
        effectiveTaxRateTTM: 22.0,
        currentRatioTTM: null,
        quickRatioTTM: 0.8,
        assetTurnoverTTM: null,
      },
      backData: {
        description: "Key TTM financial ratios for Minimal Ratios Corp.",
      },
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

export const NoInteractionsStory: Story = {
  render: (args) => <KeyRatiosCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: { ...initialMockKeyRatiosCardData, isFlipped: false },
    onGenericInteraction: (payload: InteractionPayload) => {
      action("onGenericInteraction (NoInteractionsStory)")(payload);
    },
  },
};
