import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import jsdoc from "eslint-plugin-jsdoc";

export default tseslint.config(
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,

  // Type-checked strict + stylistic presets (the strongest available)
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Tell the parser where to find tsconfig for type-aware linting
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // JSDoc plugin — enforce @param and @returns on all public/exported items
  jsdoc.configs["flat/recommended-typescript-error"],

  // Custom rule overrides — all errors, no warnings
  {
    plugins: { jsdoc },
    rules: {
      // ── Unused vars ──
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // ── Explicit types ──
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],

      // ── JSDoc enforcement ──
      // Require JSDoc on all exported functions, classes, and methods
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          publicOnly: true,
          checkConstructors: true,
          checkGetters: true,
          checkSetters: true,
        },
      ],
      // Require @param for every function parameter with a description
      "jsdoc/require-param": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-param-type": "off", // TypeScript handles types
      // Require @returns for all functions including async, with description
      "jsdoc/require-returns": ["error", { forceReturnsWithAsync: true }],
      "jsdoc/require-returns-description": "error",
      "jsdoc/require-returns-type": "off", // TypeScript handles types
      // Require @yields for generator functions
      "jsdoc/require-yields": "error",
      // Validate that @param names match actual parameters
      "jsdoc/check-param-names": "error",
      // Validate tag names
      "jsdoc/check-tag-names": "error",
      // No types in JSDoc (TypeScript provides them)
      "jsdoc/no-types": "error",
      // Don't require @throws tags (TypeScript has no checked exceptions)
      "jsdoc/require-throws": "off",
      // Tag line spacing
      "jsdoc/tag-lines": ["error", "any", { startLines: 1 }],

      // ── Strict overrides — relax only what truly conflicts with project patterns ──
      // Allow non-null assertions (used with Discord API types)
      "@typescript-eslint/no-non-null-assertion": "error",
      // Allow void expressions for fire-and-forget patterns like navigate()
      "@typescript-eslint/no-confusing-void-expression": "off",
      // Allow empty functions for abstract base class stubs
      "@typescript-eslint/no-empty-function": "off",
      // Restrict any usage
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-explicit-any": "error",
      // Floating promises
      "@typescript-eslint/no-floating-promises": "error",
      // Misused promises (passing async where sync expected)
      "@typescript-eslint/no-misused-promises": "error",
      // Prefer nullish coalescing
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      // Unnecessary type assertions
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // Unnecessary conditions (always true/false)
      "@typescript-eslint/no-unnecessary-condition": "error",
      // Restrict template expressions to string-coercible types
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },

  // Ignore dist output and node_modules
  { ignores: ["dist/", "node_modules/", "web_client/"] },
);
