import {
  convertCurrency,
  normalizeCurrencyCode,
} from "../financial-currency";

describe("financial currency helpers", () => {
  describe("normalizeCurrencyCode", () => {
    it("normalizes valid currency metadata", () => {
      expect(normalizeCurrencyCode(" eur ")).toBe("EUR");
    });

    it.each([null, undefined, "", "US", "USDX"])(
      "rejects missing or malformed currency metadata: %p",
      (currency) => {
        expect(normalizeCurrencyCode(currency)).toBeNull();
      }
    );
  });

  describe("convertCurrency", () => {
    const rates = {
      EUR: 0.8,
      GBP: 0.75,
    };

    it("returns a same-currency value without requiring a rate", () => {
      expect(convertCurrency(100, "EUR", "EUR", {})).toBe(100);
    });

    it("converts a source currency to USD", () => {
      expect(convertCurrency(80, "EUR", "USD", rates)).toBeCloseTo(100);
    });

    it("converts USD to a target currency", () => {
      expect(convertCurrency(100, "USD", "EUR", rates)).toBeCloseTo(80);
    });

    it("converts between two non-USD currencies through USD", () => {
      expect(convertCurrency(80, "EUR", "GBP", rates)).toBeCloseTo(75);
    });

    it("returns null instead of mixing currencies when a rate is missing", () => {
      expect(convertCurrency(100, "CHF", "EUR", rates)).toBeNull();
    });

    it("returns null when currency metadata is unknown", () => {
      expect(convertCurrency(100, null, "USD", rates)).toBeNull();
    });

    it("rejects invalid values and rates", () => {
      expect(convertCurrency(Number.NaN, "EUR", "USD", rates)).toBeNull();
      expect(convertCurrency(100, "EUR", "USD", { EUR: 0 })).toBeNull();
    });
  });
});
