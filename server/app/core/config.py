from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database (Neon PostgreSQL)
    DATABASE_URL: str

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # Google GenAI / AI Studio (Nano Banana Engine)
    GEMINI_API_KEY: str

    # Legacy GCP Vertex AI (Optional fallback)
    GCP_PROJECT_ID: str = ""
    GCP_LOCATION: str = "us-central1"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""


    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]

    class Config:
        import os
        env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
