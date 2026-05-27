# Rate Limiting

> **Location:** `apps/backend/src/plugins/rate-limit.ts`

DevCard uses Redis-backed, tiered rate limiting applied per-route across all sensitive backend paths. The implementation uses [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) (already in `package.json`) with the existing `ioredis` client so state **persists across server restarts** and is shared across all backend replicas.

---

## Why per-user keying matters

Unauthenticated routes key on the client IP address. Authenticated routes key on the **JWT user ID** extracted from `request.user`. This means:

- A legitimate user behind a shared IP (office NAT, mobile carrier) is never throttled by another user's traffic.
- An attacker cannot bypass per-user limits by rotating IPs after obtaining a valid token.

---

## Tiers

| Tier | Routes | Limit | Window | Key |
|------|--------|-------|--------|-----|
| **STRICT** | OAuth initiation (`/auth/github`, `/auth/google`), OAuth callbacks, `/auth/dev-login`, `/api/connect/github`, `/api/connect/github/callback` | **10 req** | 15 min | per IP |
| **MODERATE** | Profile mutations (`PUT /api/profiles/me`, link CRUD), card CRUD, follow actions, follow log writes, analytics reads, connect status, platform disconnect | **60 req** | 1 min | per user ID (falls back to IP when unauthenticated) |
| **RELAXED** | Public profile reads, card views, `/api/u/*` | **120 req** | 1 min | per IP |
| **QR** (sub-RELAXED) | `GET /api/u/:username/qr` — QR PNG/SVG generation is CPU-intensive | **50 req** | 1 min | per IP |

> All numbers are tunable via the `TIERS` constant in `src/plugins/rate-limit.ts` — no change to route files is needed.

---

## Response headers

Every rate-limited response (both under-limit and 429) includes:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Max requests allowed in this window |
| `X-RateLimit-Remaining` | Requests remaining before a 429 |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `Retry-After` | Seconds until the client may retry (only on 429) |

---

## 429 error body

All 429 responses match the project's existing error envelope:

```json
{
  "error": "Too Many Requests",
  "statusCode": 429,
  "retryAfter": 42,
  "message": "Rate limit exceeded. Retry after 42 seconds."
}
```

---

## Applying a tier to a new route

Import the helper that matches your route's sensitivity and spread it into the route options:

```ts
import { strictRateLimit, moderateRateLimit, relaxedRateLimit } from '../plugins/rate-limit.js';

// Auth / OAuth — STRICT
app.get('/some-auth-route', strictRateLimit, handler);

// Mutation behind authenticate — MODERATE
app.post('/some-write', { preHandler: [app.authenticate], ...moderateRateLimit }, handler);

// Public read — RELAXED
app.get('/some-public-read', relaxedRateLimit, handler);
```

If you need a custom limit that doesn't fit a tier, configure `config.rateLimit` directly and use `ipKeyGenerator` or `userOrIpKeyGenerator` from `rate-limit.ts` to stay consistent with the rest of the codebase.

---

## Configuration

Rate limit tiers live entirely in `src/plugins/rate-limit.ts`. The Redis connection is controlled by `REDIS_URL` in `.env` (already used for QR session caching). No additional environment variables are needed.

```
# .env
REDIS_URL=redis://localhost:6379
```

In production, point `REDIS_URL` at your managed Redis instance. Because the limits are stored in Redis, they survive backend restarts and are consistent across horizontal replicas.

---

## Tests

Integration tests are in `apps/backend/tests/rate-limit.test.ts`. They use [`ioredis-mock`](https://github.com/stipsan/ioredis-mock) (an in-process Redis stub) so they run in CI with no external services.

```bash
pnpm test                # run all tests once
pnpm test:watch          # watch mode
```

Each tier has tests covering:
- Requests under the limit pass with correct `X-RateLimit-*` headers
- The first request over the limit returns 429 with `Retry-After` and a correctly shaped body
- Per-user and per-IP counters are isolated (exhausting one principal's bucket does not affect another's)

To add a test for a new route, use the in-process `buildTestApp()` helper in the test file and register a representative route with the correct tier config.

---

## Adding `ioredis-mock` as a dev dependency

```bash
pnpm add -D ioredis-mock --filter @devcard/backend
```

This is only required for tests; the production code uses the real `ioredis` client.
