import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "_site/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
);
