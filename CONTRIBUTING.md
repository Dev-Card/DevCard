# Contributing to DevCard

Thank you for your interest in contributing to DevCard! This guide will help you get started.

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

### Running Tests

This project uses `pnpm` to run tests across different parts of the codebase.

#### Run all tests
To execute all available tests:
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

## Self-Assigning Issues & PRs

You can assign yourself (or another contributor) to any open issue or pull request by posting a comment with the `/assign` command — no maintainer action required.

| Command | Effect |
|---|---|
| `/assign` | Assigns **you** (the commenter) to the issue/PR |
| `/assign @username` | Assigns the specified GitHub **@username** |

**Examples:**

```
/assign
```
```
/assign @octocat
```

The bot will reply with a confirmation comment (or an error message if the username is invalid, the user is already assigned, or the account lacks repo access).

> **Note:** Bot accounts cannot be assigned. Duplicate assignments are silently prevented.

---

## Pull Request Process

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Self-assign the related issue with `/assign` so others know you're working on it
3. Make your changes with clear, descriptive commits
4. Ensure all tests pass: `pnpm test`
5. Ensure linting passes: `pnpm lint`
6. Open a PR against `main` with a clear description of the change
7. Wait for review — maintainers will respond within 48 hours

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Search existing issues before creating a new one
- Use `/assign` on an issue you plan to fix so work isn't duplicated

## Code of Conduct

Be kind, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

Thank you for helping make DevCard better! 🎉
