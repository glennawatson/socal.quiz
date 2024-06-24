import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        setupFiles: './tests/setupTests.ts',
        coverage: {
          provider: 'v8',
          exclude: [
            '**/*.d.ts',
            '**/*.interfaces.ts', // Exclude your interfaces file
          ],
        },
      },
//   // ... other configurations ...
//   test: {
//     root: "./src", // Set the root directory for resolving imports in tests
//     dir: "./tests", // Set the directory for finding test files
//     // ... other test configurations ...
//   },
});