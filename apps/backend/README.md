# DevCard Backend

## Authentication API

Local credential authentication is available as a backend foundation for future
profile-sharing features. These endpoints do not add any web or mobile UI.

### POST `/auth/register`

Creates a local user account, stores the password as a salted scrypt hash, and
returns an access token plus refresh token.

Request body:

```json
{
  "email": "ada@example.com",
  "username": "ada",
  "displayName": "Ada Lovelace",
  "password": "correct-horse-battery-staple"
}
```

Responses:

- `201` with `{ "user": { "id", "email", "username", "displayName" }, "accessToken", "refreshToken" }`
- `400` when validation fails
- `409` when the email or username is already registered

### POST `/auth/login`

Authenticates an existing local account by email and password.

Request body:

```json
{
  "email": "ada@example.com",
  "password": "correct-horse-battery-staple"
}
```

Responses:

- `200` with `{ "user": { "id", "email", "username", "displayName" }, "accessToken", "refreshToken" }`
- `400` when validation fails
- `401` when credentials are invalid

## Follow Engine Architecture

DevCard implements a multi-layered Hybrid Follow Engine designed to connect platform professionals seamlessly while maintaining platform policy compliance.

```mermaid
graph TD
    A[User triggers Follow/Connect] --> B{Check Platform Strategy}
    B -- api (GitHub) --> C[Layer 1: Direct OAuth API integration]
    B -- webview (LinkedIn) --> D[Layer 2: In-app WebView Interaction Engine]
    B -- link (GitLab/Devfolio) --> E[Layer 3: Native deep-linking / Browser redirect]
    B -- copy (Discord) --> F[Layer 4: Clipboard Copy fallback]
```

### Layer 2: WebView Interaction Engine (LinkedIn)

Due to LinkedIn's modern API restrictions preventing programmatic connection requests, direct API follow (Layer 1) is not viable. Instead, the WebView Interaction Engine routes the action through a secure, native WebView:

1. **Routing Strategy**: The backend parses the connection request and returns `{ strategy: 'webview', url }` containing the resolved profile link.
2. **Session Persistence**: The mobile WebView loads the target profile URL using system-level OAuth cookie-sharing (`sharedCookiesEnabled={true}`), ensuring the user remains authenticated.
3. **DOM Introspection**: A lightweight JavaScript snippet is injected to continuously poll for the native LinkedIn 'Connect' button, smooth-scrolls it into view, and highlights it visually to encourage action.
4. **Interactive Send**: Users retain full control over actual connection request submission, adhering completely to platform terms of service.
5. **State Detection**:
   - URL State Polling: The engine inspects URL transitions containing `invite-sent` or similar sub-routes.
   - DOM Observation: The injected Javascript queries for structural indicators of successful invitation (e.g. "Pending" button state or toaster text) and posts a serialized message back to the native layer.
6. **Robust Fallback**: If network or WebView loading times out (>10s), the engine gracefully falls back to native deep links (`linkedin://profile?id={username}`) or launches the default browser with an interactive custom in-app overlay.
7. **Telemetry Logging**: Upon client-side success (detected via state changes or DOM indicators), the mobile app makes a `POST /api/follow/:platform/:targetUsername/log` request to the backend. This writes a record to the `FollowLog` database table for auditing and analytics tracking.
