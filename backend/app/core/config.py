import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

import json
import os
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent if (BACKEND_DIR.parent / "frontend").exists() else BACKEND_DIR
ROOT_ENV = ROOT_DIR / ".env"
BACKEND_ENV = BACKEND_DIR / ".env"

# Pick the first existing .env file
ENV_FILE = ROOT_ENV if ROOT_ENV.exists() else (BACKEND_ENV if BACKEND_ENV.exists() else ROOT_ENV)

class Settings(BaseSettings):
    PROJECT_NAME: str = "MY CLINIX"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database (Default: local SQLite database in backend directory)
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'myclinix.db').as_posix()}"
    
    # Security
    JWT_SECRET_KEY: str = "super_secret_development_key_change_in_production_123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # AI / OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Storage
    UPLOAD_DIRECTORY: str = str(ROOT_DIR / "uploads")
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://my-clinix.vercel.app",
    ]
    
    ENVIRONMENT: str = "development"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: Union[str, None]) -> str:
        if not v or not str(v).strip():
            return f"sqlite:///{(BACKEND_DIR / 'myclinix.db').as_posix()}"
        url_str = str(v).strip()
        # Render PostgreSQL connections provide postgres:// or postgresql://
        # SQLAlchemy 2.0 with psycopg v3 requires postgresql+psycopg://
        if url_str.startswith("postgres://"):
            url_str = url_str.replace("postgres://", "postgresql+psycopg://", 1)
        elif url_str.startswith("postgresql://") and "+" not in url_str.split("://")[0]:
            url_str = url_str.replace("postgresql://", "postgresql+psycopg://", 1)
        return url_str

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if not v:
            return [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "https://my-clinix.vercel.app",
            ]
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str:
                return []
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            # Comma-separated strings or single string
            return [item.strip() for item in v_str.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
