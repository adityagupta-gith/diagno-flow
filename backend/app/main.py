from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.schemas import DiagnosisRequest, DiagnosisResponse
from app.bedrock_service import run_clinical_triage, get_bedrock_client, AWS_REGION, BEDROCK_MODEL_ID

# Load environment variables from .env file if available
load_dotenv()

app = FastAPI(
    title="Diagnostic AI API Service",
    description="Generative Clinical Triage Engine powered by Amazon Bedrock & FastAPI",
    version="1.0.0",
)

# Enable CORS for frontend web application integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production setup can restrict to specific frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "service": "Diagnostic AI API Service",
        "status": "online",
        "endpoints": ["/health", "/api/diagnose"],
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    client_status = "connected" if get_bedrock_client() is not None else "fallback_mode"
    return {
        "status": "healthy",
        "service": "diagnostic-ai-backend",
        "bedrock_integration": {
            "status": client_status,
            "region": AWS_REGION,
            "model_id": BEDROCK_MODEL_ID,
        },
    }


@app.post("/api/diagnose", response_model=DiagnosisResponse, status_code=status.HTTP_200_OK)
def diagnose_patient(request: DiagnosisRequest):
    """
    Main diagnostic endpoint performing real-time triage analysis on patient symptoms & vitals.
    """
    try:
        response = run_clinical_triage(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostic processing failure: {str(e)}",
        )
