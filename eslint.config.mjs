import js from "@eslint/js";
import router from "@tanstack/eslint-plugin-router";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    ".output/**",
    ".wrangler/**",
    ".tanstack/**",
    "dist/**",
    "src/generated/**",
    "src/routeTree.gen.ts",
    "public/release-notes/**",
    "artifacts/**",
    "worker-configuration.d.ts",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  // Catches createFileRoute property-order mistakes that silently break type
  // inference rather than erroring.
  ...router.configs["flat/recommended"],
  {
    settings: { react: { version: "detect" } },
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["scripts/**/*.ts", "src/domain/**", "src/server/**", "*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
]);
