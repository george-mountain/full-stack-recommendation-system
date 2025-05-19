import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env file from the project root if it exists
env_path = Path(".") / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    PROJECT_NAME: str = "RecommendationApp"
    PROJECT_VERSION: str = "1.0.0"

    # Database settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "appdb")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}",
    )

    # Redis and Celery settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    CELERY_BROKER_URL: str = os.getenv(
        "CELERY_BROKER_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    )
    CELERY_RESULT_BACKEND: str = os.getenv(
        "CELERY_RESULT_BACKEND", f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    )

    # FastAPI settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "a_very_secret_key_that_should_be_changed"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # Recommender settings
    MAX_CONTEXT_LENGTH: int = int(os.getenv("MAX_CONTEXT_LENGTH", 10))
    MIN_SEQUENCE_LENGTH: int = int(os.getenv("MIN_SEQUENCE_LENGTH", 3))
    EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", 32))
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models_store/gru4rec_model.keras")

    # Set Keras backend (tensorflow, jax, torch)
    # This needs to be set before Keras is imported for the first time.
    KERAS_BACKEND: str = os.getenv("KERAS_BACKEND", "tensorflow")
    os.environ["KERAS_BACKEND"] = KERAS_BACKEND

    # Ensure models_store directory exists
    Path("./models_store").mkdir(parents=True, exist_ok=True)
    Path("./data").mkdir(
        parents=True, exist_ok=True
    )  # For Movielens data if downloaded


settings = Settings()

if settings.KERAS_BACKEND:
    print(f"Keras backend set to: {settings.KERAS_BACKEND}")
else:
    print(
        "Warning: KERAS_BACKEND environment variable not found. Keras will use its default backend."
    )
