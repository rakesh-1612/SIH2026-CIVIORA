import os
import sys

# Ensure backend directory is in sys.path when executed by Vercel
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.database import engine, Base
from app.seed_data import seed_database_if_empty
from app.routers import challenges, institutions, projects, analytics, auth, industry, notifications, funding, civi_connect

# Create DB tables
Base.metadata.create_all(bind=engine)

# Run initial DB seed if empty
seed_database_if_empty()

app = FastAPI(
    title="CIVIORA Digital Platform API",
    description="Smart India Hackathon API connecting citizens' societal challenges with universities, experts, and administrators.",
    version="1.0.0"
)

cors_origins_env = os.getenv("CORS_ORIGINS")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()] if cors_origins_env else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for evidence uploads
if os.getenv("VERCEL"):
    uploads_dir = "/tmp/uploads"
else:
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

from app.routers.challenges import router as challenges_router, upload_router
app.include_router(auth.router)
app.include_router(challenges_router)
app.include_router(upload_router)
app.include_router(institutions.router)
app.include_router(projects.router)
app.include_router(analytics.router)
app.include_router(industry.router)
app.include_router(notifications.router)
app.include_router(funding.router)
app.include_router(civi_connect.router)



@app.get("/")
def root():
    return {
        "status": "online",
        "system": "CIVIORA Civic Intelligence Platform API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
