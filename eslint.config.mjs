// eslint.config.mjs
import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

// Import custom ESLint rules for TypeScript contracts
import enforceContract5StrictSchema from "./eslint-rules/enforce-contract-5-strict-schema.js";
import enforceContract6aContentLength from "./eslint-rules/enforce-contract-6a-content-length.js";
import enforceContract14SourceTimestamp from "./eslint-rules/enforce-contract-14-source-timestamp.js";

export default tseslint.config(
  // 1. ESLint's recommended base rules
  eslintJs.configs.recommended,

  // 2. Next.js Core Web Vitals configuration (manual flat config)
  //    This replaces FlatCompat to avoid circular dependency issues
  {
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      // Next.js recommended rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // React recommended rules
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      // React Hooks rules
      ...reactHooksPlugin.configs.recommended.rules,
      // JSX A11y rules
      ...jsxA11yPlugin.configs.recommended.rules,
      // Disable prop-types since we use TypeScript
      "react/prop-types": "off",
      // Allow component creation during render for dynamic renderers (GameCard pattern)
      "react-hooks/static-components": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
      next: {
        rootDir: ".",
      },
    },
  },

  // 3. TypeScript ESLint configurations
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

  // 5. Node.js scripts configuration
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
      },
    },
  },

  // 6. Global ignore patterns
  {
    ignores: [
      ".next/",
      "node_modules/",
      "storybook-static/", // Built Storybook output, not source
      "supabase/migrations/", // Ignore SQL migration files
      "supabase/functions/**/*.json", // Ignore Deno config files
      "supabase/functions/**/*.lock", // Ignore lock files
      "src/lib/supabase/database.types.ts",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
    ],
  }
);
