import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PriceCardContainer } from "./PriceCardContainer";
import type { PriceCardData } from "./price-card.types";
import BaseCardDefault from "../base-card/BaseCard";
import { PriceCardContent as OriginalPriceCardContent } from "./PriceCardContent";

jest.mock("../base-card/BaseCard", () => {
  const MockBaseCard = jest.fn(
    ({
      isFlipped,
      faceContent,
      backContent,
      className,
      innerCardClassName,
    }) => (
      <div
        data-testid="mock-base-card"
        className={`${className || ""} ${innerCardClassName || ""}`}
      >
        <div data-testid="mock-base-card-isFlipped">{isFlipped.toString()}</div>
        <div data-testid="mock-base-card-faceContent">{faceContent}</div>
        <div data-testid="mock-base-card-backContent">{backContent}</div>
      </div>
    )
  );
  return MockBaseCard;
});
const BaseCard = BaseCardDefault as jest.MockedFunction<typeof BaseCardDefault>;

jest.mock("./PriceCardContent", () => ({
  __esModule: true,
  PriceCardContent: jest.fn(
    ({
      cardData,
      isBackFace,
      onSmaClick,
    }: React.ComponentProps<typeof OriginalPriceCardContent>) => (
      <div
        data-testid={
          isBackFace
            ? "mock-price-card-content-back"
            : "mock-price-card-content-front"
        }
      >
        <span data-testid="mock-price-content-symbol">{cardData.symbol}</span>
        {isBackFace && (
          <span data-testid="mock-price-content-explanation">
            {cardData.backData.explanation}
          </span>
        )}
        {!isBackFace && (
          <span data-testid="mock-price-content-price">
            {cardData.faceData.price}
          </span>
        )}
        {onSmaClick && (
          <button
            data-testid="mock-sma-button"
            onClick={() => onSmaClick(50, 100, cardData.faceData)}
          />
        )}
      </div>
    )
  ),
}));
import { PriceCardContent } from "./PriceCardContent"; // Import after mock to get the mocked version
const MockedPriceCardContent = PriceCardContent as jest.MockedFunction<
  typeof OriginalPriceCardContent
>;

// This mock might be redundant if PriceCardContent is fully mocked above, but keeping for completeness if it was in the file.
const mockClickableDataItemPassedOnClickHandler = jest.fn();
jest.mock("../../../ui/ClickableDataItem", () => ({
  __esModule: true,
  ClickableDataItem: jest.fn(
    ({
      isInteractive,
      onClickHandler,
      children,
      "aria-label": ariaLabel,
      "data-testid": dataTestId,
      baseClassName,
      interactiveClassName,
    }: {
      isInteractive: boolean;
      onClickHandler?: (event: React.MouseEvent | React.KeyboardEvent) => void;
      children: React.ReactNode;
      "aria-label"?: string;
      "data-testid"?: string;
      baseClassName?: string;
      interactiveClassName?: string;
    }) => {
      if (onClickHandler) {
        mockClickableDataItemPassedOnClickHandler.mockImplementation(
          onClickHandler as any
        );
      }
      return (
        <div
          data-testid={dataTestId || "mock-clickable-data-item"}
          data-interactive={isInteractive.toString()}
          aria-label={ariaLabel}
          className={`${baseClassName || ""} ${
            isInteractive && interactiveClassName ? interactiveClassName : ""
          }`}
          onClick={(e) => {
            if (isInteractive && onClickHandler) onClickHandler(e as any);
          }}
          onKeyDown={(e) => {
            if (
              isInteractive &&
              onClickHandler &&
              (e.key === "Enter" || e.key === " ")
            )
              onClickHandler(e as any);
          }}
        >
          {children}
        </div>
      );
    }
  ),
}));

const mockTestCardData: PriceCardData = {
  id: "price-001",
  type: "price",
  symbol: "XYZ",
  faceData: {
    price: 200.5,
    timestamp: new Date(),
  },
  backData: {
    explanation: "Explanation for XYZ.",
  },
};

