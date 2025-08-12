// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules", "dist"], // 👈 keep ignoring build folders
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest, // 👈 added so Jest globals (describe/test/expect) are recognized
      },
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" }, // 👈 from lab config
  },
  // 👇 Also include the full @eslint/js recommended flat config (from lab code)
  js.configs.recommended,
]);
