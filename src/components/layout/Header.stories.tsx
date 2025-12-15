// src/components/layout/Header.stories.tsx
import React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { action } from "storybook/actions";
import Header from "./Header";
import { AuthContext, type AuthContextType } from "@/contexts/AuthContext";
import type {
  Session,
  User,
  AuthChangeEvent,
  AuthError,
} from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";

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
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ): { data: { subscription: { unsubscribe: () => void } } } => {
      action("mock: supabase.auth.onAuthStateChange callback registered")(
        callback
      );
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
} as unknown as SupabaseClient;

// Default mock values for AuthContext, including clientInitError
const defaultAuthContextMock: AuthContextType = {
  supabase: mockSupabaseClient,
  session: null,
  user: null,
  isLoading: false,
  clientInitError: null, // <<< Added clientInitError
  signOut: async () => {
    action("AuthContext.signOut called")();
  },
};

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {},
};

export default meta;

interface HeaderStoryCustomArgs {
  authContextValue?: AuthContextType;
}

type Story = StoryObj<
  React.ComponentProps<typeof Header> & HeaderStoryCustomArgs
>;

const Template: Story = {
  render: (args: HeaderStoryCustomArgs) => {
    const authContextValueToProvide =
      args.authContextValue || defaultAuthContextMock;

    return (
      <AuthContext.Provider value={authContextValueToProvide}>
        <Header />
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
      clientInitError: null, // <<< Added clientInitError
    },
  },
};

export const Loading: Story = {
  ...Template,
  args: {
    authContextValue: {
      ...defaultAuthContextMock,
      isLoading: true,
      clientInitError: null, // <<< Added clientInitError
    },
  },
};

const mockUser: User = {
  id: "user-storybook-mock-id",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Storybook User" },
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
      clientInitError: null, // <<< Added clientInitError
      signOut: async () => {
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
        ...mockSession,
        user: {
          ...mockUser,
          email:
            "a.very.long.email.address.for.testing.truncation.feature.in.ui@example.com",
        },
      },
      isLoading: false,
      clientInitError: null, // <<< Added clientInitError
      signOut: async () => {
        action("AuthContext.signOut called (LoggedInLongEmail state)")();
      },
    },
  },
};

// Story to demonstrate the clientInitError state
export const AuthClientInitializationError: Story = {
  ...Template,
  args: {
    authContextValue: {
      ...defaultAuthContextMock,
      user: null,
      session: null,
      isLoading: false,
      clientInitError:
        "Supabase client failed to initialize due to missing configuration.", // Example error message
      supabase: null, // Reflect that supabase client is null in this state
    },
  },
};
