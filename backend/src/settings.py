from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Mock Backend"
    API_PREFIX: str = "/api"
    # Mock settings
    MOCK_DELAY_SECONDS: float = 0.5  # To simulate processing time
    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
