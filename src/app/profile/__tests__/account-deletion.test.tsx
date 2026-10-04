import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUseAuth = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockGetSession = jest.fn<
  () => Promise<{
    data: { session: { access_token: string } | null };
    error: Error | null;
  }>
>();
const mockSignOut = jest.fn<
  (options: { scope: string }) => Promise<{ error: Error | null }>
>();
const mockInvoke = jest.fn<
  () => Promise<
    | { data: { success: boolean }; error: null }
    | { data: null; error: { context: { status: number } } }
  >
>();
const mockSingle = jest.fn<
  () => Promise<{
    data: { id: string; username: string; full_name: string };
    error: null;
  }>
>();

const mockSupabase = {
  auth: {
    getSession: mockGetSession,
    signOut: mockSignOut,
  },
  functions: {
    invoke: mockInvoke,
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: mockSingle,
      }),
    }),
  }),
};

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => mockSupabase,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

// Import after the mocks so the page receives the controlled auth client.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProfilePage = require("../page").default as typeof import("../page").default;

async function confirmAccountDeletion() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Delete My Account" })
  );
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
}

describe("Profile account deletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "person@example.com" },
      isLoading: false,
    });
    mockSingle.mockResolvedValue({
      data: { id: "user-1", username: "person", full_name: "Person" },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "valid-access-token" } },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("shows an actionable error when the function rejects the session", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { context: { status: 401 } },
    });

    render(<ProfilePage />);
    await confirmAccountDeletion();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Your session is no longer valid. Sign in again and retry."
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("clears the local session and returns home after deletion", async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    render(<ProfilePage />);
    await confirmAccountDeletion();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mockReplace).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
