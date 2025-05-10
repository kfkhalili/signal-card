import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PriceCardContent } from "./PriceCardContent";
import type { PriceCardData, PriceCardFaceData } from "./price-card.types";
import { ClickableDataItem as OriginalClickableDataItem } from "../../../ui/ClickableDataItem";

// Mock ClickableDataItem
const mockInternalOnClickHandlerForCDI = jest.fn();
jest.mock("../../../ui/ClickableDataItem", () => ({
  __esModule: true,
  ClickableDataItem: jest.fn(
    ({
      isInteractive,
      onClickHandler,
      children,
      "data-testid": dataTestId,
      "aria-label": ariaLabel,
      baseClassName,
      interactiveClassName,
    }) => {
      if (onClickHandler) {
        mockInternalOnClickHandlerForCDI.mockImplementation(
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
const ClickableDataItem = OriginalClickableDataItem as jest.MockedFunction<
  typeof OriginalClickableDataItem
>;

jest.mock("@/lib/utils", () => ({
  cn: (...args: Array<string | undefined | null | boolean>) =>
    args.filter(Boolean).join(" "),
}));

const mockFullFaceData: PriceCardFaceData = {
  price: 150.75,
  timestamp: new Date("2025-05-10T10:30:00Z"),
  changePercentage: 0.012,
  dayChange: 1.8,
  dayLow: 148.5,
  dayHigh: 151.0,
  volume: 12345678,
  dayOpen: 149.0,
  previousClose: 148.95,
};

const mockFullCardData: PriceCardData = {
  id: "price-123",
  type: "price",
  symbol: "TST",
  faceData: mockFullFaceData,
  backData: {
    explanation: "Test explanation for TST.",
    marketCap: 1.5e12,
    sma50d: 145.5,
    sma200d: 140.25,
  },
  appearedAt: Date.now(),
};

describe("PriceCardContent Component", () => {
  let onSmaClickMock: jest.Mock;
  let onRangeContextClickMock: jest.Mock;
  let onOpenPriceClickMock: jest.Mock;
  let onGenerateDailyPerformanceSignalMock: jest.Mock;

  beforeEach(() => {
    onSmaClickMock = jest.fn();
    onRangeContextClickMock = jest.fn();
    onOpenPriceClickMock = jest.fn();
    onGenerateDailyPerformanceSignalMock = jest.fn();
    ClickableDataItem.mockClear();
    mockInternalOnClickHandlerForCDI.mockClear();
  });

  describe("Front Face (isBackFace = false)", () => {
    test("renders symbol and live quote description", () => {
      render(
        <PriceCardContent cardData={mockFullCardData} isBackFace={false} />
      );
      expect(screen.getByText(mockFullCardData.symbol)).toBeInTheDocument();
      expect(screen.getByText("Live Quote")).toBeInTheDocument();
    });

    test("renders price, day change, and percentage change", () => {
      render(
        <PriceCardContent cardData={mockFullCardData} isBackFace={false} />
      );
      expect(
        screen.getByText(`$${mockFullFaceData.price.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(`+${mockFullFaceData.dayChange!.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          `(+${(mockFullFaceData.changePercentage! * 100).toFixed(2)}%)`
        )
      ).toBeInTheDocument();
    });

    test("daily performance area is interactive and calls handler", () => {
      render(
        <PriceCardContent
          cardData={mockFullCardData}
          isBackFace={false}
          onGenerateDailyPerformanceSignal={
            onGenerateDailyPerformanceSignalMock
          }
        />
      );
      const dailyPerfArea = screen.getByTestId(
        "daily-performance-interactive-area"
      );
      expect(dailyPerfArea).toHaveAttribute("data-interactive", "true");
      fireEvent.click(dailyPerfArea);
      expect(onGenerateDailyPerformanceSignalMock).toHaveBeenCalledWith(
        mockFullFaceData
      );
    });

    test("renders day low/high range and makes them interactive", () => {
      render(
        <PriceCardContent
          cardData={mockFullCardData}
          isBackFace={false}
          onRangeContextClick={onRangeContextClickMock}
        />
      );

      const dayLowArea = screen.getByTestId("day-low-interactive-area");
      expect(dayLowArea).toHaveTextContent(
        `L: $${mockFullFaceData.dayLow!.toFixed(2)}`
      );
      expect(dayLowArea).toHaveAttribute("data-interactive", "true");
      fireEvent.click(dayLowArea);
      expect(onRangeContextClickMock).toHaveBeenCalledWith(
        "Low",
        mockFullFaceData.dayLow,
        mockFullFaceData
      );

      onRangeContextClickMock.mockClear();

      const dayHighArea = screen.getByTestId("day-high-interactive-area");
      expect(dayHighArea).toHaveTextContent(
        `H: $${mockFullFaceData.dayHigh!.toFixed(2)}`
      );
      expect(dayHighArea).toHaveAttribute("data-interactive", "true");
      fireEvent.click(dayHighArea);
      expect(onRangeContextClickMock).toHaveBeenCalledWith(
        "High",
        mockFullFaceData.dayHigh,
        mockFullFaceData
      );
    });

    test("renders N/A for missing optional front face data", () => {
      const partialFaceData: PriceCardFaceData = {
        price: 100,
        timestamp: new Date(),
      };
      const partialCardData: PriceCardData = {
        ...mockFullCardData,
        faceData: partialFaceData,
      };
      render(
        <PriceCardContent
          cardData={partialCardData}
          isBackFace={false}
          onGenerateDailyPerformanceSignal={
            onGenerateDailyPerformanceSignalMock
          }
        />
      );
      const dailyPerfContent = screen.getByTestId(
        "daily-performance-interactive-area"
      );
      // Check for "N/A" from dayChange and "(N/A)" from changePercentage
      expect(
        within(dailyPerfContent).getByText(
          (content, node) => node?.textContent === "N/A"
        )
      ).toBeInTheDocument();
      expect(
        within(dailyPerfContent).getByText(
          (content, node) => node?.textContent === "(N/A)"
        )
      ).toBeInTheDocument();
    });
  });

  describe("Back Face (isBackFace = true)", () => {
    test("renders symbol, details description, and explanation", () => {
      render(
        <PriceCardContent cardData={mockFullCardData} isBackFace={true} />
      );
      expect(
        screen.getByText(`${mockFullCardData.symbol} - Details`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(mockFullCardData.backData.explanation)
      ).toBeInTheDocument();
    });

    test("open price is interactive and calls handler", () => {
      render(
        <PriceCardContent
          cardData={mockFullCardData}
          isBackFace={true}
          onOpenPriceClick={onOpenPriceClickMock}
        />
      );
      const openPriceArea = screen.getByTestId("open-price-interactive-area");
      expect(openPriceArea).toHaveAttribute("data-interactive", "true");
      fireEvent.click(openPriceArea);
      expect(onOpenPriceClickMock).toHaveBeenCalledWith(mockFullFaceData);
    });

    test("renders market cap correctly", () => {
      render(
        <PriceCardContent cardData={mockFullCardData} isBackFace={true} />
      );
      expect(screen.getByText("1.50T")).toBeInTheDocument();
    });

    test("SMA 50D is interactive and calls handler", () => {
      render(
        <PriceCardContent
          cardData={mockFullCardData}
          isBackFace={true}
          onSmaClick={onSmaClickMock}
        />
      );
      const sma50Area = screen.getByTestId("sma-50d-interactive-area");
      expect(sma50Area).toHaveTextContent(
        `$${mockFullCardData.backData.sma50d!.toFixed(2)}`
      );
      expect(sma50Area).toHaveAttribute("data-interactive", "true");
      fireEvent.click(sma50Area);
      expect(onSmaClickMock).toHaveBeenCalledWith(
        50,
        mockFullCardData.backData.sma50d,
        mockFullFaceData
      );
    });

    test("SMA 200D is interactive and calls handler", () => {
      render(
        <PriceCardContent
          cardData={mockFullCardData}
          isBackFace={true}
          onSmaClick={onSmaClickMock}
        />
      );
      const sma200Area = screen.getByTestId("sma-200d-interactive-area");
      expect(sma200Area).toHaveTextContent(
        `$${mockFullCardData.backData.sma200d!.toFixed(2)}`
      );
      expect(sma200Area).toHaveAttribute("data-interactive", "true");
      fireEvent.click(sma200Area);
      expect(onSmaClickMock).toHaveBeenCalledWith(
        200,
        mockFullCardData.backData.sma200d,
        mockFullFaceData
      );
    });

    test("renders N/A for missing optional back face data", () => {
      const partialBackData = { explanation: "Test explanation" };
      const partialCardData: PriceCardData = {
        ...mockFullCardData,
        backData: partialBackData,
      };
      render(<PriceCardContent cardData={partialCardData} isBackFace={true} />);
      const marketCapParagraph = screen.getByText((content, element) => {
        return (
          element?.tagName.toLowerCase() === "p" &&
          (element.textContent?.startsWith("Market Cap:") ?? false)
        );
      });
      expect(marketCapParagraph).toHaveTextContent("Market Cap:N/A"); // Corrected: no space

      expect(screen.getByTestId("sma-50d-interactive-area")).toHaveTextContent(
        "N/A"
      );
      expect(screen.getByTestId("sma-200d-interactive-area")).toHaveTextContent(
        "N/A"
      );
    });
  });

  test("ClickableDataItem receives correct isInteractive prop when handlers are missing", () => {
    render(
      <PriceCardContent
        cardData={mockFullCardData}
        isBackFace={false}
        // No interaction handlers passed
      />
    );
    expect(
      screen.getByTestId("daily-performance-interactive-area")
    ).toHaveAttribute("data-interactive", "false");
    expect(screen.getByTestId("day-low-interactive-area")).toHaveAttribute(
      "data-interactive",
      "false"
    );
  });
});
