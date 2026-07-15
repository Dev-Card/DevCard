# Contributing to DevCard

Thank you for your interest in contributing to **DevCard**! DevCard is an open-source developer profile exchange platform that aggregates your developer profiles into a single shareable QR code.

By contributing, you help make networking easier and more accessible for developers around the world. Please take a moment to review this guide before getting started.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Local Setup](#local-setup)
4. [Branch Naming Conventions](#branch-naming-conventions)
5. [Pull Request Process & Checklist](#pull-request-process--checklist)
6. [Issue Labels Guide](#issue-labels-guide)
7. [Coding Standards](#coding-standards)

---

## Project Overview

DevCard is structured as a monorepo containing the web frontend, mobile frontend, backend API, and a shared packages library.

```text
devcard/
├── apps/
│   ├── backend/          # Fastify API (TypeScript, Prisma ORM, Vitest)
│   ├── mobile/           # React Native mobile app (Bare Workflow, Jest)
│   └── web/              # React + Vite web app (TypeScript, ESLint)
├── packages/
│   └── shared/           # Shared types, platform registry, and utility functions
├── docker/               # Docker files and configurations
├── docker-compose.yml    # Runs PostgreSQL and Redis services
└── package.json          # Root orchestrator (npm scripts to run workspace tasks)
```

---

## Prerequisites

To run DevCard locally, you will need the following installed:

*   **Node.js**: `v20.x` or `v22.x` (Long Term Support recommended)
*   **npm**: `v10.x` or higher (usually bundled with Node.js)
*   **Docker & Docker Compose**: Used to run PostgreSQL 16 and Redis 7 databases locally.
*   **React Native / Mobile Environment**:
    *   **React Native CLI** (Bare workflow environment setup) — follow the [official React Native setup guide](https://reactnative.dev/docs/environment-setup) for your OS (Android Studio / Xcode).
    *   **Expo CLI** (if doing secondary Expo testing or building). Note that the primary mobile app in `apps/mobile` is a bare React Native project.
*   **Backend Runtime & Tools**:
    *   **PostgreSQL**: (Provided via Docker)
    *   **Redis**: (Provided via Docker)

---

## Local Setup

Follow these step-by-step instructions to get the project running on your local machine:

### 1. Clone the Repository
Fork the repository on GitHub, then clone your fork:
```bash
git clone https://github.com/YOUR-USERNAME/DevCard.git
cd DevCard
```

### 2. Install Dependencies
Install all package dependencies from the root directory. This will install dependencies for all monorepo workspaces:
```bash
npm install
```

### 3. Start Database and Cache Services
Run Docker Compose to start PostgreSQL and Redis in the background:
```bash
docker compose up -d
```

### 4. Configure Environment Variables
Copy the template `.env.example` in the root (or `apps/backend`) to `.env` inside `apps/backend/`:
```bash
cp .env.example apps/backend/.env
```
Open `apps/backend/.env` and generate the required secure secrets:
*   **JWT_SECRET**: Generate using:
    ```bash
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    ```
*   **ENCRYPTION_KEY**: Generate using:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
Paste these values into `apps/backend/.env`.

### 5. Run Database Migrations and Seed
Initialize your PostgreSQL database schemas and seed it with dummy developer profiles:
```bash
# Run migrations
npm run db:migrate

# Seed sample database data
npm run db:seed
```

### 6. Run the Applications

You can run individual parts of the project from the root directory using the following orchestrator scripts:

*   **Run Backend API**:
    ```bash
    npm run dev:backend
    ```
    This starts the Fastify server (usually listening on `http://localhost:3000`).
*   **Run Web App**:
    ```bash
    npm run dev:web
    ```
    This starts the Vite-powered React web dashboard.
*   **Run Mobile App**:
    Make sure your Android Emulator or iOS Simulator is running, then execute:
    ```bash
    npm run dev:mobile
    ```
    And in another terminal window to launch on Android:
    ```bash
    npm run android
    ```

---

## Branch Naming Conventions

We enforce prefix-based branch naming to keep the repository history organized. When creating a branch, use one of the following prefix structures:

*   `feat/` — For new features or additions (e.g., `feat/add-github-oauth`)
*   `fix/` — For bug fixes and patches (e.g., `fix/event-organizer-id`)
*   `docs/` — For updates to documentation or guides (e.g., `docs/contributing-guide`)
*   `chore/` — For build processes, dependency updates, or tool configurations (e.g., `chore/upgrade-prisma`)

Use hyphens to separate words (kebab-case) and keep names concise.

---

## Pull Request Process & Checklist

When you are ready to submit your changes, follow this process:

### 1. PR Checklist
Before opening a Pull Request, please ensure you satisfy the following checklist:
- [ ] Code compiles and builds without errors.
- [ ] Linting passes: Run `npm run lint` from the root.
- [ ] Tests pass: Run `npm run test` (Vitest backend tests) and ensure zero failures.
- [ ] Your branch name matches our [Branch Naming Conventions](#branch-naming-conventions).
- [ ] Your commits use clear descriptions and follow [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat(auth): add GitHub login flow`).
- [ ] You have updated/added tests for any new features or bug fixes.
- [ ] Documentation has been updated if applicable.

### 2. Submitting the PR
1. Push your branch to your GitHub fork:
   ```bash
   git push origin branch-name
   ```
2. Navigate to the main [DevCard Repository](https://github.com/Dev-Card/DevCard) and click **New Pull Request**.
3. Choose your fork and branch, write a clear title and description outlining:
    *   What problem does this PR solve?
    *   How was it resolved?
    *   Any testing steps or verification done.
4. Submit the PR and wait for a review from the maintainers. Reviews are usually conducted within 24–48 hours.

---

## Issue Labels Guide

We use specific labels to categorize and track issues. Here is a guide to what they mean:

*   `good-first-issue` — Welcoming issues for newcomers or first-time contributors. Usually has clear instructions.
*   `bug` — A reproducible issue or error in the codebase.
*   `enhancement` — A request for new features, optimizations, or enhancements.
*   `documentation` — Work related to writing or updating READMEs, guides, or code docstrings.
*   `help wanted` — Extra attention or specific expertise is requested to solve the issue.
*   `gssoc24` / `hacktoberfest` — Labels indicating participation in open-source programs like GirlScript Summer of Code or Hacktoberfest.

---

## Coding Standards

*   **TypeScript**: Use static typing wherever possible. Avoid using `any` and define proper interfaces/types.
*   **Formatting**: We use ESLint and Prettier for code style consistency. Run `npm run lint` or format files directly in your IDE before committing.
*   **Migrations**: Do not modify existing Prisma migrations. Create new migrations via `prisma migrate dev` if you modify `schema.prisma`.

---

Thank you for contributing to DevCard! 🚀
