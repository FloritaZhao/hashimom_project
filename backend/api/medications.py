from __future__ import annotations
from typing import Any

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, Medication
from schemas import MedicationIn
from datetime import datetime

bp = Blueprint("medications", __name__)

def _u(): return current_user()

@bp.before_request
def _auth():
    # Skip authentication for CORS preflight requests
    if request.method == 'OPTIONS':
        return
    if not _u():
        return jsonify(error="Unauthorized"), 401

@bp.route("/medications", methods=["GET"])
def list_medications() -> Any:
    return jsonify([m.to_dict() for m in _u().medications])

@bp.route("/medications", methods=["POST"])
def create_medication() -> Any:
    try:
        payload = MedicationIn.model_validate(request.get_json())
    except Exception as e:
        return jsonify(error=str(e)), 400

    data = payload.model_dump()
    if data["taken_at"] is None:
        data["taken_at"] = datetime.utcnow()

    med = Medication(user_id=_u().id, **data)
    db.session.add(med); db.session.commit()
    return jsonify(med.to_dict()), 201
