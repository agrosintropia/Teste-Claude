from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Banco
    DATABASE_URL: str = "postgresql+asyncpg://loteforte:loteforte@localhost:5432/loteforte"
    DATABASE_URL_SYNC: str = "postgresql://loteforte:loteforte@localhost:5432/loteforte"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Upload
    UPLOAD_DIR: str = "/tmp/loteforte_uploads"
    MAX_UPLOAD_MB: int = 10

    # Leilão
    LEILAO_DURACAO_DIAS: int = 5          # segunda → sexta
    ESCROW_PRAZO_HORAS: int = 72
    NFE_PRAZO_HORAS: int = 24
    LOTE_VOLUME_MINIMO_KG: float = 500.0
    RAIO_PADRAO_KM: int = 50

    # Score
    PESO_GESTAO_PRODUCAO: float = 0.40
    PESO_GESTAO_AMBIENTAL: float = 0.35
    PESO_GESTAO_SOCIAL: float = 0.25

    class Config:
        env_file = ".env"


settings = Settings()
