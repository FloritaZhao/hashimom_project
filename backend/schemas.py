"""Pydantic request / response schemas."""
from datetime import date, datetime
from pydantic import BaseModel, Field

# --- Labs ---
class LabIn(BaseModel):
    test_name: str = Field(min_length=1)
    result: str
    units: str | None = None
    test_date: date = Field(default_factory=date.today)

# --- Symptoms ---
class SymptomIn(BaseModel):
    symptom: str = Field(min_length=1)
    severity: int = Field(ge=0, le=10)
    note: str | None = None
    logged_at: datetime | None = None

# --- Medications ---
class MedicationIn(BaseModel):
    medication_name: str = Field(min_length=1)
    dose: str | None = None
    time_of_day: str | None = None
    taken_at: datetime | None = None
 
# --- Profiles ---
class ProfileIn(BaseModel):
    lmp_date: date | None = None
    due_date: date | None = None
    high_risk_notes: str | None = None


class ProfileOut(BaseModel):
    lmp_date: date | None
    due_date: date | None
    high_risk_notes: str
    gestational_age_weeks: int | None
    trimester: str