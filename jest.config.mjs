// jest.config.mjs
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^lucide-react$": "<rootDir>/__mocks__/lucide-react.tsx", // This line is key
  },
  transformIgnorePatterns: [
    "/node_modules/", // Keep lucide-react transformed by not including it in the negative lookahead
    "^.+\\.module\\.(css|sass|scss)$",
  ],
  // Or, if you had other modules needing transformation:
  // transformIgnorePatterns: [
  //   "/node_modules/(?!another-esm-module)/",
  //   '^.+\\.module\\.(css|sass|scss)$',
  // ],
};

export default createJestConfig(customJestConfig);
