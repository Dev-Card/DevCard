# Contributing to DevCard

[![Discord Server](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white&style=flat-square)](https://discord.gg/QueQN83wn)

**Join the community** — ask questions, get help, discuss ideas, and meet other contributors on our [Discord server](https://discord.gg/QueQN83wn).

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** & Docker Compose
- **React Native** dev environment — follow the [official setup guide](https://reactnative.dev/docs/environment-setup)


### Getting Started

```bash
# 1. Fork and clone the repo
git clone https://github.com/Dev-Card/DevCard.git
cd devcard

# 2. Install dependencies
pnpm install

# 3. Start PostgreSQL + Redis
docker compose up -d

# 4. Configure environment
cp .env.example .env
# Edit .env with your OAuth credentials

# 5. Run database migrations and seed
pnpm db:migrate
pnpm db:seed

# 6. Start development
pnpm dev:backend    # Backend API on :3000
pnpm dev:mobile     # React Native app
```

---

## Environment Configuration

The backend uses a **validated configuration module** (`apps/backend/src/config.ts`) that reads, validates, and types all environment variables at startup.

### Why this exists

Without validation, a server can boot silently with placeholder secrets from `.env.example`, then fail at runtime in ways that are hard to debug. The config module makes misconfiguration a **startup-time crash** with a clear, human-readable error instead of a mysterious runtime failure.

### How it works

1. On startup, `config.ts` reads every variable defined in `.env.example`.
2. Each variable is checked: it must be present, non-empty, not a placeholder value, and meet any security constraints (e.g. minimum length for secrets).
3. If **any** check fails the process exits immediately — before the server binds to a port — printing a message like:

```
╔══════════════════════════════════════════════════════════════╗
║         DevCard — Environment Configuration Error           ║
╚══════════════════════════════════════════════════════════════╝

The server cannot start because the following environment
variable(s) are missing, empty, or invalid:

  ✗  JWT_SECRET: looks like an unfilled placeholder. Replace it with a real value.
  ✗  DATABASE_URL: is required but was not set

How to fix:
  1. Copy .env.example to .env  →  cp .env.example .env
  2. Fill in every value listed above
  3. Restart the server
```

### Security constraints enforced at startup

| Variable | Constraint |
|---|---|
| `JWT_SECRET` | Minimum 32 characters |
| `ENCRYPTION_KEY` | Minimum 32 characters |
| All secrets | Must not match `.env.example` placeholder patterns (e.g. `your-…`, `…-here`) |
| `PORT` | Must be a valid integer between 1 and 65535 |
| `NODE_ENV` | Must be one of `development`, `production`, `test` |

### Rules for contributors

> **Never read `process.env` directly anywhere inside `apps/backend`.**

All configuration values must be imported from the config module:

```ts
// ❌ Forbidden — direct process.env access
const secret = process.env.JWT_SECRET;

// ✅ Correct — import from config
import { config } from "./config";
const secret = config.jwt.secret;
```

This rule is enforced by ESLint. A PR that introduces a direct `process.env` read in `apps/backend` will fail the lint check.

### Adding a new environment variable

1. Add the variable to `.env.example` with a clear placeholder and comment.
2. Add a corresponding field to the `AppConfig` interface in `config.ts`.
3. Parse and validate it in `buildConfig()` using the existing helper functions (`getString`, `getPort`, etc.).
4. Export it on the returned config object.
5. Add tests in `apps/backend/src/__tests__/config.test.ts` covering at least: missing value, empty value, and (if applicable) constraint violations.

---

## Running Tests

This project uses `pnpm` to run tests across different parts of the codebase.

#### Run all tests

```bash
pnpm -r test
```

#### apps/backend

The backend uses Vitest:

```bash
pnpm --filter @devcard/backend test
pnpm --filter @devcard/backend test:watch
```

#### apps/mobile

The mobile app uses Jest:

```bash
pnpm --filter @devcard/mobile test
```

#### apps/web

Currently, the web app does not define a test script.

#### packages/shared

The shared package does not include test scripts. It only provides linting and type checking.

## Project Structure

```
devcard/
├── apps/backend/     # Fastify API (TypeScript)
├── apps/mobile/      # React Native mobile app
├── apps/web/         # SvelteKit web backup
└── packages/shared/  # Shared types, utils, platform registry
```

## Coding Standards

- **TypeScript** for all new code
- **ESLint + Prettier** for formatting (run `pnpm lint` before committing)
- **Conventional Commits** for commit messages (`feat:`, `fix:`, `docs:`, `chore:`)
- Write tests for new features and bug fixes


## Pull Request Process

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes with clear, descriptive commits
3. Ensure all tests pass: `pnpm test`
4. Ensure linting passes: `pnpm lint`
5. Open a PR against `main` with a clear description of the change
6. Wait for review — maintainers will respond within 48 hours


## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Search existing issues before creating a new one


## Code of Conduct

Be kind, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

Thank you for helping make DevCard better! 🎉
