# DevCard API — Postman

This folder is the single source of truth for the DevCard backend's Postman collection.
Edit the JSON here, commit it, and (optionally) sync it to your Postman workspace.

| File | Purpose |
|------|---------|
| `DevCard.postman_collection.json` | All ~46 endpoints, organized by domain. Collection-level Bearer auth uses `{{token}}`. |
| `DevCard.postman_environment.json` | `baseUrl` + `token` variables for local runs. |
| `push.mjs` | Sync the collection to a Postman workspace via the Postman API. |

## 1. Import into Postman (GUI)

1. **Import** → drop in both JSON files.
2. Select the **DevCard - Local** environment (top-right).
3. Start the backend locally: `npm run dev` (defaults to `http://localhost:3000`).
4. Seed the demo user once so dev-login works: `npm run db:seed`.
5. Run **Auth → Dev Login** first. Its test script saves the JWT into `{{token}}`,
   so every other request is authenticated automatically.

> Prefer the real login? Complete GitHub/Google OAuth in a browser, copy the JWT,
> and paste it into the `token` environment variable manually. Both flows work.

## 2. Run the collection in CI (Newman)

Newman (Postman's CLI) runs the same JSON, so the collection and CI never drift.

```bash
# locally, against a running server
npm run test:api
```

CI runs it automatically on PRs that touch the backend — see
[`.github/workflows/api-tests.yml`](../../../.github/workflows/api-tests.yml).
That job boots Postgres + Redis, applies migrations, seeds the demo user, starts
the server, waits for `/health`, then runs Newman.

### Assertions & request chaining

15 requests carry `pm.test(...)` assertions (status codes + response-shape checks).
Newman fails the build if any assertion fails. Four requests also capture ids/slugs
from their responses into collection variables, so the whole suite runs top-to-bottom
in **Collection → Run** (or `npm run test:api`) without manual editing:

| Request | Saves variable | Consumed by |
|---------|----------------|-------------|
| Cards → Create card | `cardId` | Update / Default / Delete card, Public card, NFC payload |
| Profiles → Add platform link | `linkId` | Update / Reorder / Delete link |
| Events → Create event | `eventSlug` | Get / Join / Leave / Attendees |
| Teams → Create team | `teamSlug` | Get / Invite / Update / QR / Delete team |

Order matters: **Dev Login** must run first (sets `{{token}}`), then each *Create*
before its dependents. The Collection Runner preserves folder/request order, so a full
run just works. Two ordering rules are baked in so a top-to-bottom run is clean:

- The **Session (run last)** folder holds card cleanup + logout. Card deletion lives
  here (not in the Cards folder) so the Public and NFC folders can still read the card.
  Logout lives here so it doesn't revoke `{{token}}` mid-run.

### Verified end-to-end

This collection was run against a live backend with Newman: **46/46 requests, 23/23
assertions passing**. A few requests intentionally return `4xx` when run against a fresh
DB because they need data that isn't seeded — they are correct API behavior, not failures,
so they carry no assertions:

| Request | Result on fresh DB | Why |
|---------|--------------------|-----|
| Auth → Refresh token | 401 | no refresh cookie in Newman (assertion allows 200/401) |
| Auth → Mobile exchange | 400 | placeholder `<one-time-code>` |
| Follow → Follow target | 400 | demo user has no GitHub OAuth connected |
| Connect → Autodiscover / Disconnect | 400 / 404 | nothing connected to discover/disconnect |
| Teams → Invite / Remove member | 404 | `octocat` / `<user-id>` aren't real users |

To make those green, connect a GitHub account for `devcard-demo` and seed a second user
to invite.

## 3. Sync to a Postman workspace (Postman API)

Create an API key at <https://go.postman.co/settings/me/api-keys>, then:

```bash
# First push — creates a new collection and prints its UID
POSTMAN_API_KEY=PMAK-xxxx npm run postman:push

# Subsequent pushes — update the same collection in place
POSTMAN_API_KEY=PMAK-xxxx POSTMAN_COLLECTION_UID=<uid> npm run postman:push
```

Keep `POSTMAN_API_KEY` in your local `.env` (already git-ignored) — never commit it.

## 4. Mock server & published docs (Postman UI, no code)

Once the collection lives in a Postman workspace:

- **Docs**: open the collection → **View complete documentation** → **Publish**.
  Postman generates a hosted API reference from your requests, descriptions, and examples.
- **Mock server**: collection → **⋯** → **Mock collection**. Postman returns saved
  example responses at a hosted URL — useful for frontend/mobile work before the
  backend is ready. Add example responses to requests to make mocks meaningful.

## Endpoint coverage

Auth, Profiles, Cards, Public, Follow, Connect, Analytics, NFC, Events, Teams, Health —
mirrors the route prefixes registered in `src/app.ts`. When you add or change a route,
update the collection here and re-run `npm run postman:push`.
