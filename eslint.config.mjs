// eslint.config.mjs
import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

// Import custom ESLint rules for TypeScript contracts
import enforceContract5StrictSchema from "./eslint-rules/enforce-contract-5-strict-schema.js";
import enforceContract6aContentLength from "./eslint-rules/enforce-contract-6a-content-length.js";
import enforceContract14SourceTimestamp from "./eslint-rules/enforce-contract-14-source-timestamp.js";

// This provides a __dirname equivalent in ES modules.
// It's important for FlatCompat to correctly resolve extended configurations.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname, // Ensures "next" and other extends are resolved from your project's node_modules
  // recommendedConfig: eslintJs.configs.recommended, // Not strictly needed here as 'next/core-web-vitals' includes it.
});

export default tseslint.config(
  // 1. ESLint's recommended base rules (good starting point)
  eslintJs.configs.recommended,

  // 2. Next.js specific configurations using FlatCompat
  //    "next/core-web-vitals" is generally recommended as it includes "next" and more.
  //    This will set up the necessary parser, plugins (React, Next.js, a11y), and Next.js specific rules.
  //    `compat.config()` returns an array, so it needs to be spread.
  ...compat.config({
    extends: ["next/core-web-vitals"],
  }),

  // 3. Your stricter TypeScript ESLint configurations.
  //    These will apply on top of (and potentially override) rules from `eslintJs.configs.recommended`
  //    and those included in "next/core-web-vitals".
  //    `tseslint.configs.strict` and `tseslint.configs.stylistic` are arrays of config objects.
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // 4. Custom ESLint rules for TypeScript contracts (Contract #5, #6a, #14)
  //    These rules enforce Sacred Contracts from MASTER-ARCHITECTURE.md
  //    They only apply to files in supabase/functions/lib/ to check data-fetching functions
  {
    files: ["supabase/functions/lib/**/*.ts"],
    plugins: {
      "tickered-contracts": {
        meta: {
          name: "tickered-contracts",
          version: "1.0.0",
        },
        rules: {
          "enforce-contract-5-strict-schema": enforceContract5StrictSchema,
          "enforce-contract-6a-content-length": enforceContract6aContentLength,
          "enforce-contract-14-source-timestamp": enforceContract14SourceTimestamp,
        },
      },
    },
    rules: {
      "tickered-contracts/enforce-contract-5-strict-schema": "error",
      "tickered-contracts/enforce-contract-6a-content-length": "error",
      "tickered-contracts/enforce-contract-14-source-timestamp": "warn",
    },
  },

  // 5. Your global ignore patterns.
  //    This should be a standalone configuration object in the array.
  {
    ignores: [
      ".next/",
      "node_modules/",
      "supabase/migrations/", // Ignore SQL migration files
      "supabase/functions/**/*.json", // Ignore Deno config files
      "supabase/functions/**/*.lock", // Ignore lock files
      "src/lib/supabase/database.types.ts",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      // "dist/", // If you have a build output folder
      // Add any other files or directories you want ESLint to ignore
    ],
  }
);
