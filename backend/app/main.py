import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.services.github import fetch_github_user
from app.services.cache import get_cached, set_cached

app = FastAPI(title="DevCard API")

class DevCardResponse(BaseModel):
    username: str
    name: str | None
    avatar_url: str
    bio: str | None
    public_repos: int
    followers: int
    cached: bool

@app.get("/api/devcard/{username}", response_model=DevCardResponse)
async def get_devcard(username: str):
    """
    Fetch DevCard data for a GitHub username.
    Returns cached data if available, otherwise fetches from GitHub.
    """
    cache_key = f"devcard:{username}"

    # Check cache first
    cached = get_cached(cache_key)
    if cached:
        data = json.loads(cached)
        data["cached"] = True
        return data

    # Fetch from GitHub
    try:
        user = await fetch_github_user(username)
    except Exception as e:
        if "rate_limited" in str(e):
            raise HTTPException(status_code=429, detail="GitHub rate limit reached.")
        raise HTTPException(status_code=500, detail="Internal server error.")

    if user is None:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found.")

    result = {
        "username": user["login"],
        "name": user.get("name"),
        "avatar_url": user["avatar_url"],
        "bio": user.get("bio"),
        "public_repos": user["public_repos"],
        "followers": user["followers"],
        "cached": False
    }

    # Store in cache
    set_cached(cache_key, json.dumps(result))

    return result