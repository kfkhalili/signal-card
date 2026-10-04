import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

type ProfileUpdateResponse = {
  data: { id: string; is_profile_complete: boolean } | null;
  error: { code?: string } | null;
};

const mockUseAuth = jest.fn();
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockReplace = jest.fn();
const mockMaybeSingle = jest.fn<() => Promise<ProfileUpdateResponse>>();
const mockSelect = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEq = jest.fn(() => ({ select: mockSelect }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mockReplace,
  }),
}));

// Import after the mocks so the page receives the controlled auth client.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CompleteProfilePage = require("../page").default as typeof import("../page").default;

const mockSupabase = {
  from: jest.fn(() => ({ update: mockUpdate })),
};

const consoleErrorSpy = jest
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

function submitProfile(username = "new-user") {
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: username },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("profile completion", () => {
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "user-1", email: "person@example.com" },
      isLoading: false,
      clientInitError: null,
    });
  });

  it("navigates only after confirming the profile row was updated", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "user-1", is_profile_complete: true },
      error: null,
    });

    render(<CompleteProfilePage />);
    submitProfile();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/workspace");
      expect(mockRefresh).toHaveBeenCalled();
      expect(
        (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });
  });

  it("restores the form when no profile row was updated", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    render(<CompleteProfilePage />);
    submitProfile();

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "We could not find your profile. Please try again."
      );
      expect(
        (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a useful message when the username is already taken", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "23505" },
    });

    render(<CompleteProfilePage />);
    submitProfile();

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "That username is already taken. Please choose another one."
      );
      expect(
        (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });
  });
});
