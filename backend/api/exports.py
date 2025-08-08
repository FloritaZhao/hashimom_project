from __future__ import annotations
from typing import Any, List

from flask import Blueprint, jsonify, request
from .utils import current_user
from models import Symptom, Profile, Lab, GlutenScan, db, Medication
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


@bp.route('/exports/seed_correlation_demo', methods=['POST'])
def seed_correlation_demo() -> Any:
    """Seed demo data for EventCorrelationMap.

    Query params:
      variant = 'basic' | 'rich'  (default: basic)

    basic: minimal set (D-7..D0 few points)
    rich:  2-week window with two clusters, multiple analytes and symptoms
    """
    user = _u()
    from datetime import date, time
    today = datetime.utcnow().date()

    def d(n: int) -> date:
        from datetime import timedelta
        return today - timedelta(days=n)

    variant = (request.args.get('variant') or 'basic').lower().strip()

    # Labs
    created_labs = 0
    def add_lab(days_ago: int, name: str, value: float, unit: str):
        nonlocal created_labs
        exists = Lab.query.filter_by(user_id=user.id, test_name=name, test_date=d(days_ago), result=str(value)).first()
        if not exists:
            db.session.add(Lab(user_id=user.id, test_name=name, result=str(value), units=unit, test_date=d(days_ago)))
            created_labs += 1

    if variant == 'rich':
        # TSH trend rising toward today with more points
        tsh_points = [21, 17, 14, 10, 7, 5, 3, 0]
        tsh_vals =  [1.2, 1.0, 0.9, 1.1, 1.6, 2.2, 2.8, 3.3]
        for day, val in zip(tsh_points, tsh_vals):
            add_lab(day, 'TSH', val, 'mIU/L')
        # FT4 slight decline
        ft4_points = [21, 14, 10, 7, 5, 3, 0]
        ft4_vals =  [1.3, 1.2, 1.15, 1.1, 1.0, 0.9, 0.85]
        for day, val in zip(ft4_points, ft4_vals):
            add_lab(day, 'FT4', val, 'ng/dL')
        # TPOAb stable low
        for day in [21, 10, 0]:
            add_lab(day, 'TPOAb', 28.0, 'IU/mL')
        # FT3 stable
        for day in [21, 7, 0]:
            add_lab(day, 'FT3', 3.2, 'pg/mL')
    else:
        for row in [(7, 1.4), (5, 1.1), (2, 1.8), (0, 3.3)]:
            add_lab(row[0], 'TSH', row[1], 'mIU/L')

    # Symptoms
    from models import Symptom
    created_syms = 0
    def add_sym(days_ago: int, name: str, sev: int, note: str | None, hour: int = 9):
        nonlocal created_syms
        ts = datetime.combine(d(days_ago), time(hour=hour))
        db.session.add(Symptom(user_id=user.id, symptom=name, severity=sev, note=note, logged_at=ts))
        created_syms += 1

    if variant == 'rich':
        # Cluster A around D-8..D-7 (gluten + fatigue↑ + TSH↑)
        add_sym(8, 'fatigue', 2, None, 9)
        add_sym(7, 'fatigue', 3, 'after dinner', 20)
        add_sym(7, 'bloating', 3, None, 21)
        # Cluster B around D-2..D0
        add_sym(2, 'fatigue', 4, None)
        add_sym(2, 'bloating', 3, None)
        add_sym(0, 'fatigue', 5, 'worse than usual')
        add_sym(0, 'palpitations', 3, None)
    else:
        for row in [(2, 'fatigue', 3, 'felt tired'), (2, 'bloating', 2, None), (1, 'fatigue', 4, None), (1, 'bloating', 3, None), (0, 'fatigue', 5, 'worse than usual'), (0, 'palpitations', 3, None)]:
            add_sym(row[0], row[1], row[2], row[3])

    # Gluten suspect
    created_gluten = 0
    def add_gluten(days_ago: int, tag: str = 'gluten_likely', hour: int = 12):
        nonlocal created_gluten
        gs = GlutenScan.query.filter(
            GlutenScan.user_id == user.id,
            GlutenScan.created_at >= datetime.combine(d(days_ago), datetime.min.time()),
            GlutenScan.created_at <= datetime.combine(d(days_ago), datetime.max.time()),
        ).first()
        if not gs:
            db.session.add(GlutenScan(user_id=user.id, image_url='<seed>', result_tag=tag, created_at=datetime.combine(d(days_ago), time(hour=hour))))
            created_gluten += 1

    if variant == 'rich':
        add_gluten(7)   # Cluster A
        add_gluten(2)   # Cluster B
    else:
        add_gluten(2)

    db.session.commit()
    return jsonify({"status": "ok", "variant": variant, "labs_seeded": created_labs, "symptoms_seeded": created_syms, "gluten_seeded": created_gluten})

