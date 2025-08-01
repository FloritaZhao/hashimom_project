from __future__ import annotations
from typing import Any

from flask import Blueprint, jsonify, request, session
from .utils import current_user
from models import db, User

bp = Blueprint("auth", __name__)

@bp.route("/login", methods=["POST"])
def login() -> Any:
    data = request.get_json(silent=True) or {}
    nickname = (data.get("nickname") or "").strip()
    if not nickname:
        return jsonify(error="Nickname is required"), 400

    user = User.query.filter(db.func.lower(User.nickname) == nickname.lower()).first()
    if not user:
        user = User(nickname=nickname)
        db.session.add(user)
        db.session.commit()

    session["user_id"] = user.id
    return jsonify(user_id=user.id, nickname=user.nickname)

@bp.route("/logout", methods=["POST"])
def logout() -> Any:
    session.pop("user_id", None)
    return jsonify(status="ok")

@bp.route("/me", methods=["GET"])
def me() -> Any:
    user = current_user()
    if not user:
        return jsonify(error="Not authenticated"), 401
    return jsonify(user_id=user.id, nickname=user.nickname)
