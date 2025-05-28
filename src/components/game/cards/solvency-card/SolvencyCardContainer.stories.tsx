// src/components/game/cards/solvency-card/SolvencyCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { SolvencyCardContainer } from "./SolvencyCardContainer";
import type {
  SolvencyCardData,
  SolvencyCardStaticData,
  SolvencyCardLiveData,
} from "./solvency-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
  BaseCardBackData,
  InteractionPayload,
  CardType,
} from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof SolvencyCardContainer> = {
  title: "Game/Cards/SolvencyCardContainer",
  component: SolvencyCardContainer,
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

type SolvencyCardStoryWrapperProps = Pick<
  ComponentProps<typeof SolvencyCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
  | "children"
> & {
  initialIsFlipped: boolean;
  initialCardData: SolvencyCardData & DisplayableCardState;
};

const SolvencyCardStoryWrapper: React.FC<SolvencyCardStoryWrapperProps> = ({
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
    SolvencyCardData & DisplayableCardState
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
    <SolvencyCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}>
      {children}
    </SolvencyCardContainer>
  );
};

const defaultSymbol = "AAPL";
const defaultCompanyName = "Apple Inc.";
const defaultLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg";

const mockStaticData: SolvencyCardStaticData = {
  periodLabel: "FY2023",
  reportedCurrency: "USD",
  filingDate: "2023-10-28",
  acceptedDate: "2023-10-27 18:00:00",
  statementDate: "2023-09-30",
  statementPeriod: "FY",
};

const mockLiveData: SolvencyCardLiveData = {
  totalAssets: 352583000000,
  cashAndShortTermInvestments: 61555000000,
  totalCurrentLiabilities: 145309000000,
  shortTermDebt: 15609000000,
  longTermDebt: 95392000000,
  freeCashFlow: 99597000000,
};

const mockBaseBackData: BaseCardBackData = {
  description: `Key solvency metrics for ${defaultCompanyName} (${mockStaticData.periodLabel}, ending ${mockStaticData.statementDate}). Includes assets, liabilities, debt, and cash flow.`,
};

const initialMockDisplayableSolvencyCard: SolvencyCardData &
  DisplayableCardState = {
  id: `solvency-${defaultSymbol}-${mockStaticData.statementDate}-${mockStaticData.statementPeriod}`,
  type: "solvency",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: mockStaticData,
  liveData: mockLiveData,
  backData: mockBaseBackData,
  isFlipped: false,
};

const mockCardContext: CardActionContext = {
  id: initialMockDisplayableSolvencyCard.id,
  symbol: initialMockDisplayableSolvencyCard.symbol,
  type: "solvency" as CardType,
  companyName: initialMockDisplayableSolvencyCard.companyName,
  logoUrl: initialMockDisplayableSolvencyCard.logoUrl,
  websiteUrl: null,
};

const mockOnGenericInteraction: OnGenericInteraction = (
  payload: InteractionPayload
) => {
  action("onGenericInteraction")(payload);
};

const mockOnDeleteRequest = (context: CardActionContext) =>
  action("onDeleteRequest")(context);

type Story = StoryObj<SolvencyCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <SolvencyCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockDisplayableSolvencyCard,
    cardContext: mockCardContext,
    onDeleteRequest: mockOnDeleteRequest,
    onGenericInteraction: mockOnGenericInteraction,
    className: "w-[300px] h-[420px]",
  },
};

export const Flipped: Story = {
  render: (args) => <SolvencyCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockDisplayableSolvencyCard, isFlipped: true },
  },
};

export const MinimalData: Story = {
  render: (args) => <SolvencyCardStoryWrapper {...args} />,
  args: {
    ...Default.args,
    initialIsFlipped: false,
    initialCardData: {
      id: "solvency-minimal-data",
      type: "solvency",
      symbol: "MINS",
      companyName: "Minimal Solvency Inc.",
      logoUrl: null,
      createdAt: Date.now(),
      isFlipped: false,
      staticData: {
        periodLabel: "Q1 2024",
        reportedCurrency: "EUR",
        filingDate: null,
        acceptedDate: null,
        statementDate: "2024-03-31",
        statementPeriod: "Q1",
      },
      liveData: {
        totalAssets: 1000000,
        cashAndShortTermInvestments: 50000,
        totalCurrentLiabilities: 200000,
        shortTermDebt: null,
        longTermDebt: 300000,
        freeCashFlow: -10000,
      },
      backData: {
        description:
          "Financial highlights for Minimal Solvency Inc. (Q1 2024).",
      },
    },
    cardContext: {
      ...mockCardContext,
      id: "solvency-minimal-data",
      symbol: "MINS",
      type: "solvency" as CardType,
      companyName: "Minimal Solvency Inc.",
      logoUrl: null,
    },
  },
};
