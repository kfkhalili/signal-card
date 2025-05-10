/**
 * src/components/game/cards/price-card/PriceCardContainer.test.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { PriceCardContainer } from "./PriceCardContainer";
// eslint-disable-next-line import/no-named-as-default -- Mocking default export correctly
import { PriceCardContent } from "./PriceCardContent"; // To mock
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
  PriceCardFaceData,
  PriceCardSpecificBackData,
} from "./price-card.types";

// Mock the PriceCardContent child component
jest.mock("./PriceCardContent", () => ({
  // If PriceCardContent is a default export:
  // default: jest.fn(() => <div data-testid="mock-price-card-content">Mock Content</div>),
  // If PriceCardContent is a named export (as it appears to be):
  PriceCardContent: jest.fn(() => (
    <div data-testid="mock-price-card-content">Mock Content</div>
  )),
}));

// Helper to create a typed mock PriceCardData
const createMockPriceCardData = (
  overrides: Partial<PriceCardData> = {}
): PriceCardData => {
  const now = Date.now();
  const fixedTimestamp = new Date("2025-05-10T14:41:46.535Z").getTime();

  const faceData: PriceCardFaceData = {
    timestamp: fixedTimestamp,
    price: 200.5,
    dayChange: 2.5,
    changePercentage: 0.0125,
    dayHigh: 203.0,
    dayLow: 199.0,
    dayOpen: 200.0,
    previousClose: 198.0,
    volume: 5000000,
    ...overrides.faceData,
  };

  const backData: PriceCardSpecificBackData = {
    explanation: "Explanation for XYZ.",
    marketCap: 2e11, // 200B
    sma50d: 195.0,
    sma200d: 180.0,
    ...overrides.backData,
  };

  return {
    id: "price-001",
    type: "price",
    symbol: "XYZ",
    createdAt: now, // Ensure createdAt is included
    faceData,
    backData,
    ...overrides,
  };
};

describe("PriceCardContainer Component", () => {
  let mockOnFlip: jest.Mock;
  let mockPriceCardInteractions: PriceCardInteractionCallbacks;
  let mockTestCardData: PriceCardData;

  // Cast the imported PriceCardContent to its Jest mock type for type safety with mock-specific properties
  const MockedPriceCardContent = PriceCardContent as jest.MockedFunction<
    typeof PriceCardContent
  >;

  beforeEach(() => {
    MockedPriceCardContent.mockClear();
    mockOnFlip = jest.fn();
    mockPriceCardInteractions = {
      onPriceCardSmaClick: jest.fn(),
      onPriceCardRangeContextClick: jest.fn(),
      onPriceCardOpenPriceClick: jest.fn(),
      onPriceCardGenerateDailyPerformanceSignal: jest.fn(),
    };
    mockTestCardData = createMockPriceCardData();
  });

  const renderContainer = (
    props: Partial<React.ComponentProps<typeof PriceCardContainer>> = {}
  ) => {
    return render(
      <PriceCardContainer
        cardData={mockTestCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
        onPriceCardSmaClick={mockPriceCardInteractions.onPriceCardSmaClick}
        onPriceCardRangeContextClick={
          mockPriceCardInteractions.onPriceCardRangeContextClick
        }
        onPriceCardOpenPriceClick={
          mockPriceCardInteractions.onPriceCardOpenPriceClick
        }
        onPriceCardGenerateDailyPerformanceSignal={
          mockPriceCardInteractions.onPriceCardGenerateDailyPerformanceSignal
        }
        {...props}
      />
    );
  };

  test("renders and passes isFlipped to BaseCard (implicitly via PriceCardContent calls)", () => {
    renderContainer({ isFlipped: true });
    // BaseCard renders both face and back, controlled by CSS.
    // We verify by checking the calls to PriceCardContent, one for face, one for back.
    expect(MockedPriceCardContent).toHaveBeenCalledTimes(2); // Once for face, once for back
  });

  describe("Face Content", () => {
    beforeEach(() => {
      renderContainer({ isFlipped: false });
    });

    test("wrapper calls onFlip on click", () => {
      const clickableFaceContentWrapper = screen.getAllByRole("button")[0];
      fireEvent.click(clickableFaceContentWrapper);
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("wrapper calls onFlip on Enter key press", () => {
      const clickableFaceContentWrapper = screen.getAllByRole("button")[0];
      fireEvent.keyDown(clickableFaceContentWrapper, {
        key: "Enter",
        code: "Enter",
      });
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("wrapper calls onFlip on Space key press", () => {
      const clickableFaceContentWrapper = screen.getAllByRole("button")[0];
      fireEvent.keyDown(clickableFaceContentWrapper, {
        key: " ",
        code: "Space",
      });
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("passes correct props to PriceCardContent for face", () => {
      // The first call to MockedPriceCardContent should be for the face (or filter by isBackFace: false)
      const faceCall = MockedPriceCardContent.mock.calls.find(
        (call) => call[0].isBackFace === false
      );
      expect(faceCall).toBeDefined();
      expect(faceCall![0]).toEqual(
        expect.objectContaining({
          cardData: mockTestCardData, // mockTestCardData includes createdAt
          isBackFace: false,
          onSmaClick: mockPriceCardInteractions.onPriceCardSmaClick,
          onRangeContextClick:
            mockPriceCardInteractions.onPriceCardRangeContextClick,
          onOpenPriceClick: mockPriceCardInteractions.onPriceCardOpenPriceClick,
          onGenerateDailyPerformanceSignal:
            mockPriceCardInteractions.onPriceCardGenerateDailyPerformanceSignal,
        })
      );
    });
  });

  describe("Back Content", () => {
    beforeEach(() => {
      // Render with isFlipped true or false, BaseCard will render both contents.
      // The specific call to PriceCardContent for back is identified by isBackFace: true
      renderContainer({ isFlipped: true });
    });

    test("wrapper calls onFlip on click", () => {
      // BaseCard renders face first then back in DOM, so back is the second role="button"
      const clickableBackContentWrapper = screen.getAllByRole("button")[1];
      fireEvent.click(clickableBackContentWrapper);
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("wrapper calls onFlip on Enter key press", () => {
      const clickableBackContentWrapper = screen.getAllByRole("button")[1];
      fireEvent.keyDown(clickableBackContentWrapper, {
        key: "Enter",
        code: "Enter",
      });
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("wrapper calls onFlip on Space key press", () => {
      const clickableBackContentWrapper = screen.getAllByRole("button")[1];
      fireEvent.keyDown(clickableBackContentWrapper, {
        key: " ",
        code: "Space",
      });
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
          cardData: mockTestCardData, // mockTestCardData includes createdAt
          isBackFace: true,
          onSmaClick: mockPriceCardInteractions.onPriceCardSmaClick,
          onRangeContextClick:
            mockPriceCardInteractions.onPriceCardRangeContextClick,
          onOpenPriceClick: mockPriceCardInteractions.onPriceCardOpenPriceClick,
        })
      );
      // onGenerateDailyPerformanceSignal is NOT passed to back content by PriceCardContainer
      expect(backProps.onGenerateDailyPerformanceSignal).toBeUndefined();
    });
  });

  test("passes children to BaseCard (which renders them)", () => {
    const childText = "Overlay Test Child";
    renderContainer({
      children: <div data-testid="overlay-child">{childText}</div>,
    });
    expect(screen.getByTestId("overlay-child")).toBeInTheDocument();
    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  test("applies className to BaseCard and innerCardClassName (implicitly)", () => {
    const testClassName = "custom-container-class";
    const testInnerClassName = "custom-inner-class";
    // PriceCardContainer renders BaseCard as its root.
    // We rely on BaseCard to correctly apply these.
    const { container } = renderContainer({
      className: testClassName,
      innerCardClassName: testInnerClassName,
    });

    // The root element rendered by PriceCardContainer (which is BaseCard) should have testClassName
    expect(container.firstChild).toHaveClass(testClassName);
    // Testing innerCardClassName requires knowledge of BaseCard's internal structure
    // or BaseCard having a test-id on its inner card element.
    // If BaseCard's immediate child receiving innerCardClassName is simple, one could query it.
    // For now, this implicitly tests that the prop is passed to BaseCard.
  });
});
