from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class RiskCategory(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class VitalsInput(BaseModel):
    heart_rate: int = Field(..., ge=20, le=250, description="Heart rate in BPM")
    blood_pressure_sys: int = Field(..., ge=50, le=260, description="Systolic Blood Pressure mmHg")
    blood_pressure_dia: int = Field(..., ge=30, le=160, description="Diastolic Blood Pressure mmHg")
    oxygen_saturation: float = Field(..., ge=50.0, le=100.0, description="Oxygen Saturation SpO2 %")
    body_temperature_c: float = Field(..., ge=30.0, le=45.0, description="Body Temperature in Celsius")
    respiratory_rate: int = Field(..., ge=5, le=60, description="Respiratory Rate breaths/min")


class DiagnosisRequest(BaseModel):
    patient_id: str = Field(..., example="PAT-98241")
    age: int = Field(..., ge=0, le=120, example=58)
    gender: str = Field(..., example="Male")
    symptoms: List[str] = Field(..., example=["Chest Pain", "Shortness of Breath", "Diaphoresis"])
    vitals: VitalsInput
    medical_history: Optional[List[str]] = Field(default=[], example=["Hypertension", "Type 2 Diabetes"])
    urgency_notes: Optional[str] = Field(default="", example="Sudden onset severe crushing chest pressure radiate to left arm")


class DiagnosticFinding(BaseModel):
    condition_name: str
    probability: float = Field(..., ge=0.0, le=1.0)
    icd10_code: str
    severity: str
    recommended_actions: List[str]


class DiagnosisResponse(BaseModel):
    diagnosis_id: str
    timestamp: str
    patient_id: str
    risk_category: RiskCategory
    risk_score: int = Field(..., ge=0, le=100)
    primary_findings: List[DiagnosticFinding]
    recommended_tests: List[str]
    red_flags: List[str]
    clinical_summary: str
    engine_used: str
    processing_time_ms: float
