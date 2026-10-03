import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";

const mockUseAuth = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Import after the auth module is isolated so the hook receives the test double.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useExchangeRate } = require("../useExchangeRate") as typeof import("../useExchangeRate");

function ExchangeRateConsumer() {
  useExchangeRate();
  return null;
}

describe("useExchangeRate public-data boundary", () => {
  it("does not query exchange rates for an unauthenticated visitor", () => {
    const from = jest.fn();
    mockUseAuth.mockReturnValue({
      supabase: { from },
      user: null,
    });

    render(<ExchangeRateConsumer />);

    expect(from).not.toHaveBeenCalled();
  });
});
