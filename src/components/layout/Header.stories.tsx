// src/components/layout/Header.stories.tsx
import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import HeaderComponent from "./header"; // Assuming story is in src/components/layout/
import { AuthContext, type AuthContextType } from "@/contexts/AuthContext"; // Correctly import context and its type
import type {
  Session,
  User,
  AuthChangeEvent,
  AuthError,
} from "@supabase/supabase-js"; // Import necessary Supabase types
import { SupabaseClient } from "@supabase/supabase-js";

// A more typed (though still partial) mock for SupabaseClient focusing on auth methods used by AuthContext
// We cast to SupabaseClient because fully mocking it is extensive.
// The key is that the methods *actually called* by AuthContext are present and correctly typed.
const mockSupabaseClient = {
  auth: {
    signOut: async (): Promise<{ error: AuthError | null }> => {
      action("mock: supabase.auth.signOut")();
      return { error: null };
    },
    getSession: async (): Promise<{
      data: { session: Session | null };
      error: AuthError | null;
    }> => {
      action("mock: supabase.auth.getSession")();
      // Simulate no active session by default for stories, can be overridden in specific story args
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ): { data: { subscription: { unsubscribe: () => void } } } => {
      action("mock: supabase.auth.onAuthStateChange callback registered")(
        callback
      );
      // In a real scenario, this callback would be invoked by Supabase.
      // For stories, we typically don't need to simulate these events unless testing specific reactions.
      // Example: callback("INITIAL_SESSION", null); // Simulate initial state
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              action("mock: supabase.auth.onAuthStateChange.unsubscribe")();
            },
          },
        },
      };
    },
  },
  // If AuthContext uses other parts of SupabaseClient (e.g., from()), mock them as needed.
} as unknown as SupabaseClient;

// Default mock values for AuthContext, using the imported AuthContextType.
const defaultAuthContextMock: AuthContextType = {
  supabase: mockSupabaseClient,
  session: null,
  user: null,
  isLoading: false,
  signOut: async () => {
    action("AuthContext.signOut called")();
    // This mock should also ideally update the 'user' and 'session' in a story if a story needs to react to signout.
    // For now, primarily logging the action.
  },
};

const meta: Meta<typeof HeaderComponent> = {
  title: "Layout/HeaderComponent",
  component: HeaderComponent,
  tags: ["autodocs"],
  parameters: {
    // nextjs: { // If using storybook-nextjs-router for Next.js Link components
    //   appDirectory: true,
    // },
  },
};

export default meta;

// Define the structure of custom arguments our stories will use to control the AuthContext
interface HeaderStoryCustomArgs {
  authContextValue?: AuthContextType;
  // HeaderComponent takes no direct props, so this interface mainly holds authContextValue.
}

// Define the Story type, making Storybook aware of our custom args structure.
// This combines the inferred props of HeaderComponent (none in this case) with our custom args.
type Story = StoryObj<
  React.ComponentProps<typeof HeaderComponent> & HeaderStoryCustomArgs
>;

// Template story that provides the AuthContext
const Template: Story = {
  render: (args: HeaderStoryCustomArgs) => {
    // args is now HeaderStoryCustomArgs
    const authContextValueToProvide =
      args.authContextValue || defaultAuthContextMock;

    return (
      <AuthContext.Provider value={authContextValueToProvide}>
        <HeaderComponent />
      </AuthContext.Provider>
    );
  },
};

export const LoggedOut: Story = {
  ...Template,
  args: {
    authContextValue: {
      ...defaultAuthContextMock,
      user: null,
      session: null,
      isLoading: false,
    },
  },
};

export const Loading: Story = {
  ...Template,
  args: {
    authContextValue: {
      ...defaultAuthContextMock,
      isLoading: true,
    },
  },
};

// Mock user and session data for logged-in states
const mockUser: User = {
  id: "user-storybook-mock-id",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Storybook User" }, // Example user metadata
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "user@storybook.example",
};

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

export const LoggedIn: Story = {
  ...Template,
  args: {
    authContextValue: {
      ...defaultAuthContextMock,
      user: mockUser,
      session: mockSession,
      isLoading: false,
      signOut: async () => {
        // Override default signOut for more specific action logging if desired
        action("AuthContext.signOut called (LoggedIn state)")();
      },
    },
  },
};

export const LoggedInLongEmail: Story = {
  ...Template,
  args: {
    authContextValue: {
      ...defaultAuthContextMock,
      user: {
        ...mockUser,
        email:
          "a.very.long.email.address.for.testing.truncation.feature.in.ui@example.com",
      },
      session: {
        // Also update session.user if your context/component reads email from there
        ...mockSession,
        user: {
          ...mockUser,
          email:
            "a.very.long.email.address.for.testing.truncation.feature.in.ui@example.com",
        },
      },
      isLoading: false,
      signOut: async () => {
        action("AuthContext.signOut called (LoggedInLongEmail state)")();
      },
    },
  },
};
