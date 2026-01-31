import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",

  // Resolve Deno bare specifiers when running supabase/functions tests in Node
  moduleNameMapper: {
    "^deno_dom$": "<rootDir>/supabase/functions/__tests__/deno_dom_shim.ts",
  },

  // Why: This tells Jest to ignore the directory containing Playwright tests,
  // preventing it from trying to run them.
  testPathIgnorePatterns: [
    "supabase/functions/__tests__/fetch-fmp-insider-transactions.test.ts", // Deno test, run separately
    "supabase/functions/__tests__/deno_dom_shim.ts", // Node shim for deno_dom, not a test
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/", // Ignore the e2e directory
  ],
};

export default createJestConfig(config);
