import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        setupFiles: './tests/setupTests.ts',
      },

//   // ... other configurations ...
//   test: {
//     root: "./src", // Set the root directory for resolving imports in tests
//     dir: "./tests", // Set the directory for finding test files
//     // ... other test configurations ...
//   },
});