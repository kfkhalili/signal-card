import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BaseCardContainer } from "./BaseCardContainer";
import type {
  BaseCardData,
  OnCardInteraction,
  BaseCardContainerDataPointDetails,
} from "./base-card.types";
import BaseCard from "./BaseCard";

// Mock BaseCard
jest.mock("./BaseCard", () => {
  const MockBaseCard = jest.fn(
    ({
      isFlipped,
      faceContent,
      backContent,
      className,
      innerCardClassName,
      children,
    }) => (
      <div
        data-testid="mock-base-card"
        className={`${className || ""} ${innerCardClassName || ""}`}
      >
        <div data-testid="mock-base-card-isFlipped">{isFlipped.toString()}</div>
        <div data-testid="mock-base-card-faceContent">{faceContent}</div>
        <div data-testid="mock-base-card-backContent">{backContent}</div>
        {children}
      </div>
    )
  );
  return MockBaseCard;
});

// Mock ClickableDataItem
const mockClickableDataItemPassedOnClickHandler = jest.fn();
jest.mock("../../../ui/ClickableDataItem", () => ({
  // Adjust path as needed
  ClickableDataItem: jest.fn(
    ({
      isInteractive,
      onClickHandler,
      children,
      "aria-label": ariaLabel,
      "data-testid": dataTestId,
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
          onClick={(e) => {
            if (isInteractive && onClickHandler) {
              onClickHandler(e as any);
            }
          }}
          onKeyDown={(e) => {
            if (
              isInteractive &&
              onClickHandler &&
              (e.key === "Enter" || e.key === " ")
            ) {
              onClickHandler(e as any);
            }
          }}
        >
          {children}
        </div>
      );
    }
  ),
}));

