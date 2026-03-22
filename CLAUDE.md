# SoCal Quiz Bot

## Project Overview

A Discord quiz bot that runs interactive, timed multiple-choice quizzes in Discord servers. The bot posts a question every 10 seconds with multiple-choice answers, tracks scores, and supports rich media (images, formatted text) in questions and answers.

The system has two parts:
- **Backend**: TypeScript Azure Functions handling Discord interactions, quiz orchestration, and a REST API for question management
- **Web Client**: React + Vite SPA (`web_client/`) for editing question banks via a browser UI, using shadcn/ui + Tailwind CSS

## Architecture

- **Azure Functions v4** (Node.js programming model v4) — HTTP triggers for Discord interactions, OAuth relay, and question bank CRUD
- **Azure Durable Functions** — orchestrates quiz sessions (step-function style), advancing questions on a timer
- **Azure Table Storage** — stores question banks, guild data, quiz state
- **Azure Blob Storage** — stores question/explanation images, generates pre-signed URLs for Discord
- **Discord API** — slash commands and modal interactions via `@discordjs/rest` and `discord-api-types`, verified with `discord-verify`
- **Discord OAuth2** — users authenticate via Discord; guild ownership/roles gate access to question editing
- **Azure Static Web Apps** — hosts the web client (free tier), with built-in API proxy to Azure Functions

## Tech Stack & Targets

- **TypeScript 5.9** — use latest features: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `isolatedModules`, `exactOptionalPropertyTypes`, iterator helpers, Set methods, inferred type predicates
- **Node.js 22** — target runtime for Azure Functions and CI (`.nvmrc` pins this)
- **nvm** — used for Node.js version management; run `nvm use` before any npm commands
- **ESM only** — `"type": "module"` in package.json, `NodeNext` module resolution
- **No enums, no parameter properties** — `erasableSyntaxOnly` enforced for Node.js native type-stripping compatibility
- **Vitest 4** — test runner, runs `.ts` files directly (no build step needed for tests)
- **ESLint 10 + Prettier** — linting and formatting
- **sharp** — image processing (replaced deprecated `gm`)
- **React 19 + Vite** — web client SPA framework
- **shadcn/ui + Tailwind CSS 4** — web client UI components and styling
- **TanStack Query + TanStack Table** — data fetching/caching and data grid for web client
- **React Hook Form + Zod** — form handling and validation for web client

## Project Structure

```
src/
  functions/         # Azure Function HTTP triggers and orchestrator
  handlers/          # Business logic: bot service, quiz management, commands
    actions/         # Individual Discord slash commands
  util/              # Storage clients, auth, config, helpers
shared/              # Shared TypeScript interfaces (used by both backend and web client)
tests/
  unit/              # Vitest unit tests
  helpers/           # Test utilities (interaction generators, mocks)
web_client/          # React + Vite question editor SPA
  src/
    api/             # API client, TanStack Query hooks
    auth/            # Discord OAuth2 PKCE flow, auth context
    components/      # Reusable UI components
    pages/           # Route pages
main.bicep           # Azure infrastructure as code
```

## Key Commands

```bash
# Always run nvm use first to ensure correct Node.js version
nvm use

# Backend
npm run build        # Compile TypeScript
npm test             # Run tests (vitest, no build step needed)
npm run coverage     # Run tests with coverage
npm start            # Start Azure Functions locally (builds first)

# Web Client
cd web_client
npm run build        # TypeScript check + Vite production build
npm run dev          # Start Vite dev server with API proxy to localhost:7071
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
- Shared types between backend and web client live in `shared/` — backend re-exports them from `src/*.interfaces.ts`

## Goals

The end goal is a polished Discord quiz system where:
1. Server admins authenticate via Discord OAuth and manage question banks through the web UI
2. Questions support rich media — images, formatted text, explanations with images
3. Quizzes run as durable orchestrations: a new question posts every 10 seconds with multiple-choice answers
4. Users answer via Discord interactions, scores are tracked and displayed
5. Access control is enforced — only users with appropriate Discord permissions/roles can add or edit questions
