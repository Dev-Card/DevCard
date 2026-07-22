# DevCard Web Platform

This is the informational web platform for DevCard, built with React, TypeScript, and Vite.
It serves as the main landing page to guide users and contributors to our community, github repository, and mobile app.

## Running Locally

To run the web application locally:

```bash
npm run dev
```

## Testing

This project uses Vitest and React Testing Library for testing.

To run the tests:

```bash
npm run test
```

## Pages

| Route | Page | Notes |
|-------|------|-------|
| `/` | Landing | Public |
| `/u/:username` | Public profile | Public |
| `/devcard/:id` | Shared card | Public |
| `/events/:slug` | Event / attendance | Lets a signed-in user **mark attendance** at a hackathon (as Participant / Organizer / Mentor) and leave again. Reading the event and attendee list is public. |
| `/leaderboard` | Contributor leaderboard | Public |

### Authentication for attendance

The web app has no login flow yet. Marking or leaving attendance calls the authenticated
backend endpoints (`POST /api/events/:slug/join`, `DELETE /api/events/:slug/leave`), so the
API client (`src/lib/api.ts`) attaches a JWT read from `localStorage` under the key
`devcard-token` when present. To exercise the flow locally, obtain a token from the backend
auth route and set it:

```js
localStorage.setItem('devcard-token', '<your-jwt>');
```

Without a token, the "Mark attendance" button prompts the user to sign in. Anti-spam behavior
(rate limiting + heuristic flagging) is documented in the root [`README.md`](../../README.md#events--attendance).

## Contributing

The web app is a simple, clean, and informative landing page. If you'd like to add sections or improve the UI, make sure you maintain the minimal and professional design aesthetic.

If you are developing a production application, you can build it with:

```bash
npm run build
```
