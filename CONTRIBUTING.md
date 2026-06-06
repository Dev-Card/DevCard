# Contributing to DevCard

<p align="center">
  <a href="https://discord.gg/QueQN83wn">
    <img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white&style=flat-square" alt="Discord Server" />
  </a>
</p>

**Join the community** — ask questions, get help, discuss ideas, and meet other contributors on our [Discord server](https://discord.gg/QueQN83wn).

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10 (bundled with Node.js)
- **Docker** & Docker Compose
- **React Native** dev environment — follow the [official setup guide](https://reactnative.dev/docs/environment-setup)

### Getting Started

```bash
# 1. Fork and clone the repo
git clone https://github.com/Dev-Card/DevCard.git
cd devcard

# 2. Install dependencies
npm install                              # root (orchestrator)
npm --prefix packages/shared install     # shared types/utils
npm --prefix apps/backend install        # backend API
npm --prefix apps/web install            # web app
npm --prefix apps/mobile install         # mobile app (if working on mobile)

# 3. Start PostgreSQL + Redis
docker compose up -d

# 4. Configure environment
cp .env.example .env
# Edit .env with your OAuth credentials

# 5. Run database migrations and seed
npm run db:migrate
npm run db:seed

# 6. Start development
npm run dev:backend    # Backend API on :3000
npm run dev:mobile     # React Native app
```

### Running Tests

This project uses `npm` to run tests across different parts of the codebase.

#### Run all tests
To execute backend tests:
```bash
npm run test
```

#### apps/backend
The backend uses Vitest:
```bash
npm --prefix apps/backend run test
npm --prefix apps/backend run test:watch
```
#### apps/mobile
The mobile app uses Jest:
```bash
npm --prefix apps/mobile run test
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
- **ESLint + Prettier** for formatting (run `npm run lint` before committing)
- **Conventional Commits** for commit messages (`feat:`, `fix:`, `docs:`, `chore:`)
- Write tests for new features and bug fixes

## Pull Request Process

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes with clear, descriptive commits
3. Ensure all tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
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
