import os
import pathlib
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = pathlib.Path(__file__).parent
INSTANCE_DIR = BASE_DIR / ".." / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)

class Config:
    # 数据库优先级：Render/云端 `DATABASE_URL` → 自定义 `DB_URI` → 本地 SQLite
    _raw_db_uri = (
        os.getenv("DATABASE_URL")
        or os.getenv("DB_URI")
        or f"sqlite:///{INSTANCE_DIR / 'hashimom.db'}"
    )
    # Render/Heroku 可能提供 postgres:// 前缀，统一替换为 SQLAlchemy 认可的 postgresql://
    if _raw_db_uri.startswith("postgres://"):
        _raw_db_uri = _raw_db_uri.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _raw_db_uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-12345")

    # Third‑party keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Keep for legacy compatibility
    GLUTEN_SCAN_ENDPOINT = os.getenv("GLUTEN_SCAN_ENDPOINT")

    # Session / CORS（可通过环境变量覆写，便于生产跨域 Cookie）
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"
    CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
