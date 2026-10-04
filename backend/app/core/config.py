import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "College Email Notification System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security / Auth
    SECRET_KEY: str = "super-secret-jwt-college-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    FERNET_KEY: str = "7xV-3r1eF0Tz_eZ5kG1r0n2fB8rJ4yQ6kL3oP9mN0xY=" # 32 url-safe base64-encoded bytes
    UNSUBSCRIBE_SECRET: str = "college-unsub-secret-key-safe"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./college_email.db"
    SYNC_DATABASE_URL: str = "sqlite:///./college_email.db"
    
    # SMTP Default Settings
    DEFAULT_SMTP_HOST: str = "127.0.0.1"
    DEFAULT_SMTP_PORT: int = 1025
    DEFAULT_SMTP_SECURITY: str = "none" # none | starttls | ssl
    DEFAULT_SMTP_USER: str = ""
    DEFAULT_SMTP_PASSWORD: str = ""
    DEFAULT_SENDER_NAME: str = "Apex University Academic Office"
    DEFAULT_SENDER_EMAIL: str = "notifications@apex.edu"
    MAILPIT_WEB_URL: str = "http://localhost:8025"
    
    # Rate Limiter & Concurrency
    SMTP_MAX_WORKERS: int = 4
    SMTP_BATCH_SIZE: int = 25
    RATE_LIMIT_PER_MINUTE: int = 120
    RATE_LIMIT_PER_DAY: int = 5000
    
    # URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")

settings = Settings()
