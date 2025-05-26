// eslint.config.mjs
import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

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

  // 4. Optional: Any custom rules or overrides for your project can go here.
  // {
  //   files: ["**/*.ts", "**/*.tsx"], // Apply only to TS/TSX files
  //   rules: {
  //     // Example: "@typescript-eslint/no-explicit-any": "warn",
  //   },
  // },

  // 5. Your global ignore patterns.
  //    This should be a standalone configuration object in the array.
  {
    ignores: [
      ".next/",
      "node_modules/",
      "supabase/", // Assuming this is a top-level directory you want to ignore
      "src/lib/supabase/database.types.ts",
      // "dist/", // If you have a build output folder
      // Add any other files or directories you want ESLint to ignore
    ],
  }
);
