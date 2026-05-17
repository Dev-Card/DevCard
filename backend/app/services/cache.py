import redis
from app.config import settings

client = redis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    decode_responses=True
)

def get_cached(key: str):
    """Return cached value or None."""
    return client.get(key)

def set_cached(key: str, value: str):
    """Store value in Redis with TTL."""
    client.setex(key, settings.cache_ttl, value)