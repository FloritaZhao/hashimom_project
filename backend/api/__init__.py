"""Aggregate all sub‑blueprints under /api."""
from flask import Blueprint

from .auth import bp as auth_bp
from .labs import bp as labs_bp
from .symptoms import bp as symptoms_bp
from .medications import bp as meds_bp
from .ai import bp as ai_bp
from .exports import bp as exports_bp
from .profile import bp as profile_bp

api_bp = Blueprint("api", __name__, url_prefix="/api")

for _bp in (auth_bp, labs_bp, symptoms_bp, meds_bp, ai_bp, profile_bp, exports_bp):
    api_bp.register_blueprint(_bp)
