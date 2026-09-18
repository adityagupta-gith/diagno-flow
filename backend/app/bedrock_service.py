import os
import json
import uuid
import time
from datetime import datetime, timezone
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.schemas import (
    DiagnosisRequest,
    DiagnosisResponse,
    DiagnosticFinding,
    RiskCategory,
)

# Configuration from Environment
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")


def get_bedrock_client():
    """Initializes and returns boto3 bedrock-runtime client if credentials exist."""
    try:
        # boto3 automatically picks up AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION or IAM role
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
        return client
    except Exception as e:
        print(f"[BedrockService] Client initialization info: {e}")
        return None


def run_clinical_triage(request: DiagnosisRequest) -> DiagnosisResponse:
    """
    Main triage handler: tries Amazon Bedrock generative analysis first;
    falls back seamlessly to rule-based clinical engine if Bedrock is not configured.
    """
    start_time = time.time()
    diagnosis_id = f"DX-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()

    client = get_bedrock_client()

    if client:
        try:
            prompt = f"""You are a board-certified Emergency Diagnostic AI Assistant.
Analyze the following patient presentation and provide a structured clinical triage assessment in valid JSON format ONLY.

Patient Profile:
- ID: {request.patient_id}
- Age: {request.age}, Gender: {request.gender}
- Primary Symptoms: {", ".join(request.symptoms)}
- Medical History: {", ".join(request.medical_history or ["None reported"])}
- Notes: {request.urgency_notes or "None"}

Vital Signs:
- Heart Rate: {request.vitals.heart_rate} bpm
- BP: {request.vitals.blood_pressure_sys}/{request.vitals.blood_pressure_dia} mmHg
- SpO2: {request.vitals.oxygen_saturation}%
- Temperature: {request.vitals.body_temperature_c} °C
- Respiratory Rate: {request.vitals.respiratory_rate} breaths/min

Respond strictly with JSON containing these exact keys:
{{
    "risk_category": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
    "risk_score": 0 to 100,
    "primary_findings": [
        {{
            "condition_name": "Condition",
            "probability": 0.85,
            "icd10_code": "ICD-10",
            "severity": "Critical" | "High" | "Moderate" | "Low",
            "recommended_actions": ["Action 1", "Action 2"]
        }}
    ],
    "recommended_tests": ["Test 1", "Test 2"],
    "red_flags": ["Warning 1"],
    "clinical_summary": "Concise medical assessment summary."
}}"""

            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "temperature": 0.2,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })

            response = client.invoke_model(
                modelId=BEDROCK_MODEL_ID,
                contentType="application/json",
                accept="application/json",
                body=body
            )

            response_body = json.loads(response.get("body").read().decode("utf-8"))
            content_text = response_body["content"][0]["text"]
            
            # Extract JSON payload if wrapped in markdown code blocks
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0].strip()
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0].strip()

            parsed = json.loads(content_text)

            findings = [
                DiagnosticFinding(
                    condition_name=f["condition_name"],
                    probability=float(f["probability"]),
                    icd10_code=f["icd10_code"],
                    severity=f["severity"],
                    recommended_actions=f["recommended_actions"],
                )
                for f in parsed.get("primary_findings", [])
            ]

            proc_time = round((time.time() - start_time) * 1000, 2)
            return DiagnosisResponse(
                diagnosis_id=diagnosis_id,
                timestamp=timestamp,
                patient_id=request.patient_id,
                risk_category=RiskCategory(parsed["risk_category"]),
                risk_score=int(parsed["risk_score"]),
                primary_findings=findings,
                recommended_tests=parsed.get("recommended_tests", []),
                red_flags=parsed.get("red_flags", []),
                clinical_summary=parsed.get("clinical_summary", ""),
                engine_used=f"Amazon Bedrock ({BEDROCK_MODEL_ID})",
                processing_time_ms=proc_time,
            )
        except (BotoCoreError, ClientError, Exception) as err:
            print(f"[BedrockService] Bedrock invocation error/fallback: {err}")

    # Fallback Clinical Triage Rule Engine
    return run_rule_based_fallback(request, diagnosis_id, timestamp, start_time)


