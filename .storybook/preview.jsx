import React from "react";
import { AuthContext } from "../src/contexts/AuthContext";

// Import your global CSS file
import "../src/app/globals.css";

// Mock AuthContext value for Storybook
const mockAuthContextValue = {
  supabase: null,
  session: null,
  user: null,
  isLoading: false,
  clientInitError: null,
  signOut: async () => {
    console.log("[Storybook] Mock signOut called");
  },
};

/** @type { import('@storybook/nextjs').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Enable Next.js App Router support
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/",
      },
    },
  },
  decorators: [
    // Wrap all stories in AuthContext provider
    (Story) => (
      <AuthContext.Provider value={mockAuthContextValue}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
};

export default preview;
