// src/components/game/cards/cash-use-card/CashUseCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { CashUseCardContainer } from "./CashUseCardContainer";
import type {
  CashUseCardData,
  CashUseCardStaticData,
  CashUseCardLiveData,
} from "./cash-use-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof CashUseCardContainer> = {
  title: "Game/Cards/CashUseCardContainer",
  component: CashUseCardContainer,
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
  },
};

export default meta;

type CashUseCardStoryWrapperProps = Pick<
  ComponentProps<typeof CashUseCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
  | "children"
> & {
  initialIsFlipped: boolean;
  initialCardData: CashUseCardData & DisplayableCardState;
};

const CashUseCardStoryWrapper: React.FC<CashUseCardStoryWrapperProps> = ({
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
    CashUseCardData & DisplayableCardState
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
        Error: Story args incomplete.
      </div>
    );
  }

  return (
    <CashUseCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
      {children}
    </CashUseCardContainer>
  );
};

const defaultSymbol = "CSCO";
const defaultCompanyName = "Cisco Systems, Inc.";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/CSCO-099a9655.png?t=1633073202";

// Updated mockStaticData: removed sharesRangePeriodLabel
const mockStaticData: CashUseCardStaticData = {
  reportedCurrency: "USD",
  // sharesRangePeriodLabel: "2019 - 2023", // Removed
  debtRangePeriodLabel: "2019 - 2023",
  fcfRangePeriodLabel: "2019 - 2023",
  dividendsRangePeriodLabel: "2019 - 2023",
  latestStatementDate: "2023-07-29",
  latestStatementPeriod: "FY",
  latestSharesFloatDate: "2023-10-27", // Date for currentOutstandingShares
};

// Updated mockLiveData: removed outstandingShares_5y_min and _max
const mockLiveData: CashUseCardLiveData = {
  currentOutstandingShares: 4100000000,
  // outstandingShares_5y_min: 4050000000, // Removed
  // outstandingShares_5y_max: 4250000000, // Removed
  currentTotalDebt: 25000000000,
  totalDebt_5y_min: 20000000000,
  totalDebt_5y_max: 27000000000,
  currentFreeCashFlow: 15000000000,
  freeCashFlow_5y_min: 12000000000,
  freeCashFlow_5y_max: 16000000000,
  currentNetDividendsPaid: -6000000000,
  netDividendsPaid_5y_min: -6500000000,
  netDividendsPaid_5y_max: -5500000000,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Cash usage metrics for ${defaultCompanyName}. Financials from ${
    mockStaticData.latestStatementPeriod
  } ${mockStaticData.latestStatementDate?.substring(
    0,
    4
  )}. Shares outstanding as of ${mockStaticData.latestSharesFloatDate}.`,
};

const initialMockDisplayableCashUseCard: CashUseCardData &
  DisplayableCardState = {
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
  id: initialMockDisplayableCashUseCard.id,
  symbol: initialMockDisplayableCashUseCard.symbol,
  type: "cashuse" as CardType,
  companyName: initialMockDisplayableCashUseCard.companyName,
  logoUrl: initialMockDisplayableCashUseCard.logoUrl,
  websiteUrl: initialMockDisplayableCashUseCard.websiteUrl,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<CashUseCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <CashUseCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockDisplayableCashUseCard,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]", // Default size for visibility
  },
};

export const Flipped: Story = {
  render: (args) => <CashUseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockDisplayableCashUseCard, isFlipped: true },
  },
};

// Updated MinimalData story
export const MinimalData: Story = {
  render: (args) => <CashUseCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: {
      ...initialMockDisplayableCashUseCard, // Start with default and override
      id: "cashuse-minimal",
      symbol: "MINI",
      companyName: "Mini Corp",
      logoUrl: null,
      websiteUrl: null,
      staticData: {
        // Minimal static data
        reportedCurrency: "USD",
        // sharesRangePeriodLabel: "N/A", // Removed
        debtRangePeriodLabel: "N/A",
        fcfRangePeriodLabel: "N/A",
        dividendsRangePeriodLabel: "N/A",
        latestStatementDate: null,
        latestStatementPeriod: null,
        latestSharesFloatDate: "2024-01-15", // Provide a date for shares
      },
      liveData: {
        // Minimal live data
        currentOutstandingShares: 1000000,
        // outstandingShares_5y_min: 1000000, // Removed
        // outstandingShares_5y_max: 1000000, // Removed
        currentTotalDebt: null,
        totalDebt_5y_min: null,
        totalDebt_5y_max: null,
        currentFreeCashFlow: 5000,
        freeCashFlow_5y_min: 0, // Example: Min could be 0 if no negative FCF
        freeCashFlow_5y_max: 10000,
        currentNetDividendsPaid: null,
        netDividendsPaid_5y_min: null,
        netDividendsPaid_5y_max: null,
      },
      backData: {
        description:
          "Minimal cash use data for Mini Corp. Shares outstanding as of 2024-01-15.",
      },
    },
    cardContext: {
      // Update context for minimal data story
      ...mockCardContext,
      id: "cashuse-minimal",
      symbol: "MINI",
      companyName: "Mini Corp",
      logoUrl: null,
      websiteUrl: null,
    },
  },
};
