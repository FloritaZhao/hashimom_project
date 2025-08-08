from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, Profile
from schemas import ProfileIn, ProfileOut

bp = Blueprint("profile", __name__)


def _u():
    return current_user()


@bp.before_request
def _auth():
    # Skip authentication for CORS preflight requests
    if request.method == "OPTIONS":
        return
    if not _u():
        return jsonify(error="Unauthorized"), 401


def _calc_by_lmp(lmp: date, today: date) -> tuple[int | None, str]:
    days = (today - lmp).days
    if days < 0:
        return None, "-"
    weeks = days // 7
    if weeks <= 12:
        tri = "T1"
    elif weeks <= 27:
        tri = "T2"
    else:
        tri = "T3"
    return weeks, tri


def _calc_by_due(edd: date, today: date) -> tuple[int | None, str]:
    lmp = edd - timedelta(days=280)
    return _calc_by_lmp(lmp, today)


def _to_out(profile: Profile | None) -> dict:
    if not profile:
        return ProfileOut(
            lmp_date=None,
            due_date=None,
            high_risk_notes="",
            gestational_age_weeks=None,
            trimester="-",
        ).model_dump()

    today = date.today()
    weeks: int | None = None
    tri: str = "-"
    if profile.lmp_date:
        weeks, tri = _calc_by_lmp(profile.lmp_date, today)
    elif profile.due_date:
        weeks, tri = _calc_by_due(profile.due_date, today)

    return ProfileOut(
        lmp_date=profile.lmp_date,
        due_date=profile.due_date,
        high_risk_notes=profile.high_risk_notes or "",
        gestational_age_weeks=weeks,
        trimester=tri,
    ).model_dump()


@bp.route("/profile", methods=["GET"])
def get_profile() -> Any:
    prof = Profile.query.filter_by(user_id=_u().id).first()
    return jsonify(_to_out(prof))


@bp.route("/profile", methods=["PUT"])
def upsert_profile() -> Any:
    try:
        payload = ProfileIn.model_validate(request.get_json())
    except Exception as e:
        return jsonify(error=str(e)), 400

    prof = Profile.query.filter_by(user_id=_u().id).first()
    if not prof:
        prof = Profile(user_id=_u().id)
        db.session.add(prof)

    data = payload.model_dump()
    # If both present and conflict, prefer LMP for calculations (keep both stored)
    prof.lmp_date = data.get("lmp_date")
    prof.due_date = data.get("due_date")
    prof.high_risk_notes = data.get("high_risk_notes") or None

    db.session.commit()
    return jsonify(_to_out(prof))


