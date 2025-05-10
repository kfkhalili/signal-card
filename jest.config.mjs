// jest.config.mjs
import nextJest from "next/jest.js"; // Use import

// Provide the path to your Next.js app to load next.config.js and .env files in your test environment
const createJestConfig = nextJest({
  dir: "./",
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"], // Your existing setup file
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    // Handle module aliases (like @/components)
    "^@/(.*)$": "<rootDir>/src/$1",
    // Handle CSS imports (if you import CSS modules in your components)
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig); // Use export default
