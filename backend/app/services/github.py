import httpx
from app.config import settings

GITHUB_API = "https://api.github.com"

async def fetch_github_user(username: str) -> dict:
    """Fetch user profile from GitHub API asynchronously."""
    headers = {}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GITHUB_API}/users/{username}",
            headers=headers
        )

    if response.status_code == 404:
        return None
    if response.status_code == 429:
        raise Exception("rate_limited")

    response.raise_for_status()
    return response.json()