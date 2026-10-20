"""Application configuration settings using Pydantic v2 Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings schema and environment defaults."""

    # Application
    APP_NAME: str = "Paper Crawler API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/paper_crawler"
    DATABASE_ECHO: bool = False

    # arXiv Configuration
    ARXIV_API_URL: str = "https://export.arxiv.org/api/query"
    ARXIV_PDF_BASE_URL: str = "https://arxiv.org/pdf"
    ARXIV_RATE_LIMIT_SECONDS: float = 3.0
    ARXIV_USER_AGENT: str = "PaperCrawler/1.0 (mailto:contact@papercrawler.local)"
    ARXIV_TIMEOUT_SECONDS: float = 30.0
    ARXIV_MAX_RETRIES: int = 3

    # Analysis & Embedding
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    MAX_ANNOTATIONS_PER_PAPER: int = 150
    USE_LLM_ANALYZER: bool = False

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
