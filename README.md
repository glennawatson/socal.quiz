[![codecov](https://codecov.io/gh/glennawatson/socal.quiz/graph/badge.svg?token=A97VS6OVIP)](https://codecov.io/gh/glennawatson/socal.quiz)
[![Deploy Discord Quiz Bot](https://github.com/glennawatson/socal.quiz/actions/workflows/deploy.yml/badge.svg)](https://github.com/glennawatson/socal.quiz/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/glennawatson/socal.quiz/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/glennawatson/socal.quiz/actions/workflows/github-code-scanning/codeql)

# SoCal Quiz Bot

An interactive Discord quiz bot that runs timed multiple-choice quizzes in Discord servers. Questions are posted on a timer with multiple-choice answers, scores are tracked per user, and rich media (images, formatted text) is supported in both questions and explanations. Server admins manage question banks through a companion web UI.

## Architecture

| Component | Technology |
|---|---|
| Backend | TypeScript, Azure Functions v4 (Node.js programming model v4) |
| Quiz orchestration | Azure Durable Functions (step-function style timer-based flow) |
| Data storage | Azure Table Storage (question banks, guild data, quiz state) |
| Image storage | Azure Blob Storage (question/explanation images, pre-signed URLs) |
| Discord integration | `@discordjs/rest`, `discord-api-types`, `discord-verify` |
| Auth | Discord OAuth2 (PKCE flow), guild ownership/role gating |
| Web client | React 19, Vite, shadcn/ui, Tailwind CSS 4, TanStack Query + Table, React Hook Form + Zod |
| Hosting | Azure Static Web Apps (web client), Azure Functions (API) |
| Infrastructure | Bicep (`main.bicep`) |
| Image processing | sharp |
| Testing | Vitest 4 |
| Linting | ESLint 10 + Prettier |

## Discord Slash Commands

| Command | Description |
|---|---|
| `/start_quiz` | Start a quiz from a question bank (auto or manual advance mode) |
| `/stop_quiz` | Stop the current quiz |
| `/next_question` | Show the next quiz question (manual mode) |
| `/add_question_to_bank` | Add a question to a question bank (opens a modal) |
| `/edit_question` | Edit an existing question in a question bank |
| `/delete_question_from_bank` | Delete a specific question from a question bank |
| `/delete_question_bank` | Delete an entire question bank |

## Prerequisites

- Node.js v22 (see `.nvmrc`; use `nvm use` to activate)
- Azure account (Azure Functions + Azure Storage)
- Discord application with bot token and slash commands configured

## Setup

### Install dependencies

```bash
nvm use
npm install
cd web_client && npm install
```

### Environment variables

Create a `.env` file in the root directory:

```env
DISCORD_BOT_TOKEN=<your_discord_bot_token>
DISCORD_CLIENT_ID=<your_discord_client_id>
DISCORD_CLIENT_SECRET=<your_discord_client_secret>
DISCORD_PUBLIC_KEY=<your_discord_public_key>
AZURE_STORAGE_CONNECTION_STRING=<your_azure_storage_connection_string>
AZURE_STORAGE_ACCOUNT_KEY=<your_azure_storage_account_key>
AZURE_STORAGE_ACCOUNT_NAME=<your_azure_storage_account_name>
CLIENT_ID=<oauth_client_id>
CLIENT_SECRET=<oauth_client_secret>
REDIRECT_URI=<oauth_redirect_uri>
```

For local development, Azure Functions also uses `local.settings.json` (gitignored).

### Run locally

```bash
# Backend (Azure Functions on http://localhost:7071)
npm start

# Web client (Vite dev server with API proxy to localhost:7071)
cd web_client
npm run dev
```

### Build

```bash
# Backend
npm run build

# Web client
cd web_client
npm run build
```

### Test

```bash
npm test             # Run tests
npm run coverage     # Run tests with coverage
```

## Project Structure

```
src/
  functions/           Azure Function HTTP triggers and orchestrator
  handlers/            Business logic: bot service, quiz management, commands
    actions/           Individual Discord slash commands
  util/                Storage clients, auth, config, helpers
shared/                Shared TypeScript interfaces (backend + web client)
tests/
  unit/                Vitest unit tests
  helpers/             Test utilities (interaction generators, mocks)
web_client/            React + Vite question editor SPA
  src/
    api/               API client, TanStack Query hooks
    auth/              Discord OAuth2 PKCE flow, auth context
    components/        Reusable UI components
    pages/             Route pages
main.bicep             Azure infrastructure as code
```

## CI/CD

- **GitHub Actions** runs tests, linting, and deploys to Azure on push to `main`
- **CodeQL** scans for security vulnerabilities
- **Codecov** tracks test coverage

## Deployment

Infrastructure is defined in `main.bicep`. The Azure Functions backend and Azure Static Web Apps frontend are deployed via the GitHub Actions workflow in `.github/workflows/deploy.yml`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
