// src/components/game/cards/revenue-breakdown-card/RevenueBreakdownCardContainer.stories.tsx
import React, {
  useState,
  useCallback,
  useEffect,
  type ComponentProps,
} from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { RevenueBreakdownCardContainer } from "./RevenueBreakdownCardContainer";
import type {
  RevenueBreakdownCardData,
  SegmentRevenueDataItem,
} from "./revenue-breakdown-card.types";
import type { CardActionContext } from "../base-card/base-card.types";
import type { DisplayableCardState } from "@/components/game/types";

const meta: Meta<typeof RevenueBreakdownCardContainer> = {
  title: "Game/Cards/RevenueBreakdownCardContainer",
  component: RevenueBreakdownCardContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    /* Standard argTypes */
  },
};
export default meta;

type RevenueBreakdownCardStoryWrapperProps = Pick<
  ComponentProps<typeof RevenueBreakdownCardContainer>,
  | "cardContext"
  | "onGenericInteraction"
  | "onDeleteRequest"
  | "className"
  | "innerCardClassName"
> & {
  initialIsFlipped: boolean;
  initialCardData: RevenueBreakdownCardData & DisplayableCardState;
};

const RevenueBreakdownCardStoryWrapper: React.FC<
  RevenueBreakdownCardStoryWrapperProps
> = (props) => {
  const {
    initialIsFlipped,
    initialCardData,
    onGenericInteraction,
    cardContext: propCardContext,
    onDeleteRequest,
    className,
    innerCardClassName,
  } = props;
  const [localIsFlipped, setLocalIsFlipped] = useState(initialIsFlipped);
  const [currentCardData, setCurrentCardData] = useState<
    RevenueBreakdownCardData & DisplayableCardState
  >({ ...initialCardData, isFlipped: initialIsFlipped });

  useEffect(() => {
    setLocalIsFlipped(initialIsFlipped);
    setCurrentCardData((prev) => ({ ...prev, isFlipped: initialIsFlipped }));
  }, [initialIsFlipped]);

  useEffect(() => {
    setCurrentCardData({ ...initialCardData, isFlipped: localIsFlipped });
  }, [initialCardData, localIsFlipped]);

  const handleFlip = useCallback(() => {
    setLocalIsFlipped((prev) => {
      const newState = !prev;
      action("onFlip")(initialCardData.id);
      setCurrentCardData((prevData) => ({ ...prevData, isFlipped: newState }));
      return newState;
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
    <RevenueBreakdownCardContainer
      cardData={currentCardData}
      isFlipped={localIsFlipped}
      onFlip={handleFlip}
      onGenericInteraction={onGenericInteraction}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}
    />
  );
};

const defaultSymbol = "AAPL";
const defaultCompanyName = "Apple Inc.";
const defaultLogoUrl =
  "https://companieslogo.com/img/orig/AAPL-2161E0NC.png?t=1633073280";

const mockBreakdown: SegmentRevenueDataItem[] = [
  {
    segmentName: "iPhone",
    currentRevenue: 200583000000,
    previousRevenue: 190000000000,
    yoyChange: (200583 - 190000) / 190000,
  },
  {
    segmentName: "Services",
    currentRevenue: 85200000000,
    previousRevenue: 75000000000,
    yoyChange: (85200 - 75000) / 75000,
  },
  {
    segmentName: "Wearables, Home & Accessories",
    currentRevenue: 39845000000,
    previousRevenue: 41000000000,
    yoyChange: (39845 - 41000) / 41000,
  },
  {
    segmentName: "Mac",
    currentRevenue: 29357000000,
    previousRevenue: 35000000000,
    yoyChange: (29357 - 35000) / 35000,
  },
  {
    segmentName: "iPad",
    currentRevenue: 28300000000,
    previousRevenue: 30000000000,
    yoyChange: (28300 - 30000) / 30000,
  },
  {
    segmentName: "Vision Pro (New)",
    currentRevenue: 1500000000,
    previousRevenue: null,
    yoyChange: null,
  },
];

const totalRevenue = mockBreakdown.reduce(
  (sum, item) => sum + item.currentRevenue,
  0
);

const initialMockCardData: RevenueBreakdownCardData & DisplayableCardState = {
  id: `revenuebreakdown-${defaultSymbol}-FY2023`,
  type: "revenuebreakdown",
  symbol: defaultSymbol,
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  createdAt: Date.now(),
  staticData: {
    currencySymbol: "$",
    latestPeriodLabel: "FY2023 ending 2023-09-30",
    previousPeriodLabel: "FY2022 ending 2022-09-24",
  },
  liveData: {
    totalRevenueLatestPeriod: totalRevenue,
    breakdown: mockBreakdown,
    lastUpdated: new Date().toISOString(),
  },
  backData: {
    description: `Revenue breakdown for ${defaultCompanyName} (FY2023).`,
  },
  isFlipped: false,
  websiteUrl: "https://www.apple.com",
};

const mockCardContext: CardActionContext = {
  id: initialMockCardData.id,
  symbol: defaultSymbol,
  type: "revenuebreakdown",
  companyName: defaultCompanyName,
  logoUrl: defaultLogoUrl,
  websiteUrl: initialMockCardData.websiteUrl,
};

type Story = StoryObj<RevenueBreakdownCardStoryWrapperProps>;

export const Default: Story = {
  render: (args) => <RevenueBreakdownCardStoryWrapper {...args} />,
  args: {
    initialIsFlipped: false,
    initialCardData: initialMockCardData,
    cardContext: mockCardContext,
    onDeleteRequest: action("onDeleteRequest"),
    onGenericInteraction: action("onGenericInteraction"),
    className: "w-[320px] h-[450px]", // Adjusted height for more content
  },
};

export const Flipped: Story = {
  ...Default,
  args: {
    ...Default.args,
    initialIsFlipped: true,
    initialCardData: { ...initialMockCardData, isFlipped: true },
  },
};
