from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    github_token: str = ""
    redis_host: str = "localhost"
    redis_port: int = 6379
    cache_ttl: int = 3600  # 1 hour

    class Config:
        env_file = ".env"

settings = Settings()