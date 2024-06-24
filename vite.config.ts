import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        root: './',
        setupFiles: './tests/setupTests.ts',
        coverage: {
            include: ['**/src/**'],
            reporter: process.env.GITHUB_ACTIONS ? ['html', 'json'] : ['json'],
            reportsDirectory: './coverage',
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