/**
 * src/components/game/cards/price-card/PriceCardContent.test.tsx
 */
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { format } from "date-fns";

import { PriceCardContent } from "./PriceCardContent";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./price-card.types";

// (Keep your createMockPriceCardData and other setup as it was)
const createMockPriceCardData = (
  overrides: Partial<PriceCardData> = {}
): PriceCardData => {
  const now = Date.now();
  const baseTime = new Date("2025-05-10T10:30:00.000Z").getTime();

  return {
    id: "price-123",
    type: "price",
    symbol: "TST",
    createdAt: now,
    faceData: {
      timestamp: baseTime,
      price: 150.75,
      dayChange: 1.8,
      changePercentage: 0.012,
      dayHigh: 151.0,
      dayLow: 148.5,
      dayOpen: 149.0,
      previousClose: 148.95,
      volume: 12345678,
      ...overrides.faceData,
    },
    backData: {
      explanation: "Test explanation for TST.",
      marketCap: 150_000_000_000,
      sma50d: 145.5,
      sma200d: 140.25,
      ...overrides.backData,
    },
    ...overrides,
  };
};

describe("PriceCardContent Component", () => {
  let mockOnSmaClick: jest.Mock;
  let mockOnRangeContextClick: jest.Mock;
  let mockOnOpenPriceClick: jest.Mock;
  let mockOnGenerateDailyPerformanceSignal: jest.Mock;
  let mockFullCardData: PriceCardData;

  beforeEach(() => {
    mockOnSmaClick = jest.fn();
    mockOnRangeContextClick = jest.fn();
    mockOnOpenPriceClick = jest.fn();
    mockOnGenerateDailyPerformanceSignal = jest.fn();
    mockFullCardData = createMockPriceCardData();
  });

  const renderForTest = (
    isBackFace: boolean,
    cardData: PriceCardData = mockFullCardData,
    callbacks?: Partial<PriceCardInteractionCallbacks>
  ) => {
    return render(
      <PriceCardContent
        cardData={cardData}
        isBackFace={isBackFace}
        onSmaClick={callbacks?.onPriceCardSmaClick}
        onRangeContextClick={callbacks?.onPriceCardRangeContextClick}
        onOpenPriceClick={callbacks?.onPriceCardOpenPriceClick}
        onGenerateDailyPerformanceSignal={
          callbacks?.onPriceCardGenerateDailyPerformanceSignal
        }
      />
    );
  };

  // --- Front Face Tests (Assumed to be passing or fixed from previous iteration) ---
  // ... (keep existing front face tests here) ...
  describe("Front Face (isBackFace = false)", () => {
    test("renders symbol, title, and live quote details", () => {
      renderForTest(false, mockFullCardData, {
        onPriceCardGenerateDailyPerformanceSignal:
          mockOnGenerateDailyPerformanceSignal,
        onPriceCardRangeContextClick: mockOnRangeContextClick,
      });
      expect(screen.getByText(mockFullCardData.symbol)).toBeInTheDocument();
      expect(screen.getByText("Live Quote")).toBeInTheDocument();
      expect(
        screen.getByText(`$${mockFullCardData.faceData.price!.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(`+${mockFullCardData.faceData.dayChange!.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          `(+${(mockFullCardData.faceData.changePercentage! * 100).toFixed(
            2
          )}%)`
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          format(new Date(mockFullCardData.faceData.timestamp!), "p")
        )
      ).toBeInTheDocument();
    });

    test("daily performance area is interactive and calls handler when callback is provided", () => {
      renderForTest(false, mockFullCardData, {
        onPriceCardGenerateDailyPerformanceSignal:
          mockOnGenerateDailyPerformanceSignal,
      });
      const dailyPerfArea = screen.getByTestId(
        "daily-performance-interactive-area"
      );
      expect(dailyPerfArea).toHaveClass("cursor-pointer");
      fireEvent.click(dailyPerfArea);
      expect(mockOnGenerateDailyPerformanceSignal).toHaveBeenCalledTimes(1);
      expect(mockOnGenerateDailyPerformanceSignal).toHaveBeenCalledWith(
        mockFullCardData
      );
    });

    test("renders day low/high range and makes them interactive when callback is provided", () => {
      renderForTest(false, mockFullCardData, {
        onPriceCardRangeContextClick: mockOnRangeContextClick,
      });
      const dayLowText = `L: $${mockFullCardData.faceData.dayLow!.toFixed(2)}`;
      const dayHighText = `H: $${mockFullCardData.faceData.dayHigh!.toFixed(
        2
      )}`;

      expect(screen.getByText(dayLowText)).toBeInTheDocument();
      expect(screen.getByText(dayHighText)).toBeInTheDocument();

      const dayLowArea = screen.getByTestId("day-low-interactive-area");
      expect(dayLowArea).toHaveClass("cursor-pointer");
      fireEvent.click(dayLowArea);
      expect(mockOnRangeContextClick).toHaveBeenCalledWith(
        mockFullCardData,
        "Low",
        mockFullCardData.faceData.dayLow
      );

      const dayHighArea = screen.getByTestId("day-high-interactive-area");
      expect(dayHighArea).toHaveClass("cursor-pointer");
      fireEvent.click(dayHighArea);
      expect(mockOnRangeContextClick).toHaveBeenCalledWith(
        mockFullCardData,
        "High",
        mockFullCardData.faceData.dayHigh
      );
    });

    test("interactive areas are not interactive if callbacks are not provided", () => {
      renderForTest(false, mockFullCardData);

      const dailyPerfArea = screen.getByTestId(
        "daily-performance-interactive-area"
      );
      expect(dailyPerfArea).not.toHaveClass("cursor-pointer");
      expect(dailyPerfArea).not.toHaveAttribute(
        "aria-label",
        expect.stringContaining("Interact with daily performance")
      );
      expect(dailyPerfArea).not.toHaveAttribute("role", "button");

      const dayLowArea = screen.getByTestId("day-low-interactive-area");
      expect(dayLowArea).not.toHaveClass("cursor-pointer");
      expect(dayLowArea).not.toHaveAttribute(
        "aria-label",
        expect.stringContaining("Interact with Day Low")
      );
      expect(dayLowArea).not.toHaveAttribute("role", "button");

      const dayHighArea = screen.getByTestId("day-high-interactive-area");
      expect(dayHighArea).not.toHaveClass("cursor-pointer");
      expect(dayHighArea).not.toHaveAttribute(
        "aria-label",
        expect.stringContaining("Interact with Day High")
      );
      expect(dayHighArea).not.toHaveAttribute("role", "button");
    });

    test("handles null data gracefully on front face", () => {
      const cardDataWithNulls = createMockPriceCardData({
        faceData: {
          price: null,
          dayChange: null,
          changePercentage: null,
          timestamp: null,
          dayLow: null,
          dayHigh: null,
          dayOpen: null,
          previousClose: null,
          volume: null,
        },
      });
      renderForTest(false, cardDataWithNulls);

      expect(screen.getByText("$N/A")).toBeInTheDocument();

      const dailyPerfArea = screen.getByTestId(
        "daily-performance-interactive-area"
      );
      expect(
        within(dailyPerfArea).getByText(
          (content, node) =>
            node?.textContent === "N/A" && node.classList.contains("text-lg")
        )
      ).toBeInTheDocument();
      expect(
        within(dailyPerfArea).getByText(
          (content, node) =>
            node?.textContent === "(N/A)" && node.classList.contains("text-lg")
        )
      ).toBeInTheDocument();

      const frontContent = screen.getByTestId("price-card-front-content");
      const allPTags = within(frontContent).queryAllByRole("paragraph", {
        hidden: true,
      });
      const headerTimestampPTag = allPTags.find(
        (p) =>
          p.classList.contains("text-xs") &&
          p.classList.contains("text-muted-foreground") &&
          p.textContent === "N/A"
      );
      expect(headerTimestampPTag).toBeInTheDocument();

      expect(
        screen.getByText(
          (content, element) =>
            content.startsWith("Data as of:") && content.endsWith("N/A")
        )
      ).toBeInTheDocument();

      expect(screen.queryByTestId("day-low-interactive-area")).toBeNull();
      expect(screen.queryByTestId("day-high-interactive-area")).toBeNull();
    });
  });

  describe("Back Face (isBackFace = true)", () => {
    test("renders symbol, title, and explanation", () => {
      renderForTest(true, mockFullCardData, {
        onPriceCardOpenPriceClick: mockOnOpenPriceClick,
        onPriceCardSmaClick: mockOnSmaClick,
      });
      expect(
        screen.getByText(`${mockFullCardData.symbol} - Details`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(mockFullCardData.backData.explanation!)
      ).toBeInTheDocument();
    });

    // Test that was failing:
    test("renders various price data points", () => {
      renderForTest(true, mockFullCardData);
      const openPriceContainer = screen.getByTestId(
        "open-price-interactive-area"
      );
      expect(within(openPriceContainer).getByText("Open:")).toBeInTheDocument();
      expect(
        within(openPriceContainer).getByText(
          `$${mockFullCardData.faceData.dayOpen!.toFixed(2)}`
        )
      ).toBeInTheDocument();

      // Corrected check for "Prev Close:"
      const prevCloseLabel = screen.getByText("Prev Close:");
      // Check the parent's text content for the full string including label and value
      expect(
        prevCloseLabel.parentElement?.textContent?.replace(/\s+/g, " ")
      ).toBe(
        `Prev Close: $${mockFullCardData.faceData.previousClose!.toFixed(2)}`
      );
      // Add similar checks for Day High, Day Low, Volume if needed, using parentElement.textContent
    });

    test("renders market cap correctly", () => {
      renderForTest(true, mockFullCardData);
      expect(screen.getByText("Market Cap:")).toBeInTheDocument();
      expect(screen.getByText("150.00B")).toBeInTheDocument();
    });

    test("open price is interactive and calls handler when callback is provided", () => {
      renderForTest(true, mockFullCardData, {
        onPriceCardOpenPriceClick: mockOnOpenPriceClick,
      });
      const openPriceArea = screen.getByTestId("open-price-interactive-area");
      expect(openPriceArea).toHaveClass("cursor-pointer");
      fireEvent.click(openPriceArea);
      expect(mockOnOpenPriceClick).toHaveBeenCalledTimes(1);
      expect(mockOnOpenPriceClick).toHaveBeenCalledWith(mockFullCardData);
    });

    test("SMA 50D is interactive and calls handler when callback is provided", () => {
      renderForTest(true, mockFullCardData, {
        onPriceCardSmaClick: mockOnSmaClick,
      });
      const sma50Area = screen.getByTestId("sma-50d-interactive-area");
      expect(sma50Area).toHaveClass("cursor-pointer");
      fireEvent.click(sma50Area);
      expect(mockOnSmaClick).toHaveBeenCalledWith(
        mockFullCardData,
        50,
        mockFullCardData.backData.sma50d
      );
    });

    test("SMA 200D is interactive and calls handler when callback is provided", () => {
      renderForTest(true, mockFullCardData, {
        onPriceCardSmaClick: mockOnSmaClick,
      });
      const sma200Area = screen.getByTestId("sma-200d-interactive-area");
      expect(sma200Area).toHaveClass("cursor-pointer");
      fireEvent.click(sma200Area);
      expect(mockOnSmaClick).toHaveBeenCalledWith(
        mockFullCardData,
        200,
        mockFullCardData.backData.sma200d
      );
    });

    test("interactive areas on back are not interactive if callbacks are not provided", () => {
      renderForTest(true, mockFullCardData);

      const openPriceArea = screen.getByTestId("open-price-interactive-area");
      expect(openPriceArea).not.toHaveClass("cursor-pointer");
      expect(openPriceArea).not.toHaveAttribute(
        "aria-label",
        expect.stringContaining("Interact with Open Price")
      );
      expect(openPriceArea).not.toHaveAttribute("role", "button");

      const sma50Area = screen.getByTestId("sma-50d-interactive-area");
      expect(sma50Area).not.toHaveClass("cursor-pointer");
      expect(sma50Area).not.toHaveAttribute(
        "aria-label",
        expect.stringContaining("Interact with 50D SMA")
      );
      expect(sma50Area).not.toHaveAttribute("role", "button");

      const sma200Area = screen.getByTestId("sma-200d-interactive-area");
      expect(sma200Area).not.toHaveClass("cursor-pointer");
      expect(sma200Area).not.toHaveAttribute(
        "aria-label",
        expect.stringContaining("Interact with 200D SMA")
      );
      expect(sma200Area).not.toHaveAttribute("role", "button");
    });

    // Test that was failing:
    test("handles null data gracefully on back face", () => {
      const cardDataWithNulls = createMockPriceCardData({
        faceData: {
          dayOpen: null,
          previousClose: null,
          dayHigh: null,
          dayLow: null,
          volume: null,
          timestamp: null,
          price: null,
          dayChange: null,
          changePercentage: null,
        },
        backData: {
          marketCap: null,
          sma50d: null,
          sma200d: null,
          explanation: "Null data test",
        },
      });
      renderForTest(true, cardDataWithNulls);

      const openPriceWrapper = screen.getByTestId(
        "open-price-interactive-area"
      );
      expect(openPriceWrapper.textContent?.replace(/\s+/g, " ").trim()).toBe(
        "Open: $N/A"
      );

      const prevCloseLabel = screen.getByText("Prev Close:");
      expect(
        prevCloseLabel.parentElement?.textContent?.replace(/\s+/g, " ").trim()
      ).toBe("Prev Close: $N/A");

      const marketCapLabel = screen.getByText("Market Cap:");
      expect(
        marketCapLabel.parentElement?.textContent?.replace(/\s+/g, " ").trim()
      ).toBe("Market Cap:N/A"); // Market cap format doesn't add $

      // Corrected checks for SMAs using their data-testid wrappers
      const sma50Wrapper = screen.getByTestId("sma-50d-interactive-area");
      expect(sma50Wrapper.textContent?.replace(/\s+/g, " ").trim()).toBe(
        "50D SMA: $N/A"
      );

      const sma200Wrapper = screen.getByTestId("sma-200d-interactive-area");
      expect(sma200Wrapper.textContent?.replace(/\s+/g, " ").trim()).toBe(
        "200D SMA: $N/A"
      );
    });
  });
});
