from __future__ import annotations
from typing import Any, List

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import Symptom, Profile, Lab, GlutenScan
from datetime import datetime, timedelta

bp = Blueprint("exports", __name__)

def _u(): return current_user()

@bp.before_request
def _auth():
    if request.method == 'OPTIONS':
        return
    if not _u():
        return jsonify(error="Unauthorized"), 401

@bp.route('/exports/summary', methods=['GET'])
def export_summary() -> Any:
    """Aggregate summary including recent symptoms with AI suggestions.

    Query params:
      days: lookback window (default 30)
    """
    days = 30
    try:
        days = int(request.args.get('days', days))
    except Exception:
        pass
    user = _u()
    since = datetime.utcnow() - timedelta(days=days)

    # Load pregnancy profile
    prof = Profile.query.filter_by(user_id=user.id).first()
    tri = '-'
    if prof:
        from datetime import date as _date
        from utils.gestation import calculate_by_lmp, calculate_by_due
        today = _date.today()
        if prof.lmp_date:
            tri = calculate_by_lmp(prof.lmp_date, today).get('trimester', '-')  # type: ignore
        elif prof.due_date:
            tri = calculate_by_due(prof.due_date, today).get('trimester', '-')  # type: ignore

    # Recent labs (last TSH/FT4)
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

    # Gluten scans last 3 days summary
    gs_count = (
        GlutenScan.query.filter(
            GlutenScan.user_id == user.id,
            GlutenScan.created_at >= datetime.utcnow() - timedelta(days=3),
        ).count()
    )
    gluten_events = f"{gs_count} scan(s) in last 3 days"

    # Recent symptoms
    symptoms = (
        Symptom.query.filter(Symptom.user_id == user.id, Symptom.logged_at >= since)
        .order_by(Symptom.logged_at.desc(), Symptom.id.desc())
        .all()
    )

    # Optional AI suggestions per symptom (keep fast: only latest 10)
    out: List[dict] = []
    from config import Config
    api_key = Config.GEMINI_API_KEY
    disclaimer = "仅供参考，不构成医疗建议，请遵医嘱"
    use_ai = bool(api_key)

    model = None
    if use_ai:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash')
        except Exception:
            model = None
            use_ai = False

    for s in symptoms:
        row = {
            "date": s.logged_at.date().isoformat(),
            "symptom_name": s.symptom,
            "severity": s.severity,
            "note": s.note,
            "ai_suggestion": None,
            "disclaimer": disclaimer,
        }
        if use_ai and model:
            try:
                prompt = (
                    "你是一名健康生活建议助手。\n"
                    f"孕期分期 {tri}，症状：{s.symptom}，严重程度 {s.severity}/5。\n"
                    f"最近一次甲状腺化验（{(last_tsh or last_ft4).test_date.isoformat() if (last_tsh or last_ft4) else '无'}）"
                    f"TSH={last_tsh.result if last_tsh else 'NA'} mIU/L, FT4={last_ft4.result if last_ft4 else 'NA'} ng/dL。\n"
                    f"最近 3 天 Gluten Snap 结果：{gluten_events}。\n"
                    "请用简洁、温和、无医疗处方的语言，提供 1-2 条生活建议；避免诊断和药物建议。\n"
                    "在结尾加“仅供参考，不构成医疗建议，请遵医嘱”。"
                )
                resp = model.generate_content(prompt)
                row["ai_suggestion"] = resp.text.strip()
            except Exception:
                pass
        out.append(row)

    payload = {
        "symptoms_with_ai": out,
        "meta": {
            "lookback_days": days,
            "disclaimer": disclaimer,
        },
    }
    return jsonify(payload)


