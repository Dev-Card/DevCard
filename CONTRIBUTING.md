# Contributing to DevCard

<p align="center">
  <a href="https://discord.gg/QueQN83wn">
    <img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white&style=flat-square" alt="Discord Server" />
  </a>
</p>

**Join the community** — ask questions, get help, discuss ideas, and meet other contributors on our [Discord server](https://discord.gg/QueQN83wn).

## Development Setup

### Prerequisites

- **Node.js** >= 18
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
The web app has a no-op test script (no tests yet).

#### packages/shared
The shared package uses Vitest:
```bash
pnpm --filter @devcard/shared test
```

## Project Structure

```
devcard/
├── apps/backend/     # Fastify API (TypeScript)
├── apps/mobile/      # React Native mobile app
├── apps/web/         # SvelteKit web backup
└── packages/shared/  # Shared types, utils, platform registry
```

## CI / Pipeline

Every push to `main` and every pull request triggers the CI pipeline defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

The pipeline runs on Node.js 18 and 20 and executes these checks across all workspace packages:

| Step | Command |
|------|---------|
| Install | `pnpm install --frozen-lockfile` |
| Type check | `pnpm -r --if-present run typecheck` |
| Lint | `pnpm -r --if-present run lint` |
| Test | `pnpm -r --if-present run test` |
| Upload coverage | Artifacts uploaded from `**/coverage/` |

Before opening a PR, make sure these all pass locally:

```bash
pnpm -r --if-present run typecheck
pnpm -r --if-present run lint
pnpm -r --if-present run test
```

### PR Title Requirement

PR titles are validated against the [Conventional Commits](https://www.conventionalcommits.org/) spec by [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml).

Your PR title **must** start with one of these prefixes:

`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:`, `revert:`

Examples of valid PR titles:
- `feat: add QR code sharing screen`
- `fix: correct card deletion 404 response`
- `chore: update dependencies`

## Coding Standards

- **TypeScript** for all new code
- **ESLint + Prettier** for formatting (run `pnpm lint` before committing)
- **Conventional Commits** for commit messages (`feat:`, `fix:`, `docs:`, `chore:`)
- Write tests for new features and bug fixes

## Pull Request Process

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes with clear, descriptive commits
3. Ensure all checks pass locally (see [CI / Pipeline](#ci--pipeline) above)
4. Open a PR against `main` — the title must follow Conventional Commits format
5. Wait for review — maintainers will respond within 48 hours

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Search existing issues before creating a new one

## Code of Conduct

Be kind, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

Thank you for helping make DevCard better! 🎉
