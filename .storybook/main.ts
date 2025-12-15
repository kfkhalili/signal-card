// This file has been automatically migrated to valid ESM format by Storybook.
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  core: {
    disableTelemetry: true,
  },
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-docs"
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {
      nextConfigPath: resolve(__dirname, '../next.config.ts'),
    },
  },
  // Storybook 10.1.8 has native Next.js 16 support, no workarounds needed
};
export default config;
