// src/app/components/game/cards/price-card/PriceCardContainer.test.tsx
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { PriceCardContainer } from "./PriceCardContainer";
import { PriceCardContent } from "./PriceCardContent";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./price-card.types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType, // Import CardType
} from "../base-card/base-card.types";

jest.mock("./PriceCardContent", () => ({
  PriceCardContent: jest.fn(
    (props: { isBackFace: boolean; "data-testid"?: string }) => (
      <div
        data-testid={
          props.isBackFace
            ? "mock-price-card-content-back"
            : "mock-price-card-content-face"
        }
      >
        Mock Content {props.isBackFace ? "Back" : "Face"}
      </div>
    )
  ),
}));

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

const createMockPriceCardData = (
  overrides: Partial<PriceCardData> = {}
): PriceCardData => {
  const now = Date.now();
  return {
    id: "price-001",
    type: "price",
    symbol: "XYZ",
    createdAt: now,
    faceData: {
      timestamp: new Date("2025-05-10T14:41:46.535Z").getTime(),
      price: 200.5,
      dayChange: 1.0,
      changePercentage: 0.005,
      dayHigh: 201.0,
      dayLow: 199.5,
      dayOpen: 200.0,
      previousClose: 199.5,
      volume: 1000000,
      ...overrides.faceData,
    },
    backData: {
      explanation: "Explanation for XYZ.",
      marketCap: 200e9,
      sma50d: 198.0,
      sma200d: 180.0,
      ...overrides.backData,
    },
    ...overrides,
  };
};

describe("PriceCardContainer Component", () => {
  let mockOnFlip: jest.Mock;
  let mockTestCardData: PriceCardData;
  let mockCardContext: CardActionContext;
  let mockSocialInteractions: BaseCardSocialInteractions;
  let mockPriceSpecificInteractions: PriceSpecificInteractionsForContainer;

  const MockedPriceCardContent = PriceCardContent as jest.MockedFunction<
    typeof PriceCardContent
  >;

  beforeEach(() => {
    MockedPriceCardContent.mockClear();
    mockOnFlip = jest.fn();
    mockTestCardData = createMockPriceCardData();
    mockCardContext = {
      id: mockTestCardData.id,
      symbol: mockTestCardData.symbol,
      type: mockTestCardData.type as CardType, // Cast to CardType
    };
    mockSocialInteractions = {
      onLike: jest.fn(),
      onComment: jest.fn(),
      onSave: jest.fn(),
      onShare: jest.fn(),
    };
    mockPriceSpecificInteractions = {
      onPriceCardSmaClick: jest.fn(),
      onPriceCardRangeContextClick: jest.fn(),
      onPriceCardOpenPriceClick: jest.fn(),
      onPriceCardGenerateDailyPerformanceSignal: jest.fn(),
    };
  });

  const renderContainer = (
    props: Partial<React.ComponentProps<typeof PriceCardContainer>> = {}
  ) => {
    return render(
      <PriceCardContainer
        cardData={mockTestCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
        cardContext={mockCardContext}
        socialInteractions={mockSocialInteractions}
        priceSpecificInteractions={mockPriceSpecificInteractions}
        {...props}
      />
    );
  };

  describe("Face Content", () => {
    beforeEach(() => {
      renderContainer({ isFlipped: false });
    });

    test("wrapper calls onFlip on click", () => {
      // Get the specific mock content for the face
      const faceMockContent = screen.getByTestId(
        "mock-price-card-content-face"
      );
      // The clickable wrapper is its parent with role="button"
      const faceContentWrapper = faceMockContent.closest('[role="button"]');
      expect(faceContentWrapper).toBeInTheDocument();
      fireEvent.click(faceContentWrapper!);
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("passes correct props to PriceCardContent for face", () => {
      const faceCall = MockedPriceCardContent.mock.calls.find(
        (call) => call[0].isBackFace === false
      );
      expect(faceCall).toBeDefined();
      expect(faceCall![0]).toEqual(
        expect.objectContaining({
          cardData: mockTestCardData,
          isBackFace: false,
          onSmaClick: mockPriceSpecificInteractions.onPriceCardSmaClick,
          onRangeContextClick:
            mockPriceSpecificInteractions.onPriceCardRangeContextClick,
          onOpenPriceClick:
            mockPriceSpecificInteractions.onPriceCardOpenPriceClick,
          onGenerateDailyPerformanceSignal:
            mockPriceSpecificInteractions.onPriceCardGenerateDailyPerformanceSignal,
        })
      );
    });
  });

  describe("Back Content", () => {
    beforeEach(() => {
      renderContainer({ isFlipped: true }); // isFlipped doesn't matter for DOM presence, only CSS
    });

    test("wrapper calls onFlip on click", () => {
      const backMockContent = screen.getByTestId(
        "mock-price-card-content-back"
      );
      const backContentWrapper = backMockContent.closest('[role="button"]');
      expect(backContentWrapper).toBeInTheDocument();
      fireEvent.click(backContentWrapper!);
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("passes correct props to PriceCardContent for back", () => {
      const backCall = MockedPriceCardContent.mock.calls.find(
        (call) => call[0].isBackFace === true
      );
      expect(backCall).toBeDefined();
      const backProps = backCall![0];
      expect(backProps).toEqual(
        expect.objectContaining({
          cardData: mockTestCardData,
          isBackFace: true,
          onSmaClick: mockPriceSpecificInteractions.onPriceCardSmaClick,
          onRangeContextClick:
            mockPriceSpecificInteractions.onPriceCardRangeContextClick,
          onOpenPriceClick:
            mockPriceSpecificInteractions.onPriceCardOpenPriceClick,
        })
      );
      expect(backProps.onGenerateDailyPerformanceSignal).toBeUndefined();
    });
  });

  test("passes children (overlays) to BaseCard", () => {
    const childText = "Overlay Test Child";
    renderContainer({
      children: <div data-testid="overlay-child">{childText}</div>,
    });
    expect(screen.getByTestId("overlay-child")).toBeInTheDocument();
  });
});
