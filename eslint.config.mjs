// eslint.config.mjs

import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignore common folders like node_modules and dist
  {
    ignores: ["node_modules", "dist"],
  },

  // Main linting rules for all JS files
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest, // ✅ Allow Jest globals like describe, test, expect
      },
    },
  },

  // Treat all .js files as CommonJS modules (for require/module.exports)
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
]);
