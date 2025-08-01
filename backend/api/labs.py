from __future__ import annotations
from typing import Any

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, Lab
from schemas import LabIn

bp = Blueprint("labs", __name__)

def _u(): return current_user()

@bp.before_request
def _auth():
    # Skip authentication for CORS preflight requests
    if request.method == 'OPTIONS':
        return
    if not _u():
        return jsonify(error="Unauthorized"), 401

@bp.route("/labs", methods=["GET"])
def list_labs() -> Any:
    labs = [l.to_dict() for l in _u().labs]
    return jsonify(labs)

@bp.route("/labs", methods=["POST"])
def create_lab() -> Any:
    try:
        payload = LabIn.model_validate(request.get_json())
    except Exception as e:
        return jsonify(error=str(e)), 400

    lab = Lab(user_id=_u().id, **payload.model_dump())
    db.session.add(lab); db.session.commit()
    return jsonify(lab.to_dict()), 201