def run_rule_based_fallback(
    request: DiagnosisRequest, diagnosis_id: str, timestamp: str, start_time: float
) -> DiagnosisResponse:
    """Clinical rule-based triage fallback engine."""
    vitals = request.vitals
    symptoms_lower = [s.lower() for s in request.symptoms]
    red_flags = []
    recommended_tests = []
    findings = []

    risk_score = 15
    category = RiskCategory.LOW

    # Vitals check
    if vitals.oxygen_saturation < 90.0:
        risk_score += 45
        red_flags.append("Severe Hypoxia (SpO2 < 90%)")
        recommended_tests.append("Arterial Blood Gas (ABG)")
        recommended_tests.append("Chest X-Ray / CT Angiography")
    elif vitals.oxygen_saturation < 94.0:
        risk_score += 20
        red_flags.append("Mild-Moderate Hypoxia (SpO2 < 94%)")

    if vitals.heart_rate > 130:
        risk_score += 25
        red_flags.append("Severe Tachycardia (HR > 130 bpm)")
        recommended_tests.append("12-Lead ECG")
    elif vitals.heart_rate > 100:
        risk_score += 15
        recommended_tests.append("12-Lead ECG")
    elif vitals.heart_rate < 50:
        risk_score += 20
        red_flags.append("Bradycardia (HR < 50 bpm)")
        recommended_tests.append("12-Lead ECG")

    if vitals.blood_pressure_sys > 180 or vitals.blood_pressure_dia > 110:
        risk_score += 30
        red_flags.append("Hypertensive Crisis Risk (BP > 180/110 mmHg)")
        recommended_tests.append("Head CT (Non-Contrast)")
        recommended_tests.append("Serum Creatinine & Troponin")
    elif vitals.blood_pressure_sys < 90:
        risk_score += 35
        red_flags.append("Severe Hypotension / Shock State (Systolic BP < 90 mmHg)")
        recommended_tests.append("Lactate Level & Blood Cultures")

    if vitals.body_temperature_c >= 38.5:
        risk_score += 15
        recommended_tests.append("Complete Blood Count (CBC)")
        recommended_tests.append("Blood Cultures")

    # Symptom matching rules
    if any(kw in s for s in symptoms_lower for kw in ["chest pain", "crushing", "angina", "left arm"]):
        risk_score += 35
        red_flags.append("Acute Coronary Syndrome Flag")
        recommended_tests.append("High-Sensitivity Cardiac Troponin T/I")
        recommended_tests.append("12-Lead ECG (Stat)")
        findings.append(
            DiagnosticFinding(
                condition_name="Acute Coronary Syndrome (ACS) / Myocardial Infarction",
                probability=0.88 if vitals.heart_rate > 100 or vitals.blood_pressure_sys > 140 else 0.72,
                icd10_code="I21.9",
                severity="Critical",
                recommended_actions=[
                    "Immediate 12-lead ECG within 10 minutes",
                    "Administer Aspirin 325mg if not contraindicated",
                    "Continuous telemetry monitoring & Cardiology Consult",
                ],
            )
        )

    if any(kw in s for s in symptoms_lower for kw in ["shortness of breath", "dyspnea", "wheezing", "gasping"]):
        risk_score += 25
        if not any(f.icd10_code == "I26.99" for f in findings):
            findings.append(
                DiagnosticFinding(
                    condition_name="Pulmonary Embolism / Acute Respiratory Distress",
                    probability=0.79 if vitals.oxygen_saturation < 94 else 0.61,
                    icd10_code="I26.99",
                    severity="High",
                    recommended_actions=[
                        "Supplemental Oxygen to maintain SpO2 > 94%",
                        "D-Dimer panel & CTA Chest",
                        "Assess Wells Score for PE risk",
                    ],
                )
            )

    if any(kw in s for s in symptoms_lower for kw in ["fever", "chills", "confusion", "slurred speech"]):
        risk_score += 20
        findings.append(
            DiagnosticFinding(
                condition_name="Severe Sepsis / Systemic Infection",
                probability=0.74 if vitals.body_temperature_c >= 38.5 else 0.55,
                icd10_code="A41.9",
                severity="High",
                recommended_actions=[
                    "Initiate Sepsis 1-Hour Bundle",
                    "Broad-spectrum IV Antibiotics after cultures",
                    "30 mL/kg IV Fluid resuscitation",
                ],
            )
        )

    if any(kw in s for s in symptoms_lower for kw in ["headache", "migraine", "dizziness", "nausea"]):
        if not findings:
            findings.append(
                DiagnosticFinding(
                    condition_name="Acute Cephalea / Hypertensive Encephalopathy",
                    probability=0.64 if vitals.blood_pressure_sys > 150 else 0.45,
                    icd10_code="R51.9",
                    severity="Moderate",
                    recommended_actions=[
                        "Neurological assessment",
                        "Pain control and hydration",
                        "Re-check blood pressure in 30 minutes",
                    ],
                )
            )

    # Default finding if no specific match
    if not findings:
        findings.append(
            DiagnosticFinding(
                condition_name="Undifferentiated Acute Presentation",
                probability=0.50,
                icd10_code="R69",
                severity="Low" if risk_score < 40 else "Moderate",
                recommended_actions=[
                    "Complete physical examination",
                    "Comprehensive Metabolic Panel (CMP)",
                    "Observation and vitals re-assessment",
                ],
            )
        )
        recommended_tests.append("Comprehensive Metabolic Panel (CMP)")
        recommended_tests.append("Urinalysis")

    # Risk category calculation
    risk_score = min(100, max(5, risk_score))
    if risk_score >= 70:
        category = RiskCategory.CRITICAL
    elif risk_score >= 50:
        category = RiskCategory.HIGH
    elif risk_score >= 30:
        category = RiskCategory.MODERATE
    else:
        category = RiskCategory.LOW

    # Deduplicate arrays
    recommended_tests = list(dict.fromkeys(recommended_tests))
    red_flags = list(dict.fromkeys(red_flags))

    proc_time = round((time.time() - start_time) * 1000, 2)
    return DiagnosisResponse(
        diagnosis_id=diagnosis_id,
        timestamp=timestamp,
        patient_id=request.patient_id,
        risk_category=category,
        risk_score=risk_score,
        primary_findings=findings,
        recommended_tests=recommended_tests,
        red_flags=red_flags,
        clinical_summary=f"Patient presents with {len(request.symptoms)} reported symptoms and vitals indicating {category.value} clinical urgency. Evaluated via rule-based diagnostic matrix.",
        engine_used="Clinical Rule Engine (Amazon Bedrock Fallback Ready)",
        processing_time_ms=proc_time,
    )
