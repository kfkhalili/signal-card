import { defineConfig, devices } from "@playwright/test";
import type { Config } from "@playwright/test";

const baseURL = "http://localhost:3000";

const config: Config = {
  // Why: This points Playwright to the directory where your end-to-end tests are located.
  testDir: "./e2e",

  // Why: Defines how long a single test can run before it's considered timed out.
  timeout: 30 * 1000,

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: baseURL,
    trace: "on-first-retry",
  },

  // Why: This section automatically starts your Next.js development server
  // before the tests run, which is essential for end-to-end testing.
  webServer: [
    {
      command: "npm run dev",
      url: baseURL,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run storybook",
      url: "http://localhost:6006",
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
};

export default defineConfig(config);
