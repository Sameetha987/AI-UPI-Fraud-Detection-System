from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_api_key: str = "development-key"
    ai_threshold: float = 0.01
    model_name: str = "SafePay XGBoost Candidate"
    model_version: str = "candidate"

    model_config = SettingsConfigDict(
        env_prefix="SAFEPAY_AI_",
        env_file=".env",
        case_sensitive=False,
    )


settings = Settings()