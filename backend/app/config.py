"""
Application configuration for the Incident Response Agent Backend.
Loads environment variables from .env if present.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Find project root and backend dir
BACKEND_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = BACKEND_DIR.parent

# Load .env file from backend/.env or root .env
env_path = BACKEND_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    """Application settings class."""
    APP_NAME: str = os.getenv("APP_NAME", "Incident Response Agent Backend")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Database
    _raw_db_path: str = os.getenv("DATABASE_PATH", "backend/data/incidents.db")
    if Path(_raw_db_path).is_absolute():
        DATABASE_PATH: Path = Path(_raw_db_path)
    else:
        DATABASE_PATH: Path = (WORKSPACE_ROOT / _raw_db_path).resolve()

    # Integrations
    AGENT_SERVICE_URL: Optional[str] = os.getenv("AGENT_SERVICE_URL") or None
    HINDSIGHT_SERVICE_URL: Optional[str] = os.getenv("HINDSIGHT_SERVICE_URL") or None
    HYDRADB_SERVICE_URL: Optional[str] = os.getenv("HYDRADB_SERVICE_URL") or None

    # Official Hindsight Engine Settings
    HINDSIGHT_API_URL: str = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
    HINDSIGHT_BANK_ID: str = os.getenv("HINDSIGHT_BANK_ID", "incident-response-bank")
    HINDSIGHT_API_KEY: Optional[str] = os.getenv("HINDSIGHT_API_KEY") or None

    REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "5.0"))



settings = Settings()


def get_settings() -> Settings:
    """Dependency injection helper to retrieve application settings."""
    return settings
