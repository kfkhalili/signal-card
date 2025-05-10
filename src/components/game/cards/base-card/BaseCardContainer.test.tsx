/**
 * src/app/components/game/cards/base-card/BaseCardContainer.test.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BaseCardContainer } from "./BaseCardContainer";
import type { BaseCardData } from "./base-card.types";

// Mock BaseCard to simplify testing BaseCardContainer's logic
// and to assert props passed to it.
jest.mock("./BaseCard", () => {
  const MockBaseCard = ({
    isFlipped,
    faceContent,
    backContent,
    className,
    innerCardClassName,
    children,
  }: {
    isFlipped: boolean;
    faceContent: React.ReactNode;
    backContent: React.ReactNode;
    className?: string;
    innerCardClassName?: string;
    children?: React.ReactNode;
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
  );
  return MockBaseCard;
});

// Minimal mock for cn utility (if not already globally mocked in setup)
// jest.mock('@/lib/utils', () => ({
//  cn: (...args: Array<string | undefined | null | boolean>) =>
//    args.filter(Boolean).join(' '),
// }));

describe("BaseCardContainer Component", () => {
  const mockCardData: BaseCardData = {
    id: "1",
    type: "price",
    symbol: "TEST",
    backData: {
      explanation: "This is a test explanation.",
    },
  };

  let mockOnFlip: jest.Mock;

  beforeEach(() => {
    mockOnFlip = jest.fn();
  });

  test("renders BaseCard with correct initial props (not flipped)", () => {
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );

    expect(screen.getByTestId("mock-base-card")).toBeInTheDocument();
    expect(screen.getByTestId("mock-base-card-isFlipped")).toHaveTextContent(
      "false"
    );

    // Check face content
    const faceContent = screen.getByTestId("mock-base-card-faceContent");
    expect(faceContent).toHaveTextContent(`${mockCardData.symbol} - Front`);
    expect(faceContent).toHaveTextContent(`Type: ${mockCardData.type}`);

    // Check back content (passed to BaseCard, even if not visible)
    const backContent = screen.getByTestId("mock-base-card-backContent");
    expect(backContent).toHaveTextContent(`${mockCardData.symbol} - Back`);
    expect(backContent).toHaveTextContent(mockCardData.backData.explanation);
  });

  test("renders BaseCard with correct props when flipped", () => {
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={true}
        onFlip={mockOnFlip}
      />
    );
    expect(screen.getByTestId("mock-base-card-isFlipped")).toHaveTextContent(
      "true"
    );
  });

  test("calls onFlip when face content is clicked", () => {
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    // The clickable div is *inside* the faceContent prop passed to BaseCard
    const faceContentWrapper = screen
      .getByTestId("mock-base-card-faceContent")
      .querySelector('div[role="button"]');
    expect(faceContentWrapper).toBeInTheDocument();
    if (faceContentWrapper) {
      fireEvent.click(faceContentWrapper);
    }
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("calls onFlip when back content is clicked", () => {
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={true} // To ensure back content is "visible"
        onFlip={mockOnFlip}
      />
    );
    const backContentWrapper = screen
      .getByTestId("mock-base-card-backContent")
      .querySelector('div[role="button"]');
    expect(backContentWrapper).toBeInTheDocument();
    if (backContentWrapper) {
      fireEvent.click(backContentWrapper);
    }
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("calls onFlip when Enter key is pressed on face content", () => {
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    const faceContentWrapper = screen
      .getByTestId("mock-base-card-faceContent")
      .querySelector('div[role="button"]');
    expect(faceContentWrapper).toBeInTheDocument();
    if (faceContentWrapper) {
      fireEvent.keyDown(faceContentWrapper, { key: "Enter", code: "Enter" });
    }
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("calls onFlip when Space key is pressed on face content", () => {
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
      />
    );
    const faceContentWrapper = screen
      .getByTestId("mock-base-card-faceContent")
      .querySelector('div[role="button"]');
    expect(faceContentWrapper).toBeInTheDocument();
    if (faceContentWrapper) {
      fireEvent.keyDown(faceContentWrapper, { key: " ", code: "Space" });
    }
    expect(mockOnFlip).toHaveBeenCalledTimes(1);
  });

  test("passes className and innerCardClassName to BaseCard", () => {
    const customClass = "container-class";
    const customInnerClass = "inner-container-class";
    render(
      <BaseCardContainer
        cardData={mockCardData}
        isFlipped={false}
        onFlip={mockOnFlip}
        className={customClass}
        innerCardClassName={customInnerClass}
      />
    );
    const mockBaseCardElement = screen.getByTestId("mock-base-card");
    expect(mockBaseCardElement).toHaveClass(customClass);
    expect(mockBaseCardElement).toHaveClass(customInnerClass); // In our mock, we combine them for simplicity
  });
});
