from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User
from app.schemas import DashboardMetricsResponse, HotspotResponse, PublicOverviewResponse
from app.services.analytics_service import get_dashboard_analytics, calculate_hotspots
from app.services.auth_service import require_roles
from app.models import Challenge, Project, ChallengeAnalysis

router = APIRouter(prefix="/api", tags=["analytics"])

@router.get("/overview", response_model=PublicOverviewResponse)
def get_public_overview(db: Session = Depends(get_db)):
    """Public/shared aggregate metrics for homepage accessible to all roles and guests."""
    total_ch = db.query(Challenge).count()
    high_crit = db.query(ChallengeAnalysis).filter(ChallengeAnalysis.priority_level.in_(["HIGH", "CRITICAL"])).count()
    in_prog = db.query(Project).filter(Project.status.in_(["ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING"])).count()
    resolved = db.query(Challenge).filter(Challenge.status == "RESOLVED").count()

    return PublicOverviewResponse(
        total_challenges=total_ch,
        high_critical_challenges=high_crit,
        in_progress_projects=in_prog,
        resolved_challenges=resolved
    )

@router.get("/analytics/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["GOVERNMENT_ADMIN"]))
):
    """Restricted to GOVERNMENT_ADMIN. Returns 403 Forbidden for Citizens or Universities."""
    metrics = get_dashboard_analytics(db)
    return DashboardMetricsResponse(**metrics)

@router.get("/analytics/hotspots", response_model=List[HotspotResponse])
def get_hotspot_clusters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["GOVERNMENT_ADMIN", "UNIVERSITY", "CITIZEN", "INDUSTRY_PARTNER", "EXPERT"]))
):
    """Returns spatial hotspot clusters for GIS Map (accessible to all authenticated roles)."""
    hotspots = calculate_hotspots(db)
    return [HotspotResponse(**h) for h in hotspots]
