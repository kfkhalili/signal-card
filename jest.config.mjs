import { readdirSync, readFileSync } from "node:fs";
import nextJest from "next/jest.js";

// Edge-function tests that call Deno.test run under Deno (`npm run test:deno`),
// not Jest: they import https:// and npm: specifiers Node cannot load. Found by
// content so a new Deno test never needs listing here.
const EDGE_FUNCTIONS_DIR = "supabase/functions";
const denoTestPatterns = readdirSync(EDGE_FUNCTIONS_DIR, { recursive: true })
  .map((file) => `${EDGE_FUNCTIONS_DIR}/${file}`)
  .filter((path) => path.endsWith(".test.ts"))
  .filter((path) => readFileSync(path, "utf8").includes("Deno.test("))
  .map((path) => `<rootDir>/${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",

  // Resolve application aliases and Deno specifiers in Node-based tests.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^deno_dom$": "<rootDir>/supabase/functions/__tests__/deno_dom_shim.ts",
  },

  // Why: This tells Jest to ignore the directory containing Playwright tests,
  // preventing it from trying to run them.
  testPathIgnorePatterns: [
    ...denoTestPatterns,
    "supabase/functions/__tests__/deno_dom_shim.ts", // Node shim for deno_dom, not a test
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/", // Ignore the e2e directory
  ],
};

export default createJestConfig(config);
