"""
Seed trimester reference ranges for key thyroid analytes.

DISCLAIMER: Example values for product validation only. Not medical advice.
Ranges should be adjusted per laboratory reference intervals.
"""

from __future__ import annotations

from models import db, ReferenceRange
from app import create_app


SEED = [
    ("TSH", "T1", 0.1, 2.5, "mIU/L"),
    ("TSH", "T2", 0.2, 3.0, "mIU/L"),
    ("TSH", "T3", 0.3, 3.0, "mIU/L"),
    ("FT4", "T1", 0.8, 1.7, "ng/dL"),
    ("FT4", "T2", 0.7, 1.6, "ng/dL"),
    ("FT4", "T3", 0.7, 1.5, "ng/dL"),
    ("TPOAB", "T1", 0.0, 35.0, "IU/mL"),
    ("TPOAB", "T2", 0.0, 35.0, "IU/mL"),
    ("TPOAB", "T3", 0.0, 35.0, "IU/mL"),
    ("TGAB", "T1", 0.0, 35.0, "IU/mL"),
    ("TGAB", "T2", 0.0, 35.0, "IU/mL"),
    ("TGAB", "T3", 0.0, 35.0, "IU/mL"),
]


def seed() -> None:
    app = create_app()
    with app.app_context():
        for analyte, tri, low, high, unit in SEED:
            existing = ReferenceRange.query.filter_by(analyte=analyte, trimester=tri).first()
            if existing:
                existing.low = low
                existing.high = high
                existing.unit = unit
            else:
                db.session.add(
                    ReferenceRange(analyte=analyte, trimester=tri, low=low, high=high, unit=unit)
                )
        db.session.commit()
        print("Reference ranges seeded/updated.")


if __name__ == "__main__":
    seed()


