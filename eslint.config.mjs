import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import html from "eslint-plugin-html";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
    {
        ignores: ["node_modules/**", "playwright-report/**", "test-results/**"],
    },
    {
        files: ["**/*.js"],
        extends: [js.configs.recommended],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        files: ["**/*.html"],
        extends: [js.configs.recommended],
        plugins: {
            html,
        },
        languageOptions: {
            sourceType: "module",
            globals: {
                ...globals.browser,
                vegaEmbed: "readonly",
            },
        },
    },
    {
        files: ["**/*.ts"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            globals: globals.node,
        },
    },
);
