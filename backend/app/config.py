from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database (MySQL)
    MYSQL_HOST: str = "mysql"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "soeum_user"
    MYSQL_PASSWORD: str = "soeum_pass_2024"
    MYSQL_DATABASE: str = "soeum"

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    # External APIs
    DATA_GO_KR_API_KEY: str = ""
    KAKAO_REST_API_KEY: str | None = None

    # SafeMap (생활안전지도)
    SAFEMAP_API_KEY: str = ""
    SAFETYDATA_API_KEY: str = ""
    DUST_EMISSION_API_KEY: str = ""

    # App
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @property
    def database_url(self) -> str:
        return (
            f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
            f"?charset=utf8mb4"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
