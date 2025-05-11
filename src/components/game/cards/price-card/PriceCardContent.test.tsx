// src/components/game/cards/price-card/PriceCardContent.test.tsx
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { format } from "date-fns";

import { PriceCardContent } from "./PriceCardContent";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
  PriceCardFaceData,
  PriceCardSpecificBackData,
} from "./price-card.types";

const STATIC_BACK_FACE_DESCRIPTION_IN_TEST =
  "Market Price: The value of a single unit of this asset.";

const createMockPriceCardData = (
  overrides: Partial<PriceCardData> = {}
): PriceCardData => {
  const now = Date.now();
  const baseTime = new Date("2025-05-10T10:30:00.000Z").getTime();

  const defaultFaceData: PriceCardFaceData = {
    timestamp: baseTime,
    price: 150.75,
    dayChange: 1.8,
    changePercentage: 1.208459, // (1.8 / 148.95) * 100
    dayHigh: 151.0,
    dayLow: 148.5,
    dayOpen: 149.0,
    previousClose: 148.95,
    volume: 12345678,
    yearHigh: 160.0,
    yearLow: 100.0,
  };

  const defaultBackData: PriceCardSpecificBackData = {
    description: "Test description for TST.",
    marketCap: 150_000_000_000,
    sma50d: 145.5,
    sma200d: 140.25,
  };

  return {
    id: "price-123",
    type: "price",
    symbol: "TST",
    createdAt: now,
    companyName: "Test Inc.",
    logoUrl: "/test-logo.png",
    faceData: {
      ...defaultFaceData,
      ...(overrides.faceData || {}),
    },
    backData: {
      ...defaultBackData,
      ...(overrides.backData || {}),
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

  // MODIFIED renderForTest to correctly pass undefined callbacks
  const renderForTest = (
    isBackFace: boolean,
    cardData: PriceCardData = mockFullCardData,
    callbacksOverride?: Partial<PriceCardInteractionCallbacks>
  ) => {
    // Start with default mocks
    const defaultCallbacks: PriceCardInteractionCallbacks = {
      onPriceCardSmaClick: mockOnSmaClick,
      onPriceCardRangeContextClick: mockOnRangeContextClick,
      onPriceCardOpenPriceClick: mockOnOpenPriceClick,
      onPriceCardGenerateDailyPerformanceSignal:
        mockOnGenerateDailyPerformanceSignal,
    };

    // Apply overrides. If a key is in callbacksOverride with value undefined, it will be undefined.
    // If a key is not in callbacksOverride, the default mock function will be used.
    const finalCallbacks = { ...defaultCallbacks, ...callbacksOverride };

    return render(
      <PriceCardContent
        cardData={cardData}
        isBackFace={isBackFace}
        onSmaClick={finalCallbacks.onPriceCardSmaClick}
        onRangeContextClick={finalCallbacks.onPriceCardRangeContextClick}
        onOpenPriceClick={finalCallbacks.onPriceCardOpenPriceClick}
        onGenerateDailyPerformanceSignal={
          finalCallbacks.onPriceCardGenerateDailyPerformanceSignal
        }
      />
    );
  };

  describe("Front Face (isBackFace = false)", () => {
    test("renders price, day change, and percent change correctly", () => {
      renderForTest(false);
      expect(
        screen.getByText(`$${mockFullCardData.faceData.price!.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(`+${mockFullCardData.faceData.dayChange!.toFixed(2)}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          `(+${mockFullCardData.faceData.changePercentage!.toFixed(2)}%)`
        )
      ).toBeInTheDocument();
    });

    test("daily performance area is interactive and calls handler", () => {
      renderForTest(false, mockFullCardData, {
        onPriceCardGenerateDailyPerformanceSignal:
          mockOnGenerateDailyPerformanceSignal,
      });
      const dailyPerfArea = screen.getByLabelText(
        `Interact with daily performance: Price ${mockFullCardData.faceData.price?.toFixed(
          2
        )}`
      );
      fireEvent.click(dailyPerfArea);
      expect(mockOnGenerateDailyPerformanceSignal).toHaveBeenCalledWith(
        mockFullCardData
      );
    });

    test("renders Day Low/High labels and tooltips, and makes them interactive", () => {
      renderForTest(false, mockFullCardData, {
        onPriceCardRangeContextClick: mockOnRangeContextClick,
      });

      const dayLowItem = screen.getByTestId("day-low-interactive-area");
      expect(within(dayLowItem).getByText("Day Low")).toBeInTheDocument();
      // Assuming PriceCardContent.tsx sets title="<value>"
      expect(dayLowItem).toHaveAttribute(
        "title",
        `${mockFullCardData.faceData.dayLow!.toFixed(2)}`
      );
      fireEvent.click(dayLowItem);
      expect(mockOnRangeContextClick).toHaveBeenCalledWith(
        mockFullCardData,
        "Low",
        mockFullCardData.faceData.dayLow
      );

      const dayHighItem = screen.getByTestId("day-high-interactive-area");
      expect(within(dayHighItem).getByText("Day High")).toBeInTheDocument();
      // Assuming PriceCardContent.tsx sets title="Day High: <value>"
      expect(dayHighItem).toHaveAttribute(
        "title",
        `${mockFullCardData.faceData.dayHigh!.toFixed(2)}`
      );
      fireEvent.click(dayHighItem);
      expect(mockOnRangeContextClick).toHaveBeenCalledWith(
        mockFullCardData,
        "High",
        mockFullCardData.faceData.dayHigh
      );
    });

    test("renders 52W Low/High labels and tooltips, and makes them interactive", () => {
      renderForTest(false, mockFullCardData, {
        onPriceCardRangeContextClick: mockOnRangeContextClick,
      });

      const yearLowItem = screen.getByTestId("year-low-interactive-area");
      expect(within(yearLowItem).getByText("52W Low")).toBeInTheDocument();
      // Assuming PriceCardContent.tsx sets title="<value>"
      expect(yearLowItem).toHaveAttribute(
        "title",
        `${mockFullCardData.faceData.yearLow!.toFixed(2)}`
      );
      fireEvent.click(yearLowItem);
      expect(mockOnRangeContextClick).toHaveBeenCalledWith(
        mockFullCardData,
        "YearLow",
        mockFullCardData.faceData.yearLow
      );

      const yearHighItem = screen.getByTestId("year-high-interactive-area");
      expect(within(yearHighItem).getByText("52W High")).toBeInTheDocument();
      // Assuming PriceCardContent.tsx sets title="<value>"
      expect(yearHighItem).toHaveAttribute(
        "title",
        `${mockFullCardData.faceData.yearHigh!.toFixed(2)}`
      );
      fireEvent.click(yearHighItem);
      expect(mockOnRangeContextClick).toHaveBeenCalledWith(
        mockFullCardData,
        "YearHigh",
        mockFullCardData.faceData.yearHigh
      );
    });

    test("range labels are not interactive if callback is not provided", () => {
      // Pass explicit undefined for the callback
      renderForTest(false, mockFullCardData, {
        onPriceCardRangeContextClick: undefined,
      });

      const dayLowItem = screen.getByTestId("day-low-interactive-area");
      // Check that the specific aria-label for interaction is NOT present
      expect(dayLowItem.getAttribute("aria-label")).toBeNull();
      // Check that interactiveClassName (which includes cursor-pointer) is not applied
      // This depends on ClickableDataItem correctly handling isInteractive=false
      expect(dayLowItem).not.toHaveClass("cursor-pointer");

      const yearHighItem = screen.getByTestId("year-high-interactive-area");
      expect(yearHighItem.getAttribute("aria-label")).toBeNull();
      expect(yearHighItem).not.toHaveClass("cursor-pointer");
    });

    test("handles null data gracefully on front face for ranges", () => {
      const cardDataWithNullRanges = createMockPriceCardData({
        faceData: {
          ...createMockPriceCardData().faceData,
          dayLow: null,
          dayHigh: null,
          yearLow: null,
          yearHigh: null,
        },
      });
      renderForTest(false, cardDataWithNullRanges);
      expect(
        screen.queryByTestId("day-low-interactive-area")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("year-high-interactive-area")
      ).not.toBeInTheDocument();
    });
  });

  describe("Back Face (isBackFace = true)", () => {
    test("renders provided description from cardData and key metrics", () => {
      renderForTest(true);
      expect(
        screen.getByText(mockFullCardData.backData.description!)
      ).toBeInTheDocument();
      // Use a function matcher to find "Open" without the colon if that's how it's rendered
      const openLabel = screen.getByText(
        (content, element) =>
          element?.tagName.toLowerCase() === "span" &&
          element.classList.contains("font-semibold") &&
          content.trim() === "Open" // Check for "Open" without colon
      );
      expect(openLabel).toBeInTheDocument();
      expect(openLabel.nextElementSibling?.textContent).toBe(
        `$${mockFullCardData.faceData.dayOpen!.toFixed(2)}`
      );
    });

    test("renders static fallback description when cardData.backData.description is null", () => {
      const cardDataWithoutDescription = createMockPriceCardData({
        backData: { ...mockFullCardData.backData, description: null },
      });
      renderForTest(true, cardDataWithoutDescription);
      expect(
        screen.getByText(STATIC_BACK_FACE_DESCRIPTION_IN_TEST)
      ).toBeInTheDocument();
    });

    test("renders static fallback description when cardData.backData.description is undefined", () => {
      const cardDataWithoutDescriptionField = createMockPriceCardData({
        backData: { marketCap: 100e9, sma50d: 50, sma200d: 45 },
      });
      renderForTest(true, cardDataWithoutDescriptionField);
      expect(
        screen.getByText(STATIC_BACK_FACE_DESCRIPTION_IN_TEST)
      ).toBeInTheDocument();
    });

    test("handles null data gracefully on back face", () => {
      const cardDataWithNulls = createMockPriceCardData({
        faceData: {
          ...createMockPriceCardData().faceData,
          dayOpen: null,
          previousClose: null,
          volume: null,
          timestamp: null,
          price: null,
          dayChange: null,
          changePercentage: null,
          dayHigh: null,
          dayLow: null,
        },
        backData: {
          marketCap: null,
          sma50d: null,
          sma200d: null,
          description: "Test null data description",
        },
      });
      renderForTest(true, cardDataWithNulls);

      const openItem = screen.getByTestId("open-price-interactive-area");
      expect(
        within(openItem).getByText(
          (content, el) =>
            el?.tagName.toLowerCase() === "span" && content.trim() === "Open"
        )
      ).toBeInTheDocument();
      expect(within(openItem).getByText("$N/A")).toBeInTheDocument();

      expect(
        screen.getByText(
          (c, e) =>
            e?.tagName.toLowerCase() === "span" && c.trim() === "Prev Close"
        ).nextElementSibling?.textContent
      ).toBe("$N/A");
      expect(
        screen.getByText(
          (c, e) => e?.tagName.toLowerCase() === "span" && c.trim() === "Volume"
        ).nextElementSibling?.textContent
      ).toBe("N/A");
      expect(
        screen.getByText(
          (c, e) =>
            e?.tagName.toLowerCase() === "span" && c.trim() === "Market Cap"
        ).nextElementSibling?.textContent
      ).toBe("N/A");
      expect(
        screen.getByText(
          (c, e) =>
            e?.tagName.toLowerCase() === "span" && c.trim() === "50D SMA"
        ).nextElementSibling?.textContent
      ).toBe("$N/A");
      expect(
        screen.getByText(
          (c, e) =>
            e?.tagName.toLowerCase() === "span" && c.trim() === "200D SMA"
        ).nextElementSibling?.textContent
      ).toBe("$N/A");
    });
  });
});
