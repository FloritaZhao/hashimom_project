from __future__ import annotations
from typing import Any

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, Symptom
from schemas import SymptomIn
from datetime import datetime

bp = Blueprint("symptoms", __name__)

def _u(): return current_user()

@bp.before_request
def _auth():
    # Skip authentication for CORS preflight requests
    if request.method == 'OPTIONS':
        return
    if not _u():
        return jsonify(error="Unauthorized"), 401

@bp.route("/symptoms", methods=["GET"])
def list_symptoms() -> Any:
    return jsonify([s.to_dict() for s in _u().symptoms])

@bp.route("/symptoms", methods=["POST"])
def create_symptom() -> Any:
    try:
        payload = SymptomIn.model_validate(request.get_json())
    except Exception as e:
        return jsonify(error=str(e)), 400

    data = payload.model_dump()
    if data["logged_at"] is None:
        data["logged_at"] = datetime.utcnow()

    sym = Symptom(user_id=_u().id, **data)
    db.session.add(sym); db.session.commit()
    return jsonify(sym.to_dict()), 201
