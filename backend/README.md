# DevCard Backend API

FastAPI + Redis backend for dynamic GitHub profile fetching with caching.

## Tech Stack

- **FastAPI** — Async Python web framework
- **Redis** — Caching layer (1 hour TTL)
- **httpx** — Async HTTP client for GitHub API
- **pydantic-settings** — Environment variable management

## Project Structure

```
backend/
├── app/
│   ├── main.py            # FastAPI app and API endpoint
│   ├── config.py          # Environment variable config
│   └── services/
│       ├── github.py      # GitHub API integration
│       └── cache.py       # Redis caching logic
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Add your GitHub token to `.env`:
```
GITHUB_TOKEN=ghp_your_token_here
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=3600
```

## Start Redis

```bash
& "C:\Program Files\Redis\redis-server.exe"
```

## Start Server

```bash
uvicorn app.main:app --reload
```

## API Endpoint

```
GET /api/devcard/{username}
```

### Example Response

```json
{
  "username": "torvalds",
  "name": "Linus Torvalds",
  "avatar_url": "https://avatars.githubusercontent.com/u/1024025?v=4",
  "bio": null,
  "public_repos": 11,
  "followers": 303214,
  "cached": false
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `username` | GitHub username |
| `name` | Display name |
| `avatar_url` | Profile picture URL |
| `bio` | Profile bio |
| `public_repos` | Number of public repositories |
| `followers` | Follower count |
| `cached` | `true` if served from Redis cache |

## Error Handling

| Status | Meaning |
|--------|---------|
| `404` | GitHub user not found |
| `429` | GitHub API rate limit reached |
| `500` | Internal server error |

## Interactive API Docs

Once the server is running, visit:
```
http://127.0.0.1:8000/docs
```