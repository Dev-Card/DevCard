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

## API Endpoints

The API provides the following endpoints (defined by the `cardRoutes` function in `apps/backend/src/routes/cards.ts`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/` | List all cards for the authenticated user |
| **POST** | `/` | Create a new card (first card is auto-set as default) |
| **PUT** | `/:id` | Update a card's title and/or links |
| **DELETE** | `/:id` | Delete a card |
| **PUT** | `/:id/default` | Set a card as the default card |

### **POST /** - Create a New Card (Example)

**Request:**
```json
POST /cards HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Card",
  "linkIds": [
    "223e4567-e89b-12d3-a456-426614174000",
    "323e4567-e89b-12d3-a456-426614174000"
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "623e4567-e89b-12d3-a456-426614174000",
  "title": "New Card",
  "isDefault": false,
  "links": [
    {
      "id": "223e4567-e89b-12d3-a456-426614174000",
      "platform": "github",
      "username": "john-doe",
      "url": "https://github.com/john-doe"
    },
    {
      "id": "323e4567-e89b-12d3-a456-426614174000",
      "platform": "twitter",
      "username": "johndoe",
      "url": "https://twitter.com/johndoe"
    }
  ]
}
```
**Field constraints:**
- `title`: String, 1-100 characters (required)
- `linkIds`: Array of UUID strings (required, can be empty array)

### **PUT /:id** - Update a Card (Example)

**Request:**
```json
PUT /cards/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Card Title",
  "linkIds": [
    "223e4567-e89b-12d3-a456-426614174000"
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Updated Card Title",
  "isDefault": true,
  "links": [
    {
      "id": "223e4567-e89b-12d3-a456-426614174000",
      "platform": "github",
      "username": "john-doe",
      "url": "https://github.com/john-doe"
    }
  ]
}
```

**Field constraints:**
- `title`: String, 1-100 characters (optional)
- `linkIds`: Array of UUID strings (optional)

### **DELETE /:id** - Delete a Card (Example)

**Request:**
```http
DELETE /cards/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Authorization: Bearer <token>
```

**Response (204 No Content):**
```
(empty body)
```
### **PUT /:id/default** - Set a Card as Default (Example)

**Request:**
```http
PUT /cards/423e4567-e89b-12d3-a456-426614174000/default HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "message": "Default card updated"
}
```

### Error Cases

The following error cases are implemented:

| Scenario | Status | Response |
|----------|--------|----------|
| **Create/Update Card** | 400 | `{ error: 'Validation failed', details: parsed.error.flatten() }` — when title or linkIds don't meet constraints |
| **Create/Update Card** | 409 | `{ error: 'Username already taken'}` — when a user with the same username exists |
| **Update Card** | 404 | `{ error: 'Card not found' }` — when card ID doesn't exist or doesn't belong to authenticated user |
| **Delete Card** | 404 | `{ error: 'Card not found' }` — when card ID doesn't exist or doesn't belong to authenticated user |
| **Set Default Card** | 404 | `{ error: 'Card not found' }` — when card ID doesn't exist or doesn't belong to authenticated user |
| **Successful Deletion** | 204 | No content |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, coding standards, and PR process.

## License

DevCard is licensed under the [Apache License 2.0](./LICENSE).

---

<p align="center">
  Built with ❤️ by the developer community, for the developer community.
</p>
