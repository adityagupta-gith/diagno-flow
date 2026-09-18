# Diagnostic AI - Live URL Deployment Guide (Ship It Track)

This guide provides step-by-step instructions to deploy the **Diagnostic AI** platform to obtain live URLs for the hackathon / production submission.

---

## Architecture Overview

- **Backend**: FastAPI Python service (`/api/diagnose`, `/health`) containerized via Docker.
- **AI Integration**: Amazon Bedrock (`bedrock-runtime`) for generative clinical triage with automatic rule-engine fallback.
- **Frontend**: Next.js 14 (App Router) dark-themed dashboard containerized or hosted on Vercel.

---

## Option A: One-Command Cloud VM Deployment (AWS EC2 / Render / DigitalOcean)

Using `docker-compose.yml`:

```bash
# 1. Clone repository on server
git clone <your-repo-url>
cd diagnostic-ai

# 2. Add AWS Bedrock Environment Variables (Optional for live Bedrock AI, default fallback works out-of-the-box)
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# 3. Launch both services
docker-compose up -d --build
```

- **Backend Live URL**: `http://<your-server-ip>:8000`
- **Frontend Live URL**: `http://<your-server-ip>:3000`

---

## Option B: Managed Serverless Deployment (Vercel + AWS App Runner / Render)

### Step 1: Deploy Backend to AWS App Runner / Render

#### Using Render.com:
1. Connect GitHub repository.
2. Select `backend` directory.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables:
   - `AWS_REGION`: `us-east-1`
   - `AWS_ACCESS_KEY_ID`: `<YOUR_AWS_KEY>`
   - `AWS_SECRET_ACCESS_KEY`: `<YOUR_AWS_SECRET>`
6. Deploy to obtain backend URL: `https://diagnostic-ai-backend.onrender.com`

---

### Step 2: Deploy Frontend to Vercel

1. Install Vercel CLI or import GitHub repo into Vercel Dashboard.
2. Root Directory: `frontend`
3. Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://diagnostic-ai-backend.onrender.com`
4. Run deployment:
   ```bash
   cd frontend
   vercel --prod
   ```
5. Obtain live production URL: `https://diagnostic-ai.vercel.app`

---

## Local Verification Commands

### Run Backend Locally:
```bash
cd backend
.venv\Scripts\activate   # Windows
# or source .venv/bin/activate (Linux/Mac)
uvicorn app.main:app --reload --port 8000
```

### Run Frontend Locally:
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.
