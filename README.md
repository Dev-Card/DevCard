<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Tech-SvelteKit%20%7C%20Fastify%20%7C%20React%20Native-6366f1?style=flat-square" alt="Tech Stack" />
</p>

<p align="center">
  <h1 align="center">DevCard</h1>
  <p align="center"><strong>One Tap. Every Profile. Every Platform.</strong></p>
  <p align="center">The open-source developer profile exchange platform that simplifies networking at hackathons, conferences, and meetups.</p>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

---

## 💡 The Problem

Networking as a developer often involves a fragmented exchange of handles:
> *"What's your LinkedIn? Do you have GitHub? Are you on X/Twitter?"*

Each exchange requires manual searching, multiple app switches, and unnecessary friction. **DevCard** solves this by aggregating all your professional profiles into a single, scan-and-connect experience.

## 🚀 Features

- 🔗 **Profile Aggregation** — Support for GitHub, LinkedIn, X/Twitter, Devfolio, GitLab, LeetCode, and 10+ more.
- 📱 **QR & AirDrop Sharing** — Share your entire digital presence with one scan or link.
- ⚡ **Hybrid Follow Engine** — Background follows for GitHub (API) and seamless WebView connections for others.
- 🎯 **Context Cards** — Tailor your shared profiles for specific events (e.g., "Professional" vs. "Hackathon" cards).
- 🔒 **Privacy-First** — No data monetization. Apache 2.0 licensed. You own your profile.
- 🌐 **Web Backup** — Recipients can view and connect even if they don't have the DevCard app.

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend (Web)** | SvelteKit, Vite, Lucide Icons |
| **Mobile App** | React Native (Bare Workflow), React Navigation |
| **Backend API** | Fastify, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 16, Redis 7 (Caching) |
| **Package Manager** | pnpm (Workspaces) |

## 🏁 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher
- **Docker**: For running PostgreSQL and Redis
- **React Native environment**: [Official Guide](https://reactnative.dev/docs/environment-setup)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dev-Card/DevCard.git
   cd DevCard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Spin up infrastructure**
   ```bash
   docker compose up -d
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Update .env with your local database and provider secrets
   ```

5. **Initialize Database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

6. **Start Development Servers**
   ```bash
   # Run the entire stack
   pnpm dev:web      # Web Dashboard
   pnpm dev:backend  # API Server
   pnpm dev:mobile   # Mobile App (Expo/Metro)
   ```

## 📂 Project Structure

```text
DevCard/
├── apps/
│   ├── backend/    # Fastify + Prisma API
│   ├── mobile/     # React Native Mobile Application
│   └── web/        # SvelteKit Dashboard & Profile Views
├── packages/
│   └── shared/     # Shared types, constants, and utilities
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 🤝 Contributing

We love contributions! Whether it's fixing a bug, improving the UI, or adding a new platform integration.

1. Check out our [Good First Issues](https://github.com/Dev-Card/DevCard/issues?q=is%3Aopen+label%3A%22good-first-issue%22).
2. Read the [CONTRIBUTING.md](./CONTRIBUTING.md) for our workflow and coding standards.
3. Open a Pull Request!

## 📄 License

DevCard is open-source software licensed under the [Apache License 2.0](./LICENSE).

---

<p align="center">
  Built with ⚡ by the <strong>DevCard Community</strong>.
</p>
