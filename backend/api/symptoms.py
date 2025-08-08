from __future__ import annotations
from typing import Any

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import db, Symptom, Lab, GlutenScan, Profile
from schemas import SymptomIn
from datetime import datetime, date, timedelta
from sqlalchemy import and_

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
    # Optional filters: start_date, end_date, symptom_name
    user = _u()
    q = Symptom.query.filter_by(user_id=user.id)
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    name = request.args.get("symptom_name")
    if name:
        q = q.filter(Symptom.symptom == name)
    if start_date_str:
        try:
            sd = datetime.fromisoformat(start_date_str)
            q = q.filter(Symptom.logged_at >= sd)
        except Exception:
            pass
    if end_date_str:
        try:
            ed = datetime.fromisoformat(end_date_str)
            q = q.filter(Symptom.logged_at <= ed)
        except Exception:
            pass
    q = q.order_by(Symptom.logged_at.desc(), Symptom.id.desc())

    items = []
    for s in q.all():
        d = s.to_dict()
        # related lab event: last lab at or before date with TSH/FT4 summary
        d_date = s.logged_at.date()
        last_tsh = (
            Lab.query.filter(
                Lab.user_id == user.id,
                Lab.test_name.in_(["TSH", "tsh", "Tsh"]),
                Lab.test_date <= d_date,
            )
            .order_by(Lab.test_date.desc(), Lab.id.desc())
            .first()
        )
        last_ft4 = (
            Lab.query.filter(
                Lab.user_id == user.id,
                Lab.test_name.in_(["FT4", "ft4", "Ft4"]),
                Lab.test_date <= d_date,
            )
            .order_by(Lab.test_date.desc(), Lab.id.desc())
            .first()
        )
        if last_tsh or last_ft4:
            lab_date = None
            if last_tsh and last_ft4:
                lab_date = max(last_tsh.test_date, last_ft4.test_date)
            elif last_tsh:
                lab_date = last_tsh.test_date
            else:
                lab_date = last_ft4.test_date
            summary_parts = []
            if last_tsh:
                summary_parts.append(f"TSH={last_tsh.result}{' ' + (last_tsh.units or '')}")
            if last_ft4:
                summary_parts.append(f"FT4={last_ft4.result}{' ' + (last_ft4.units or '')}")
            d["related_lab_event"] = {
                "date": lab_date.isoformat() if lab_date else None,
                "summary": ", ".join(summary_parts),
            }
        else:
            d["related_lab_event"] = None

        # related gluten event: any scan that day
        gs = (
            GlutenScan.query.filter(
                GlutenScan.user_id == user.id,
                GlutenScan.created_at >= datetime.combine(d_date, datetime.min.time()),
                GlutenScan.created_at <= datetime.combine(d_date, datetime.max.time()),
            )
            .order_by(GlutenScan.created_at.desc())
            .first()
        )
        d["related_gluten_event"] = bool(gs)
        items.append(d)

    return jsonify(items)

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

@bp.route("/symptoms/<int:symptom_id>", methods=["DELETE"])
def delete_symptom(symptom_id: int) -> Any:
    user = _u()
    sym = Symptom.query.filter_by(id=symptom_id, user_id=user.id).first()
    if not sym:
        return jsonify(error="Not found"), 404
    db.session.delete(sym)
    db.session.commit()
    return jsonify({"status": "deleted", "id": symptom_id})


@bp.route("/symptoms/ai_suggestion", methods=["POST"])
def symptom_ai_suggestion() -> Any:
    data = request.get_json(silent=True) or {}
    symptom_name = data.get("symptom")
    severity = data.get("severity")
    if not symptom_name or severity is None:
        return jsonify(error="symptom and severity are required"), 400

    # Build context
    user = _u()
    prof = Profile.query.filter_by(user_id=user.id).first()
    tri = "-"
    weeks = None
    if prof:
        from datetime import date as _date
        from utils.gestation import calculate_by_lmp, calculate_by_due
        today = _date.today()
        if prof.lmp_date:
            r = calculate_by_lmp(prof.lmp_date, today)
            tri = r.get("trimester", "-")  # type: ignore
            weeks = r.get("weeks")  # type: ignore
        elif prof.due_date:
            r = calculate_by_due(prof.due_date, today)
            tri = r.get("trimester", "-")  # type: ignore
            weeks = r.get("weeks")  # type: ignore

    last_tsh = (
        Lab.query.filter(Lab.user_id == user.id, Lab.test_name.in_(["TSH", "tsh", "Tsh"]))
        .order_by(Lab.test_date.desc(), Lab.id.desc())
        .first()
    )
    last_ft4 = (
        Lab.query.filter(Lab.user_id == user.id, Lab.test_name.in_(["FT4", "ft4", "Ft4"]))
        .order_by(Lab.test_date.desc(), Lab.id.desc())
        .first()
    )
    # last 3 days gluten events
    today = datetime.utcnow().date()
    gs_count = (
        GlutenScan.query.filter(
            GlutenScan.user_id == user.id,
            GlutenScan.created_at >= datetime.combine(today - timedelta(days=3), datetime.min.time()),
        ).count()
    )
    gluten_events = f"{gs_count} scan(s) in last 3 days"

    # Generate with Gemini if available
    from config import Config
    api_key = Config.GEMINI_API_KEY
    disclaimer = "仅供参考，不构成医疗建议，请遵医嘱"
    if not api_key:
        return jsonify({
            "suggestion": None,
            "disclaimer": disclaimer,
            "note": "Gemini API key missing; returning no suggestion"
        })
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = (
            "你是一名健康生活建议助手。\n"
            f"已知用户怀孕 {weeks or '未知'} 周（孕期分期 {tri}），记录症状：{symptom_name}，严重程度 {severity}/5。\n"
            f"最近一次甲状腺化验（{(last_tsh or last_ft4).test_date.isoformat() if (last_tsh or last_ft4) else '无'}）"
            f"TSH={last_tsh.result if last_tsh else 'NA'} mIU/L, FT4={last_ft4.result if last_ft4 else 'NA'} ng/dL。\n"
            f"最近 3 天 Gluten Snap 结果：{gluten_events}。\n"
            "请用简洁、温和、无医疗处方的语言，提供 1-2 条生活建议，例如饮食、休息、记录习惯等。\n"
            "请避免诊断和药物调整建议。\n"
            "在结尾加“仅供参考，不构成医疗建议，请遵医嘱”。"
        )
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        return jsonify({"suggestion": text, "disclaimer": disclaimer})
    except Exception as e:
        return jsonify({"suggestion": None, "disclaimer": disclaimer, "error": str(e)}), 200
