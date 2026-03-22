import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@src": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "dist/**",
        "node_modules/**",
        "web_client/**",
        "tests/**",
        "shared/**",
        "src/util/mapExtensions.ts",
        "**/*.interfaces.ts",
      ],
      reporter: ["text", "lcov"],
      all: true,
    },
  },
});
