from __future__ import annotations

from datetime import date, timedelta
from typing import Dict


def _classify_trimester(weeks: int | None) -> str:
    if weeks is None:
        return "-"
    if weeks <= 12:
        return "T1"
    if weeks <= 27:
        return "T2"
    return "T3"


def calculate_by_lmp(lmp_date: date, today: date) -> Dict[str, object]:
    if lmp_date is None or today is None:
        return {"weeks": None, "days": None, "trimester": "-"}
    days_delta = (today - lmp_date).days
    if days_delta < 0:
        return {"weeks": None, "days": None, "trimester": "-"}
    weeks = days_delta // 7
    days = days_delta % 7
    return {"weeks": weeks, "days": days, "trimester": _classify_trimester(weeks)}


def calculate_by_due(due_date: date, today: date) -> Dict[str, object]:
    if due_date is None or today is None:
        return {"weeks": None, "days": None, "trimester": "-"}
    lmp = due_date - timedelta(days=280)
    return calculate_by_lmp(lmp, today)


