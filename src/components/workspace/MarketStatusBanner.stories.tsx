import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import MarketStatusBanner from "./MarketStatusBanner";
// Assuming DerivedMarketStatus is exported from here or a similar accessible path
import type { DerivedMarketStatus } from "@/hooks/useStockData";

// Mock DerivedMarketStatus if it cannot be imported directly in Storybook
// This is just for Storybook to run. Your component uses the real type.
// If your "@/hooks/useStockData" can be resolved by Storybook, you don't need this.
// type DerivedMarketStatus =
//   | "CONNECTING"
//   | "CONNECTED"
//   | "ERROR"
//   | "LIVE"
//   | "DELAYED"
//   | "AFTER_HOURS"
//   | "UNAVAILABLE"
//   | "INITIALIZING";

// Define a props type alias if your component's props interface is named differently
// or to ensure clarity. Assuming your props interface is MarketStatusBannerProps.
// If not, adjust this type name.
import type { MarketStatusBannerProps } from "./MarketStatusBanner"; // Or wherever it's defined

const meta: Meta<MarketStatusBannerProps> = {
  // Use MarketStatusBannerProps here
  title: "Workspace/MarketStatusBanner",
  component: MarketStatusBanner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  // Provide default args for the component.
  // These will be used by autodocs and as a base for stories.
  args: {
    uniqueSymbolsInWorkspace: ["AAPL", "GOOGL"],
    marketStatuses: {
      AAPL: { status: "LIVE" as DerivedMarketStatus, message: "Real-time" },
      GOOGL: {
        status: "DELAYED" as DerivedMarketStatus,
        message: "15 min delay",
      },
    },
    isAddingCardInProgress: false,
  },
  argTypes: {
    uniqueSymbolsInWorkspace: {
      control: "object",
      description: "Array of unique stock symbols in the workspace.",
    },
    marketStatuses: {
      control: "object",
      description: "Record of market statuses for each symbol.",
    },
    isAddingCardInProgress: {
      control: "boolean",
      description: "Flag indicating if a card is currently being added.",
    },
  },
};

export default meta;

type Story = StoryObj<MarketStatusBannerProps>; // Use MarketStatusBannerProps here too

// Stories now inherit args from meta and can override them.
// No need for baseArgs if meta.args provides a complete default set.

export const DefaultFromMeta: Story = {
  // This story will use the args defined in 'meta.args' by default.
  // You can add specific overrides here if needed:
  // args: {
  //   isAddingCardInProgress: true,
  // },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const DefaultEmpty: Story = {
  args: {
    uniqueSymbolsInWorkspace: [],
    marketStatuses: {},
    isAddingCardInProgress: false, // Explicitly set all required props
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const SingleSymbolInitializing: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["TSLA"],
    marketStatuses: {}, // TSLA has no status yet, will show as initializing
    isAddingCardInProgress: false,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const MultipleSymbolsInitializing: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["MSFT", "AMZN", "NVDA"],
    marketStatuses: {},
    isAddingCardInProgress: false,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const MixedStatuses: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA"],
    marketStatuses: {
      AAPL: { status: "LIVE" as DerivedMarketStatus, message: null },
      GOOGL: {
        status: "DELAYED" as DerivedMarketStatus,
        message: "Data is 15 mins delayed",
      },
      MSFT: {
        status: "AFTER_HOURS" as DerivedMarketStatus,
        message: "Market closed",
      },
      AMZN: {
        status: "ERROR" as DerivedMarketStatus,
        message: "Connection failed",
      },
      // NVDA will be "initializing" as it's in uniqueSymbolsInWorkspace but not marketStatuses
    },
    isAddingCardInProgress: false,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const AllConnected: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["BTC-USD", "ETH-USD"],
    marketStatuses: {
      "BTC-USD": {
        status: "LIVE" as DerivedMarketStatus,
        message: "Real-time",
      },
      "ETH-USD": {
        status: "LIVE" as DerivedMarketStatus,
        message: "Real-time",
      },
    },
    isAddingCardInProgress: false,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const WithErrorAndMessages: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["SNAP", "PINS"],
    marketStatuses: {
      SNAP: {
        status: "ERROR" as DerivedMarketStatus,
        message: "API limit reached for this symbol.",
      },
      PINS: {
        status: "UNAVAILABLE" as DerivedMarketStatus,
        message: "Symbol not found.",
      },
    },
    isAddingCardInProgress: false,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const AddingCardInProgress: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["UBER", "LYFT"], // LYFT is being "added"
    marketStatuses: {
      UBER: { status: "LIVE" as DerivedMarketStatus, message: null },
    },
    isAddingCardInProgress: true,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <p className="text-xs mb-2 text-center">
        (When adding card, initializing messages for new symbols are hidden)
      </p>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const AddingCardInProgressNoSymbolsYet: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["SPOT"], // SPOT is being added, no status yet
    marketStatuses: {},
    isAddingCardInProgress: true,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <p className="text-xs mb-2 text-center">
        (When adding card, initializing messages for new symbols are hidden)
      </p>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const LongMessages: Story = {
  args: {
    uniqueSymbolsInWorkspace: ["VERYLONGSTONKSYMBOL"],
    marketStatuses: {
      VERYLONGSTONKSYMBOL: {
        status: "DELAYED" as DerivedMarketStatus,
        message:
          "This is a particularly long message to test how the layout handles overflow or wrapping behavior within the allocated space.",
      },
    },
    isAddingCardInProgress: false,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};
