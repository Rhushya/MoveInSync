from typing import Any, List
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MoveInSync Billing System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str
    REDIS_URL: str
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    ENVIRONMENT: str = "development"
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> List[str]:
        """Allow comma separated strings or JSON lists in env files."""
        if isinstance(value, list):
            return value
        if isinstance(value, str) and value:
            cleaned = value.strip()
            if cleaned.startswith("[") and cleaned.endswith("]"):
                cleaned = cleaned[1:-1]
            return [origin.strip().strip('"\'') for origin in cleaned.split(",") if origin.strip()]
        raise ValueError("BACKEND_CORS_ORIGINS must be a list or comma separated string")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    def model_post_init(self, __context: Any) -> None:
        """Normalize sqlite URLs so relative paths resolve from backend root."""
        if self.DATABASE_URL.startswith("sqlite:///"):
            raw_path = self.DATABASE_URL.replace("sqlite:///", "", 1)
            path_obj = Path(raw_path)
            if not path_obj.is_absolute():
                base_dir = Path(__file__).resolve().parents[2]
                path_obj = (base_dir / path_obj).resolve()
            # sqlite URLs expect forward slashes regardless of platform
            normalized = path_obj.as_posix()
            self.DATABASE_URL = f"sqlite:///{normalized}"


settings = Settings()
