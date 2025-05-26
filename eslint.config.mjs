// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Your existing configurations:
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,

  // Add a new configuration object specifically for ignores:
  {
    ignores: [
      ".next/", // Ignores the .next directory
      "node_modules/", // Ignores the node_modules directory
      "supabase/", // Ignores the supabase directory (assuming it's in the root)
      "src/lib/supabase/database.types.ts",
      // You can also use glob patterns like:
      // ".next/**",
      // "node_modules/**",
      // "supabase/**",
      // "dist/", // Example: if you have a build output directory
    ],
  }
);
