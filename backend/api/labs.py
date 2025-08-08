from __future__ import annotations
from typing import Any

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, Lab, Profile, ReferenceRange
from schemas import LabIn
from datetime import date
from utils.gestation import calculate_by_lmp, calculate_by_due

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
    # Return labs with status, delta and trimester fields
    user = _u()
    labs = Lab.query.filter_by(user_id=user.id).order_by(Lab.test_date.asc(), Lab.id.asc()).all()
    prof = Profile.query.filter_by(user_id=user.id).first()
    tri = _current_trimester(prof)
    result = []
    for lab in labs:
        enr = lab.to_dict()
        # Attach trimester-specific reference range if available
        rr = None
        if tri and tri in {"T1", "T2", "T3"}:
            rr = ReferenceRange.query.filter_by(analyte=lab.test_name.upper(), trimester=tri).first()
        enr.update({
            "trimester": tri or "-",
            "status": _status_for_lab(lab, tri),
            "delta": _delta_for_lab(user.id, lab),
            "ref_low": rr.low if rr else None,
            "ref_high": rr.high if rr else None,
            "ref_unit": rr.unit if rr else None,
        })
        result.append(enr)
    return jsonify(result)

@bp.route("/labs", methods=["POST"])
def create_lab() -> Any:
    try:
        payload = LabIn.model_validate(request.get_json())
    except Exception as e:
        return jsonify(error=str(e)), 400

    lab = Lab(user_id=_u().id, **payload.model_dump())
    db.session.add(lab); db.session.commit()
    prof = Profile.query.filter_by(user_id=_u().id).first()
    tri = _current_trimester(prof)
    data = lab.to_dict()
    rr = None
    if tri and tri in {"T1", "T2", "T3"}:
        rr = ReferenceRange.query.filter_by(analyte=lab.test_name.upper(), trimester=tri).first()
    data.update({
        "trimester": tri or "-",
        "status": _status_for_lab(lab, tri),
        "delta": _delta_for_lab(_u().id, lab),
        "ref_low": rr.low if rr else None,
        "ref_high": rr.high if rr else None,
        "ref_unit": rr.unit if rr else None,
    })
    return jsonify(data), 201


@bp.route("/labs/<int:lab_id>", methods=["GET"])
def get_lab(lab_id: int) -> Any:
    user = _u()
    lab = Lab.query.filter_by(user_id=user.id, id=lab_id).first()
    if not lab:
        return jsonify(error="Not found"), 404
    prof = Profile.query.filter_by(user_id=user.id).first()
    tri = _current_trimester(prof)
    data = lab.to_dict()
    rr = None
    if tri and tri in {"T1", "T2", "T3"}:
        rr = ReferenceRange.query.filter_by(analyte=lab.test_name.upper(), trimester=tri).first()
    data.update({
        "trimester": tri or "-",
        "status": _status_for_lab(lab, tri),
        "delta": _delta_for_lab(user.id, lab),
        "ref_low": rr.low if rr else None,
        "ref_high": rr.high if rr else None,
        "ref_unit": rr.unit if rr else None,
    })
    return jsonify(data)


def _current_trimester(profile: Profile | None) -> str | None:
    if not profile:
        return None
    today = date.today()
    if profile.lmp_date:
        res = calculate_by_lmp(profile.lmp_date, today)
        return res.get("trimester")  # type: ignore
    if profile.due_date:
        res = calculate_by_due(profile.due_date, today)
        return res.get("trimester")  # type: ignore
    return None


def _status_for_lab(lab: Lab, trimester: str | None) -> str:
    try:
        value = float(lab.result)
    except Exception:
        return "NA"
    if not trimester or trimester not in {"T1", "T2", "T3"}:
        return "NA"
    rr = ReferenceRange.query.filter_by(analyte=lab.test_name.upper(), trimester=trimester).first()
    if not rr:
        return "NA"
    if value < rr.low:
        return "LOW"
    if value > rr.high:
        return "HIGH"
    return "NORMAL"


def _delta_for_lab(user_id: int, lab: Lab) -> float | None:
    try:
        curr = float(lab.result)
    except Exception:
        return None
    prev = (
        Lab.query.filter(
            Lab.user_id == user_id,
            Lab.test_name == lab.test_name,
            (Lab.test_date < lab.test_date) | ((Lab.test_date == lab.test_date) & (Lab.id < lab.id)),
        )
        .order_by(Lab.test_date.desc(), Lab.id.desc())
        .first()
    )
    if not prev:
        return None
    try:
        prev_val = float(prev.result)
    except Exception:
        return None
    if prev_val == 0:
        return None
    pct = ((curr - prev_val) / prev_val) * 100.0
    return round(pct, 1)
