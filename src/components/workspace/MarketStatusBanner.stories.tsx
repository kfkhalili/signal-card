// src/components/workspace/MarketStatusBanner.stories.tsx
import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import MarketStatusBanner from "./MarketStatusBanner";
import type { MarketStatusBannerProps } from "./MarketStatusBanner";

const meta: Meta<MarketStatusBannerProps> = {
  title: "Workspace/MarketStatusBanner",
  component: MarketStatusBanner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    uniqueSymbolsInWorkspace: ["AAPL", "GOOGL"],
    marketStatuses: {
      AAPL: {
        status: "Open",
        message: "Real-time",
        openingTime: "09:30",
        closingTime: "16:00",
        timezone: "America/New_York",
      },
      GOOGL: {
        status: "Delayed",
        message: "15 min delay",
        openingTime: "09:30",
        closingTime: "16:00",
        timezone: "America/New_York",
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

type Story = StoryObj<MarketStatusBannerProps>;

const Template: Story = {
  render: (args) => (
    <div style={{ width: "450px" }}>
      <MarketStatusBanner {...args} />
    </div>
  ),
};

export const Default: Story = {
  ...Template,
};

export const ClosedWithTimes: Story = {
  ...Template,
  args: {
    uniqueSymbolsInWorkspace: ["LSE.L"],
    marketStatuses: {
      "LSE.L": {
        status: "Closed",
        message: "Market is Closed.",
        openingTime: "08:00",
        closingTime: "16:30",
        timezone: "Europe/London",
      },
    },
    isAddingCardInProgress: false,
  },
};

export const MixedStatuses: Story = {
  ...Template,
  args: {
    uniqueSymbolsInWorkspace: ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA"],
    marketStatuses: {
      AAPL: {
        status: "Open",
        message: null,
        openingTime: "09:30",
        closingTime: "16:00",
        timezone: "America/New_York",
      },
      GOOGL: {
        status: "Delayed",
        message: "Data is 15 mins delayed",
        openingTime: "09:30",
        closingTime: "16:00",
        timezone: "America/New_York",
      },
      MSFT: {
        status: "Closed",
        message: "Market closed",
        openingTime: "09:30",
        closingTime: "16:00",
        timezone: "America/New_York",
      },
      AMZN: {
        status: "Error",
        message: "Connection failed",
        openingTime: null,
        closingTime: null,
        timezone: null,
      },
    },
    isAddingCardInProgress: false,
  },
};

export const Holiday: Story = {
  ...Template,
  args: {
    uniqueSymbolsInWorkspace: ["TSLA"],
    marketStatuses: {
      TSLA: {
        status: "Holiday",
        message: "Market Closed (Holiday: Juneteenth)",
        openingTime: "09:30",
        closingTime: "16:00",
        timezone: "America/New_York",
      },
    },
    isAddingCardInProgress: false,
  },
};

export const Initializing: Story = {
  ...Template,
  args: {
    uniqueSymbolsInWorkspace: ["MSFT", "AMZN", "NVDA"],
    marketStatuses: {},
    isAddingCardInProgress: false,
  },
};
