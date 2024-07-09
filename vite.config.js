"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        root: './',
        testTimeout: 999999,
        setupFiles: './tests/setupTests.ts',
        coverage: {
            include: ['**/src/**'],
            reporter: ['cobertura', 'text'],
            reportsDirectory: './coverage',
            provider: 'v8',
            exclude: [
                '**/*.d.ts',
                '**/*.interfaces.ts', // Exclude your interfaces file
            ],
        },
    },
    resolve: {
        alias: {
            '@src': '/src'
        }
    }
    //   // ... other configurations ...
    //   test: {
    //     root: "./src", // Set the root directory for resolving imports in tests
    //     dir: "./tests", // Set the directory for finding test files
    //     // ... other test configurations ...
    //   },
});
