# 🩺 DiagnoFlow AI — Autonomous Clinical Triage Copilot

> A dual-path, edge-resilient emergency triage engine combining **Amazon Bedrock (Claude 3)** with an offline-capable deterministic scoring engine for frontline clinical decision support.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat&logo=next.js)](https://nextjs.org)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Amazon%20Bedrock-FF9900?style=flat&logo=amazon-aws)](https://aws.amazon.com/bedrock/)

---

## 📌 Problem Statement
In emergency departments and primary healthcare centers, doctors and triage nurses evaluate critical patient admissions under severe cognitive fatigue. Delayed risk stratification during acute myocardial infarctions, septic shock, or acute hypoxia contributes to preventable clinical deterioration.

**DiagnoFlow** delivers sub-second risk classification, red-flag alert extraction, and ranked differential diagnoses paired with standardized ICD-10 diagnostic mapping and clinical action checklists.

---

## ⚡ Key Features

- **Sub-60ms Clinical Triage:** Evaluates patient telemetry (HR, SpO2, SBP/DBP, Resp, Temp) alongside chief complaints in real time.
- **Dual-Path Resilient Architecture:** 
  - **Primary Path:** Invokes **Amazon Bedrock** (Anthropic Claude 3 Haiku/Sonnet) for deep probabilistic reasoning and structured clinical workflows.
  - **Deterministic Edge Fallback:** Instant offline rule engine (~56ms) that handles triage uninterrupted if cloud or internet access drops.
- **Automated ICD-10 Mapping:** Ranks top clinical differentials with matched diagnostic codes and confidence scores.
- **Clinical Directive Engine:** Auto-generates critical nursing tasks (e.g., immediate 12-lead ECG within 10 minutes, targeted lab panels).
- **Interactive Telemetry Dashboard:** Dynamic sliders, alert flags, and pre-configured emergency presets (Acute Coronary Syndrome, Acute Hypoxia, Cephalea).

---

## 🏗️ Architecture Overview

┌────────────────────────────────────────────────────────┐
│           Next.js 14 Frontend Dashboard                │
│       (Dynamic Telemetry Sliders & Emergency Gauges)   │
└───────────────────────────┬────────────────────────────┘
│ JSON Telemetry Payload
▼
┌────────────────────────────────────────────────────────┐
│              FastAPI Microservice (Backend)             │
│         (Pydantic Schema Validation & Sanitization)    │
└─────────────┬────────────────────────────┬─────────────┘
│ (Primary Path)             │ (Offline Fallback)
▼                            ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│   Amazon Bedrock API      │  │  Deterministic Medical  │
│ (Claude 3 via boto3 SDK)  │  │   Rule Engine (<60ms)   │
└─────────────┬─────────────┘  └───────────┬─────────────┘
│                            │
└─────────────┬──────────────┘
▼
┌───────────────────────────┐
│ Normalized JSON Response  │
│  - Priority Badge         │
│  - ICD-10 Diagnoses       │
│  - Emergency Action Steps │
└───────────────────────────┘


---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Lucide Icons
- **Backend:** Python 3.10+, FastAPI, Uvicorn, Pydantic
- **AI & Cloud Services:** 
  - **Amazon Bedrock** (Anthropic Claude 3 Haiku / Sonnet models)
  - **AWS SDK (`boto3`)** using `bedrock-runtime` client
  - **AWS IAM** (Scoped least-privilege invocation access)
- **Deployment:** Vercel (Frontend), Docker-ready containerization (Backend)

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)<your-username>/<your-repo-name>.git
cd <your-repo-name>
2. Backend Setup (FastAPI)
Bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
Set up your .env configuration:

Code snippet
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
Run the backend server:

Bash
uvicorn main:app --reload --port 8000
3. Frontend Setup (Next.js)
Bash
cd ../frontend
npm install
npm run dev
Open http://localhost:3000 to view the dashboard.

🔒 Security & Medical Disclaimers
Credential Protection: All AWS credentials and keys are isolated using environment variables and strictly ignored via .gitignore.

Clinical Scope: DiagnoFlow is an emergency clinical decision-support copilot designed for assisted triage prioritization by qualified medical personnel.
