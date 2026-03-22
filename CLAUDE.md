# SoCal Quiz Bot

## Project Overview

A Discord quiz bot that runs interactive, timed multiple-choice quizzes in Discord servers. The bot posts a question every 10 seconds with multiple-choice answers, tracks scores, and supports rich media (images, formatted text) in questions and answers.

The system has two parts:
- **Backend**: TypeScript Azure Functions handling Discord interactions, quiz orchestration, and a REST API for question management
- **Web Client**: Blazor WebAssembly app (`web_client/`) for editing question banks via a browser UI

## Architecture

- **Azure Functions v4** (Node.js programming model v4) — HTTP triggers for Discord interactions, OAuth relay, and question bank CRUD
- **Azure Durable Functions** — orchestrates quiz sessions (step-function style), advancing questions on a timer
- **Azure Table Storage** — stores question banks, guild data, quiz state
- **Azure Blob Storage** — stores question/explanation images, generates pre-signed URLs for Discord
- **Discord API** — slash commands and modal interactions via `@discordjs/rest` and `discord-api-types`, verified with `discord-verify`
- **Discord OAuth2** — users authenticate via Discord; guild ownership/roles gate access to question editing

## Tech Stack & Targets

- **TypeScript 5.9** — use latest features: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `isolatedModules`, `exactOptionalPropertyTypes`, iterator helpers, Set methods, inferred type predicates
- **Node.js 22** — target runtime for Azure Functions and CI (`.nvmrc` pins this)
- **ESM only** — `"type": "module"` in package.json, `NodeNext` module resolution
- **No enums, no parameter properties** — `erasableSyntaxOnly` enforced for Node.js native type-stripping compatibility
- **Vitest 4** — test runner, runs `.ts` files directly (no build step needed for tests)
- **ESLint 10 + Prettier** — linting and formatting
- **sharp** — image processing (replaced deprecated `gm`)

## Project Structure

```
src/
  functions/         # Azure Function HTTP triggers and orchestrator
  handlers/          # Business logic: bot service, quiz management, commands
    actions/         # Individual Discord slash commands
  util/              # Storage clients, auth, config, helpers
tests/
  unit/              # Vitest unit tests
  helpers/           # Test utilities (interaction generators, mocks)
web_client/          # Blazor WebAssembly question editor (C#/.NET 8)
main.bicep           # Azure infrastructure as code
```

## Key Commands

```bash
npm run build        # Compile TypeScript
npm test             # Run tests (vitest, no build step needed)
npm run coverage     # Run tests with coverage
npm start            # Start Azure Functions locally (builds first)
```

## Conventions

- Use `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
- Use `as const` objects + type unions instead of enums
- Use explicit field declarations instead of constructor parameter properties
- Use `crypto.randomUUID()` instead of uuid package
- Use `rm -rf` instead of rimraf
- Use iterator helpers (`.map()`, `.filter()`, `.toArray()`) on Map/Set iterators where applicable
- Use `Set.difference()`, `Set.intersection()` etc. for set operations
- Optional interface properties that may be explicitly set to undefined should use `?: T | undefined`

## Goals

The end goal is a polished Discord quiz system where:
1. Server admins authenticate via Discord OAuth and manage question banks through the web UI
2. Questions support rich media — images, formatted text, explanations with images
3. Quizzes run as durable orchestrations: a new question posts every 10 seconds with multiple-choice answers
4. Users answer via Discord interactions, scores are tracked and displayed
5. Access control is enforced — only users with appropriate Discord permissions/roles can add or edit questions
