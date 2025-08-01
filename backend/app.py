"""Flask application factory."""
from __future__ import annotations

from flask import Flask
from flask_cors import CORS
from models import db
from tasks import init_scheduler, generate_initial_messages
from api import api_bp  # API Blueprint
from config import Config

import logging, pathlib, os

def create_app() -> Flask:
    app = Flask(__name__)
    
    # Load configuration from config.py
    app.config.from_object(Config)
    
    # Configuration: use SQLite for local development.
    db_path = os.path.join(os.path.dirname(__file__), "hashimom.db")
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", f"sqlite:///{db_path}")
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "development-secret-key-12345")

    # 日志
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    # Enable CORS for frontend origins
    CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"], supports_credentials=True)

    db.init_app(app)
    with app.app_context():
        db.create_all()
        # Generate initial AI messages for existing users
        generate_initial_messages(app)

    app.register_blueprint(api_bp, url_prefix="/api")
    init_scheduler(app)
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(port=5001, debug=True)
