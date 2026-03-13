from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ruta absoluta al .env (relativa a este archivo: core/config.py → backend/.env)
ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    CORS_ORIGINS: str = "*"  # Comma-separated origins, e.g. "http://localhost:5173,https://midominio.com"

    model_config = SettingsConfigDict(env_file=str(ENV_FILE))

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse CORS_ORIGINS into a list. '*' means allow all."""
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()