describe("BaseCardContainer Component", () => {
  let mockOnFlip: jest.Mock;
  let mockOnCardInteraction: jest.MockedFunction<
    OnCardInteraction<BaseCardData, BaseCardContainerDataPointDetails>
  >;

  const testCardData: BaseCardData = {
    id: "base-001",
    type: "base",
    symbol: "GENERIC",
    backData: {
      explanation: "This is a generic explanation.",
    },
  };

  beforeEach(() => {
    mockOnFlip = jest.fn();
    mockOnCardInteraction = jest.fn();

    (BaseCard as jest.Mock).mockClear();
    const ClickableDataItemMock = require("../../../ui/ClickableDataItem")
      .ClickableDataItem as jest.Mock;
    ClickableDataItemMock.mockClear();
    mockClickableDataItemPassedOnClickHandler.mockClear();
  });

  const getFaceContentWrapper = () =>
    screen.getByTestId("mock-base-card-faceContent").firstChild as HTMLElement;
  const getBackContentWrapper = () =>
    screen.getByTestId("mock-base-card-backContent").firstChild as HTMLElement;

  test("renders BaseCard with correct basic props", () => {
    render(
      <BaseCardContainer
        cardData={testCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    expect(BaseCard).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mock-base-card-isFlipped")).toHaveTextContent(
      "false"
    );
  });

  test("clicking main face area calls onFlip", () => {
    render(
      <BaseCardContainer
        cardData={testCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    fireEvent.click(getFaceContentWrapper());
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("pressing Enter on main face area calls onFlip", () => {
    render(
      <BaseCardContainer
        cardData={testCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    fireEvent.keyDown(getFaceContentWrapper(), { key: "Enter", code: "Enter" });
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("pressing Space on main face area calls onFlip", () => {
    render(
      <BaseCardContainer
        cardData={testCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    fireEvent.keyDown(getFaceContentWrapper(), { key: " ", code: "Space" });
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("clicking main back area calls onFlip", () => {
    render(
      <BaseCardContainer
        cardData={testCardData}
        isFlipped={true}
        onFlip={mockOnFlip}
      />
    );
    fireEvent.click(getBackContentWrapper());
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  describe("with onCardInteraction provided", () => {
    test("renders interactive symbol on face and calls onCardInteraction on click, stopping flip", () => {
      render(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={false}
          onFlip={mockOnFlip}
          onCardInteraction={mockOnCardInteraction}
        />
      );
      const symbolItem = screen.getByTestId("base-card-symbol");
      expect(symbolItem).toHaveAttribute("data-interactive", "true");
      expect(symbolItem).toHaveAttribute(
        "aria-label",
        `Interact with symbol ${testCardData.symbol}`
      );

      fireEvent.click(symbolItem);

      expect(mockOnCardInteraction).toHaveBeenCalledTimes(1);
      expect(mockOnCardInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          cardData: testCardData,
          clickedDataPoint: {
            elementType: "symbol",
            value: testCardData.symbol,
            details: { kind: "symbol" },
          },
        })
      );
      expect(mockOnFlip).not.toHaveBeenCalled();
    });

    test("renders interactive type on face and calls onCardInteraction on click, stopping flip", () => {
      render(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={false}
          onFlip={mockOnFlip}
          onCardInteraction={mockOnCardInteraction}
        />
      );
      const typeItem = screen.getByTestId("base-card-type");
      expect(typeItem).toHaveAttribute("data-interactive", "true");
      fireEvent.click(typeItem);
      expect(mockOnCardInteraction).toHaveBeenCalledTimes(1);
      expect(mockOnCardInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          clickedDataPoint: {
            elementType: "type",
            value: testCardData.type,
            details: { kind: "type" },
          },
        })
      );
      expect(mockOnFlip).not.toHaveBeenCalled();
    });

    test("renders interactive explanation on back and calls onCardInteraction on click, stopping flip", () => {
      render(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={true} // Show back
          onFlip={mockOnFlip}
          onCardInteraction={mockOnCardInteraction}
        />
      );
      const explanationItem = screen.getByTestId("base-card-explanation");
      expect(explanationItem).toHaveAttribute("data-interactive", "true");
      fireEvent.click(explanationItem);
      expect(mockOnCardInteraction).toHaveBeenCalledTimes(1);
      expect(mockOnCardInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          clickedDataPoint: {
            elementType: "explanation",
            value: testCardData.backData.explanation,
            details: { kind: "explanation" },
          },
        })
      );
      expect(mockOnFlip).not.toHaveBeenCalled();
    });
  });

  describe("without onCardInteraction provided", () => {
    test("renders non-interactive symbol, type, and explanation", () => {
      // Test front face
      const { rerender } = render(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={false}
          onFlip={mockOnFlip}
          // onCardInteraction is NOT provided
        />
      );
      expect(screen.getByTestId("base-card-symbol")).toHaveAttribute(
        "data-interactive",
        "false"
      );
      expect(screen.getByTestId("base-card-type")).toHaveAttribute(
        "data-interactive",
        "false"
      );

      // Test back face by rerendering
      rerender(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={true} // Change prop to show back
          onFlip={mockOnFlip}
          // onCardInteraction is NOT provided
        />
      );
      expect(screen.getByTestId("base-card-explanation")).toHaveAttribute(
        "data-interactive",
        "false"
      );
    });

    test("clicking non-interactive symbol still triggers onFlip for the card", () => {
      render(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={false}
          onFlip={mockOnFlip}
        />
      );
      const symbolItem = screen.getByTestId("base-card-symbol");
      fireEvent.click(symbolItem);

      expect(mockOnCardInteraction).not.toHaveBeenCalled();
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    test("pressing Enter on non-interactive symbol still triggers onFlip for the card", () => {
      render(
        <BaseCardContainer
          cardData={testCardData}
          isFlipped={false}
          onFlip={mockOnFlip}
        />
      );
      const symbolItem = screen.getByTestId("base-card-symbol");
      fireEvent.keyDown(symbolItem, { key: "Enter", code: "Enter" });

      expect(mockOnCardInteraction).not.toHaveBeenCalled();
      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });
  });
});
