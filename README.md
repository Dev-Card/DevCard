<p align="center">
  <h1 align="center">DevCard</h1>
  <p align="center"><strong>One Tap. Every Profile. Every Platform.</strong></p>
  <p align="center">Open Source Developer Profile Exchange Platform</p>
  <p align="center">
    <a href="https://github.com/Dev-Card/DevCard">
      <img src="https://img.shields.io/badge/GitHub-Dev--Card%2FDevCard-blue?logo=github&style=flat-square" alt="GitHub Repo" />
    </a>
  </p>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## The Problem

At every developer meetup, hackathon, or conference, the same friction plays out:

> *"What's your LinkedIn?"* → open LinkedIn, search, send request  
> *"Do you have GitHub?"* → open GitHub, search, follow  
> *"Are you on Twitter?"* → open Twitter, search, follow

Each exchange is manual, error-prone, and slow. DevCard fixes this.

## The Solution

**DevCard** aggregates all your developer profiles into a single shareable QR code. The receiver opens one screen and can follow/connect on every platform — without switching apps.

## Features

- 🔗 **Universal Profile Aggregation** — GitHub, LinkedIn, Twitter/X, GitLab, Devfolio, and 10+ more platforms
- 📱 **QR Code Sharing** — Show your QR, they scan, done
- ⚡ **One-Screen Multi-Platform Connect** — Follow on GitHub, Connect on LinkedIn, all from one card
- 📈 **Advanced Analytics** — Track who viewed your card, when, and from where (Web, QR, App)
- 🔌 **Per-Platform OAuth Integrations** — Securely connect accounts for "Silent Follows"
- 🎯 **Context Cards** — Different cards for different situations (Professional, Hackathon, Community)
- 🌐 **Web Backup** — Receivers don't need the app — works in any browser
- 🔒 **Privacy-First** — No tracking, no data selling, your data stays yours
- 🛠️ **Open Source** — Apache 2.0 licensed, community-governed

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose
- React Native development environment ([setup guide](https://reactnative.dev/docs/environment-setup))

### Development Setup

```bash
# Clone the repo
git clone https://github.com/Dev-Card/DevCard.git
cd devcard

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Copy environment config
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Seed sample data
pnpm db:seed

# Start the backend
pnpm dev:backend

# In another terminal — start the mobile app
pnpm dev:mobile
```

## Architecture

```
devcard/
├── apps/
│   ├── backend/          # Fastify + TypeScript API
│   ├── mobile/           # React Native (Bare) mobile app
│   └── web/              # SvelteKit web backup
├── packages/
│   └── shared/           # Shared types, platform registry, utils
├── docker-compose.yml    # PostgreSQL + Redis
└── pnpm-workspace.yaml   # Monorepo config
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native (Bare) + React Navigation |
| Backend API | Fastify + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis 7 |
| Web Backup | SvelteKit |
| Auth | OAuth 2.0 (GitHub, Google) |

### Hybrid Follow Engine

DevCard uses a three-layer follow engine:

| Layer | Strategy | Platforms |
|-------|----------|-----------|
| API Follow | Silent background follow | GitHub |
| WebView Connect | In-app WebView interaction | LinkedIn, Twitter/X |
| Profile Link | Opens profile in browser | GitLab, Devfolio, others |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, coding standards, and PR process.

## License

DevCard is licensed under the [Apache License 2.0](./LICENSE).

---

<p align="center">
  Built with ❤️ by the developer community, for the developer community.
</p>
