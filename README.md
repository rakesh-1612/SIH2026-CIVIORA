# CIVIORA — Smart India Hackathon Digital Platform

CIVIORA is an end-to-end civic intelligence digital platform built to connect citizen societal challenges with universities, experts, industry partners, and municipal administrators.

---

## 🌟 Key Features

1. **Citizen Challenge Submission**: Validate & log civic reports with location coordinates.
2. **AI Challenge Intelligence**: Sentence-transformer text embeddings (`all-MiniLM-L6-v2`) for category extraction & keyword detection.
3. **Explainable Priority Scoring**: Mathematical weighted formula `(severity * 0.35) + (urgency * 0.25) + (impact * 0.25) + (recurrence * 0.15)` (0-100 scale).
4. **Semantic Duplicate Detection**: Dynamic vector cosine similarity (>=85% Potential Duplicate, 70-84% Related, <70% Different).
5. **Smart University Matching**: Match challenges against 15+ institution research profiles.
6. **Challenge Explorer**: Catalog with real-time category, priority, and status filters.
7. **Institution Hub**: University workspace to review matches and accept solution projects.
8. **Project Lifecycle Management**: Milestone checklist and real-time solution progress tracking.
9. **Government Analytics Dashboard**: Real-time KPI summary, category distributions, priority breakdowns, and audit activity feeds.
10. **Geospatial Map & Hotspots**: Interactive Leaflet map with spatial hotspot cluster detection.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Leaflet, Recharts, Lucide Icons
- **Backend**: Python 3.11, FastAPI, Uvicorn, SQLAlchemy
- **Database**: SQLite (`civiora.db`)
- **AI / NLP**: `sentence-transformers` (`all-MiniLM-L6-v2`), `scikit-learn`

---

## 🚀 How to Run Locally

### 1. Start FastAPI Backend (Port 8000)
```bash
cd backend
python -m pip install -r requirements.txt
python app/seed_data.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: http://127.0.0.1:8000/docs

### 2. Start Next.js Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev -- -p 3000
```
Frontend Web App will be available at: http://localhost:3000

---

## 🧪 Run Automated Integration Tests
```bash
cd backend
python test_scenarios.py
```
