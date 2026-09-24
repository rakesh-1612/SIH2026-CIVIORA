# CIVIORA — Civic Intelligence Digital Platform

CIVIORA is an end-to-end civic intelligence digital platform built to connect citizen societal challenges with universities, experts, industry/MSME partners, and municipal administrators.

---

## 🏗️ Production Architecture

```
                 CIVIORA DOMAIN (civiora.gov.in / civiora.com)
                                      |
                                      v
                             FRONTEND WEBSITE
                        (Vercel / Next.js 16 App Router)
                                      |
                                      v
                             BACKEND API SERVICE
                        (Render / FastAPI Python 3.11)
                                      |
                    +-----------------+-----------------+
                    |                                   |
             DATABASE SERVICE                    AI SERVICE ENGINE
      (PostgreSQL / Supabase / SQLite)   (SentenceTransformers NLP & Vector Math)
```

---

## 🌟 Core Capabilities & Features

1. **Citizen Challenge Reporting**: Geolocation-aware submission with photo/document evidence.
2. **AI Civic Intelligence**: Dynamic NLP text processing & vector embeddings for category prediction, keyword tag extraction, and stakeholder analysis.
3. **Explainable Priority Engine**: Algorithmic scoring based on severity, urgency, community impact, recurrence, and ULB entity weights.
4. **Semantic Duplicate Detection**: Dynamic Cosine Similarity for duplicate prevention (>=85% duplicate alert).
5. **Smart University Matching Engine**: Match challenges against accredited institutions and research departments.
6. **Solution Lifecycle Management**: University project workspace, milestone tracking, and stage transitions (Accepted → In Progress → Pilot → Deployed → Resolved).
7. **MSME & Industry Partnership Hub**: CSR co-funding, mentorship pairing, and technology transfer agreements.
8. **Civic Social Feed & Engagement Engine**: Interactive upvoting/likes, reposts, sharing, and verified public discussion threads.
9. **Civi-Connect Unified Collaboration Room**: Project-specific multi-stakeholder chat connecting citizens, researchers, MSMEs, and government officials.
10. **Government Admin Analytics & Geospatial Hotspots**: Real-time KPI summaries, priority breakdowns, interactive Leaflet mapping, and spatial hotspot cluster detection.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Leaflet Maps, Recharts, Framer Motion, Lucide Icons.
- **Backend**: FastAPI (Python 3.11), Uvicorn, Gunicorn, SQLAlchemy, Pydantic v2.
- **Database**: PostgreSQL (Production via Supabase / Render / Neon) / SQLite (Local Dev `civiora.db`).
- **AI / NLP**: `sentence-transformers` (`all-MiniLM-L6-v2`), `scikit-learn`, `numpy`.

---

## ⚙️ Environment Variables

### Frontend Environment Variables (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Backend Environment Variables (`backend/.env`)
```env
DATABASE_URL=sqlite:///civiora.db
JWT_SECRET=your-production-jwt-secret-key-change-this
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://civiora.vercel.app
AI_API_KEY=
PORT=8000
```

---

## 🚀 Local Development & Production Testing

### Single-Command Demo Startup
```bash
npm run dev
```

### Manual Development Setup

1. **Start Backend Service**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app/main.py
   ```
   API Docs available at `http://127.0.0.1:8000/docs`

2. **Start Frontend Web App**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Website available at `http://localhost:3000`

### Run Production Build Test
```bash
# Test Frontend Production Build
cd frontend
npm run build
npm start

# Test Backend Integration Tests
cd backend
python -m pytest
python test_all_native.py
```

---

## 🌐 Production Deployment Guide

### Option 1: Frontend on Vercel + Backend on Render (Recommended)

#### 1. Deploy Backend to Render
1. Push repository to GitHub.
2. Sign in to [Render](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Set Build Command: `pip install -r backend/requirements.txt`
5. Set Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add Environment Variables:
   - `PYTHON_VERSION`: `3.11.0`
   - `DATABASE_URL`: Your production PostgreSQL URL (e.g. Supabase / Render Postgres)
   - `CORS_ORIGINS`: `https://your-civiora-app.vercel.app`
   - `JWT_SECRET`: Secure random string
7. Note down your backend URL (e.g. `https://civiora-backend.onrender.com`).

#### 2. Deploy Frontend to Vercel
1. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import your Civiora GitHub repository.
3. Set Root Directory to `frontend`.
4. Framework Preset: **Next.js**.
5. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://civiora-backend.onrender.com`
6. Click **Deploy**.

---

### Option 2: Full Stack Deployment via Render Blueprint

Render uses the included [`render.yaml`](file:///c:/SIH%202026/CIVIORA/render.yaml) file to spin up both frontend and backend automatically.
1. In Render, select **Blueprint**.
2. Connect the Civiora repository.
3. Render will deploy both `civiora-backend` and `civiora-frontend`.

---

## 🔗 Custom Domain Setup

To link a custom domain (e.g., `civiora.gov.in` or `civiora.com`):
1. In **Vercel Dashboard** → **Project Settings** → **Domains**.
2. Add `civiora.gov.in`.
3. Add a CNAME record in your DNS provider pointing `@` or `www` to `cname.vercel-dns.com`.
4. HTTPS SSL certificates are provisioned automatically.

---

## 🔒 Security & Best Practices

- Secret keys are kept strictly server-side.
- CORS policies limit unauthorized frontend origins.
- Inputs are validated via Pydantic schemas and Next.js client forms.
- Dynamic fallback handles external service delays cleanly without exposing stack traces.
