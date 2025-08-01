import os
import pathlib
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = pathlib.Path(__file__).parent
INSTANCE_DIR = BASE_DIR / ".." / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)

class Config:
    # SQLite 默认放到 instance 目录，生产请改环境变量
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DB_URI", f"sqlite:///{INSTANCE_DIR / 'hashimom.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-12345")

    # Third‑party keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Keep for legacy compatibility
    GLUTEN_SCAN_ENDPOINT = os.getenv("GLUTEN_SCAN_ENDPOINT")

    # Session / CORS
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False  # 本地 HTTP