describe("PriceCardContainer Component", () => {
  let mockOnFlip: jest.Mock<void, []>;
  let mockOnSmaClick: jest.Mock<
    Exclude<
      React.ComponentProps<typeof OriginalPriceCardContent>["onSmaClick"],
      undefined
    >
  >;
  let mockOnRangeContextClick: jest.Mock<
    Exclude<
      React.ComponentProps<
        typeof OriginalPriceCardContent
      >["onRangeContextClick"],
      undefined
    >
  >;
  let mockOnOpenPriceClick: jest.Mock<
    Exclude<
      React.ComponentProps<typeof OriginalPriceCardContent>["onOpenPriceClick"],
      undefined
    >
  >;
  let mockOnGenerateDailyPerformanceSignal: jest.Mock<
    Exclude<
      React.ComponentProps<
        typeof OriginalPriceCardContent
      >["onGenerateDailyPerformanceSignal"],
      undefined
    >
  >;

  beforeEach(() => {
    mockOnFlip = jest.fn();
    mockOnSmaClick = jest.fn();
    mockOnRangeContextClick = jest.fn();
    mockOnOpenPriceClick = jest.fn();
    mockOnGenerateDailyPerformanceSignal = jest.fn();

    BaseCard.mockClear();
    MockedPriceCardContent.mockClear();
    mockClickableDataItemPassedOnClickHandler.mockClear();
  });

  const getFaceContentWrapper = () =>
    screen.getByTestId("mock-base-card-faceContent").firstChild as HTMLElement;
  const getBackContentWrapper = () =>
    screen.getByTestId("mock-base-card-backContent").firstChild as HTMLElement;

  test("renders BaseCard and passes correct props", () => {
    render(
      <PriceCardContainer
        cardData={mockTestCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
        className="custom-class"
        innerCardClassName="custom-inner"
        onSmaClick={mockOnSmaClick}
        onRangeContextClick={mockOnRangeContextClick}
        onOpenPriceClick={mockOnOpenPriceClick}
        onGenerateDailyPerformanceSignal={mockOnGenerateDailyPerformanceSignal}
      />
    );

    expect(BaseCard).toHaveBeenCalledTimes(1);
    expect(BaseCard).toHaveBeenCalledWith(
      expect.objectContaining({
        isFlipped: false,
        className: "custom-class",
        innerCardClassName: "custom-inner",
      }),
      expect.anything()
    );
    expect(screen.getByTestId("mock-base-card-isFlipped")).toHaveTextContent(
      "false"
    );
  });

  test("faceContent wrapper calls onFlip on click and passes correct props to PriceCardContent mock", () => {
    render(
      <PriceCardContainer
        cardData={mockTestCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
        onSmaClick={mockOnSmaClick}
        onRangeContextClick={mockOnRangeContextClick}
        onOpenPriceClick={mockOnOpenPriceClick}
        onGenerateDailyPerformanceSignal={mockOnGenerateDailyPerformanceSignal}
      />
    );

    expect(MockedPriceCardContent).toHaveBeenCalledWith(
      expect.objectContaining({
        cardData: mockTestCardData,
        isBackFace: false,
        onSmaClick: mockOnSmaClick,
        onRangeContextClick: mockOnRangeContextClick,
        onOpenPriceClick: mockOnOpenPriceClick,
        onGenerateDailyPerformanceSignal: mockOnGenerateDailyPerformanceSignal,
      }),
      expect.anything()
    );
    expect(
      screen.getByTestId("mock-price-card-content-front")
    ).toBeInTheDocument();

    fireEvent.click(getFaceContentWrapper());
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("backContent wrapper calls onFlip on click and passes correct props to PriceCardContent mock", () => {
    render(
      <PriceCardContainer
        cardData={mockTestCardData}
        isFlipped={true}
        onFlip={mockOnFlip}
        onSmaClick={mockOnSmaClick}
        onRangeContextClick={mockOnRangeContextClick}
        onOpenPriceClick={mockOnOpenPriceClick}
        onGenerateDailyPerformanceSignal={mockOnGenerateDailyPerformanceSignal} // Pass it to check it's passed
      />
    );

    expect(MockedPriceCardContent).toHaveBeenCalledWith(
      expect.objectContaining({
        cardData: mockTestCardData,
        isBackFace: true,
        onSmaClick: mockOnSmaClick,
        onRangeContextClick: mockOnRangeContextClick,
        onOpenPriceClick: mockOnOpenPriceClick,
        // Corrected: onGenerateDailyPerformanceSignal IS passed to PriceCardContent from PriceCardContainer
        // The internal logic of PriceCardContent might not use it for the back face, but container passes it.
        // However, in PriceCardContainer, we explicitly do NOT pass it for the back.
        // Let's trace: PriceCardContainer's backContent's PriceCardContent call:
        // onGenerateDailyPerformanceSignal IS NOT passed. So the mock should not expect it.
      }),
      expect.anything()
    );
    // Let's refine the expectation for the backContent call specifically
    // Find the call where isBackFace is true
    const backFaceCall = MockedPriceCardContent.mock.calls.find(
      (call) => call[0].isBackFace === true
    );
    expect(backFaceCall?.[0]).toEqual(
      expect.objectContaining({
        cardData: mockTestCardData,
        isBackFace: true,
        onSmaClick: mockOnSmaClick,
        onRangeContextClick: mockOnRangeContextClick,
        onOpenPriceClick: mockOnOpenPriceClick,
        // onGenerateDailyPerformanceSignal should be undefined here as it's not passed for back face
      })
    );
    // Check that onGenerateDailyPerformanceSignal is not in the props of the back face call
    expect(backFaceCall?.[0].onGenerateDailyPerformanceSignal).toBeUndefined();

    expect(
      screen.getByTestId("mock-price-card-content-back")
    ).toBeInTheDocument();

    fireEvent.click(getBackContentWrapper());
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("keyboard interaction on faceContent wrapper calls onFlip", () => {
    render(
      <PriceCardContainer
        cardData={mockTestCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    fireEvent.keyDown(getFaceContentWrapper(), { key: "Enter", code: "Enter" });
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(getFaceContentWrapper(), { key: " ", code: "Space" });
    expect(mockOnFlip).toHaveBeenCalledTimes(2);
  });
});
