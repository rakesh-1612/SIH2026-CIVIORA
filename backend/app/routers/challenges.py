from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import os
import shutil
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Challenge, ChallengeAnalysis, ChallengeSimilarity, ChallengeMatch,
    ActivityLog, Project, User, Milestone, ProjectComment,
    ChallengeLike, ChallengeRepost, ChallengeShare, ChallengeComment, Notification
)
from app.services.auth_service import get_current_user, get_optional_current_user, require_roles
from app.services.ai_service import analyze_challenge_text
from app.services.priority_service import calculate_priority_score, calculate_community_boost
from app.services.duplicate_service import find_similar_challenges
from app.schemas import (
    ChallengeCreate, ChallengeDetailResponse, ChallengeAnalysisResponse,
    SimilarChallengeResponse, InstitutionMatchResponse, ChallengeCommentResponse,
    SocialCommentCreate, UserActivityResponse
)

router = APIRouter(prefix="/api/challenges", tags=["challenges"])
upload_router = APIRouter(prefix="/api/upload", tags=["upload"])

@upload_router.post("")
def upload_evidence(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Saves evidence file into backend /uploads directory and returns application-accessible URL.
    """
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    safe_name = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
    unique_filename = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    file_path = os.path.join(uploads_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    mime = file.content_type or ""
    ext_lower = ext.lower()
    if mime.startswith("image/") or ext_lower in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]:
        f_type = "IMAGE"
    elif mime.startswith("video/") or ext_lower in [".mp4", ".webm", ".avi", ".mov"]:
        f_type = "VIDEO"
    elif ext_lower == ".pdf":
        f_type = "PDF"
    else:
        f_type = "DOCUMENT"

    base_backend_url = os.getenv("BACKEND_URL", "").rstrip("/")
    if base_backend_url:
        file_url = f"{base_backend_url}/uploads/{unique_filename}"
    else:
        file_url = f"/uploads/{unique_filename}"

    return {
        "name": file.filename,
        "filename": unique_filename,
        "type": f_type,
        "url": file_url
    }

OFFICIAL_JHARKHAND_DISTRICTS = {
    "bokaro", "chatra", "deoghar", "dhanbad", "dumka",
    "east singhbhum", "garhwa", "giridih", "godda", "gumla",
    "hazaribagh", "jamtara", "khunti", "koderma", "latehar",
    "lohardaga", "pakur", "palamu", "ramgarh", "ranchi",
    "sahibganj", "saraikela-kharsawan", "simdega", "west singhbhum"
}

DISTRICT_ALIASES = {
    "jamshedpur": "East Singhbhum",
    "chaibasa": "West Singhbhum",
    "daltonganj": "Palamu",
    "jamshedpur / east singhbhum": "East Singhbhum"
}

JHARKHAND_DISTRICT_CENTERS = {
    "Bokaro": (23.6650, 86.1480),
    "Chatra": (24.2167, 84.8667),
    "Deoghar": (24.4833, 86.7000),
    "Dhanbad": (23.7957, 86.4304),
    "Dumka": (24.2667, 87.2500),
    "East Singhbhum": (22.7850, 86.1620),
    "Garhwa": (24.1833, 83.8167),
    "Giridih": (24.1900, 86.3000),
    "Godda": (24.8333, 87.2167),
    "Gumla": (23.0400, 84.5400),
    "Hazaribagh": (23.9833, 85.3500),
    "Jamtara": (23.9630, 86.8020),
    "Khunti": (23.0700, 85.2800),
    "Koderma": (24.4670, 85.5940),
    "Latehar": (23.7430, 84.4530),
    "Lohardaga": (23.4300, 84.6800),
    "Pakur": (24.6333, 87.8500),
    "Palamu": (24.0300, 84.0700),
    "Ramgarh": (23.6300, 85.5100),
    "Ranchi": (23.3524, 85.3242),
    "Sahibganj": (25.2500, 87.6500),
    "Saraikela-Kharsawan": (22.7000, 85.9300),
    "Simdega": (22.6167, 84.5167),
    "West Singhbhum": (22.5550, 85.8050)
}

def is_point_in_jharkhand_polygon(lat: float, lng: float) -> bool:
    """Ray casting algorithm against precise Jharkhand outer boundary polygon."""
    if not (21.8 <= lat <= 25.5 and 83.2 <= lng <= 88.0):
        return False
        
    polygon = [
        (24.35, 83.33),
        (24.80, 84.40),
        (24.98, 85.60),
        (25.32, 87.85),
        (24.60, 87.95),
        (23.85, 86.85),
        (22.65, 86.70),
        (21.96, 86.75),
        (21.96, 85.35),
        (22.35, 84.10),
        (23.10, 83.85),
        (23.90, 83.33)
    ]
    
    n = len(polygon)
    inside = False
    p1lat, p1lng = polygon[0]
    for i in range(n + 1):
        p2lat, p2lng = polygon[i % n]
        if lat > min(p1lat, p2lat):
            if lat <= max(p1lat, p2lat):
                if lng <= max(p1lng, p2lng):
                    if p1lat != p2lat:
                        xinters = (lat - p1lat) * (p2lng - p1lng) / (p2lat - p1lat) + p1lng
                    if p1lng == p2lng or lng <= xinters:
                        inside = not inside
        p1lat, p1lng = p2lat, p2lng

    return inside

def validate_jharkhand_geospatial(latitude: float, longitude: float, state: str, district: str, location_str: str) -> str:
    """
    Validates global geographic coordinates (-90 <= lat <= 90, -180 <= lng <= 180).
    Returns normalized district string if provided, or infers from location string.
    Supports global coordinates worldwide.
    """
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Please select a valid geographic location."
        )

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        raise HTTPException(
            status_code=400,
            detail="Coordinates are outside valid global geographic range."
        )

    dist_clean = (district or "").strip()
    if not dist_clean:
        dist_clean = (location_str or "").split(",")[0].strip() or "General"

    if dist_clean.lower() in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[dist_clean.lower()]

    return dist_clean.title()

def generate_challenge_id(db: Session) -> str:
    count = db.query(Challenge).count() + 1
    return f"CIV-2026-{count:03d}"

@router.post("", response_model=ChallengeDetailResponse)
def create_challenge(
    payload: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["CITIZEN", "GOVERNMENT_ADMIN"]))
):
    """
    Restricted to CITIZEN & GOVERNMENT_ADMIN.
    1. Validates global geospatial location
    2. Links citizen_id = current_user.id
    3. Saves challenge to SQLite
    4. Automatically runs AI analysis, Priority Scoring, Duplicate Detection, and Institution Matching
    """
    # Global Geospatial Validation
    norm_district = validate_jharkhand_geospatial(
        payload.latitude,
        payload.longitude,
        payload.state,
        payload.district,
        payload.location
    )

    lat = payload.latitude
    lng = payload.longitude

    ch_id = generate_challenge_id(db)

    # 1. AI Analysis & Category prediction
    ai_out = analyze_challenge_text(payload.title, payload.description, payload.urgency_level)
    cat = payload.category or ai_out["predicted_category"]

    import json
    media_json = json.dumps(payload.media_files) if payload.media_files else None

    req_lang = payload.language or "auto"
    from app.services.multilingual_service import detect_language
    if req_lang == "auto":
        req_lang = detect_language(f"{payload.title} {payload.description}")

    challenge = Challenge(
        id=ch_id,
        citizen_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=cat,
        subcategory=ai_out["subcategory"],
        location=payload.location,
        district=norm_district or payload.district or "General",
        state=payload.state or "India",
        latitude=lat,
        longitude=lng,
        location_source=payload.location_source or "MANUAL_SELECTION",
        urgency_level=payload.urgency_level,
        submitter_type=payload.submitter_type or "CITIZEN_INDIVIDUAL",
        submitter_org=payload.submitter_org,
        media_files=media_json,
        image_url=payload.image_url,
        language=req_lang,
        status="AI_ANALYZED"
    )
    db.add(challenge)
    db.flush()

    # 2. Duplicate Detection against existing DB challenges
    similar_list = find_similar_challenges(
        ch_id,
        f"{payload.title} {payload.description}",
        db,
        target_lat=payload.latitude,
        target_lng=payload.longitude
    )
    sim_count = len(similar_list)
    max_sim = (similar_list[0]["similarity_score"] / 100.0) if similar_list else 0.0

    # Save similarity records
    for sim in similar_list:
        db.add(ChallengeSimilarity(
            challenge_id=ch_id,
            similar_challenge_id=sim["id"],
            similarity_score=sim["similarity_score"],
            classification=sim["classification"]
        ))

    # 3. Priority Calculation
    prio = calculate_priority_score(
        severity=ai_out["severity_score"],
        urgency=ai_out["urgency_score"],
        impact=ai_out["impact_score"],
        submitter_type=challenge.submitter_type,
        similar_challenges_count=sim_count,
        max_similarity=max_sim
    )

    # Save Challenge Analysis
    analysis = ChallengeAnalysis(
        challenge_id=ch_id,
        predicted_category=cat,
        subcategory=ai_out["subcategory"],
        keywords=str(ai_out["keywords"]),
        affected_stakeholders=str(ai_out["affected_stakeholders"]),
        severity_score=ai_out["severity_score"],
        urgency_score=ai_out["urgency_score"],
        impact_score=ai_out["impact_score"],
        recurrence_score=prio["recurrence_score"],
        priority_score=prio["priority_score"],
        priority_level=prio["priority_level"],
        priority_reason=prio["priority_reason"],
        suggested_impact_areas=str(ai_out["suggested_impact_areas"])
    )
    db.add(analysis)
    # Log Activity & Notification
    db.add(ActivityLog(
        challenge_id=ch_id,
        action=f"Submitted challenge '{payload.title}' by {payload.submitter_type or 'CITIZEN_INDIVIDUAL'} — Priority {prio['priority_level']} ({prio['priority_score']:.0f})",
        performed_by=payload.submitter_org or "Civic Submitter"
    ))

    from app.services.notification_service import create_notification
    # 1. Citizen Submitter Notifications
    create_notification(
        db,
        user_id=current_user.id,
        title="Challenge successfully submitted",
        message=f"Your challenge '{payload.title[:45]}' has been successfully received and logged.",
        type="CHALLENGE",
        related_entity_type="CHALLENGE",
        related_entity_id=ch_id,
        link=f"/explorer?challenge={ch_id}"
    )

    create_notification(
        db,
        user_id=current_user.id,
        title="AI Analysis Complete",
        message=f"AI classified your challenge as '{cat}' with Priority {prio['priority_level']} (Score: {prio['priority_score']:.0f}/100).",
        type="CHALLENGE",
        related_entity_type="CHALLENGE",
        related_entity_id=ch_id,
        link=f"/explorer?challenge={ch_id}"
    )

    # 2. Government Admin High Priority Notification
    if prio["priority_level"] in ["HIGH", "CRITICAL"]:
        create_notification(
            db,
            user_role="GOVERNMENT_ADMIN",
            title="High Priority Challenge Submitted",
            message=f"A high-priority challenge '{payload.title[:40]}' was submitted in {norm_district or payload.district}. Priority Score: {prio['priority_score']:.0f}/100.",
            type="CHALLENGE",
            related_entity_type="CHALLENGE",
            related_entity_id=ch_id,
            link="/admin"
        )

    # 3. University Match Notification
    create_notification(
        db,
        user_role="UNIVERSITY",
        title="New Challenge Routed for Matching",
        message=f"New challenge '{payload.title[:40]}' in {norm_district or payload.district} is available for R&D solution matching.",
        type="CHALLENGE",
        related_entity_type="CHALLENGE",
        related_entity_id=ch_id,
        link="/institution"
    )

    db.commit()
    db.refresh(challenge)

    return get_challenge_by_id(ch_id, db)

@router.get("", response_model=List[ChallengeDetailResponse])
def list_challenges(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    citizen_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(Challenge)
    if citizen_id:
        query = query.filter(Challenge.citizen_id == citizen_id)
    if category and category != "ALL":
        query = query.filter(Challenge.category == category)
    if status and status != "ALL":
        query = query.filter(Challenge.status == status)
    if search:
        query = query.filter(
            (Challenge.title.icontains(search)) | 
            (Challenge.description.icontains(search)) |
            (Challenge.district.icontains(search))
        )
    
    challenges = query.order_by(Challenge.created_at.desc()).all()
    
    res = []
    for ch in challenges:
        if priority and priority != "ALL":
            if not ch.analysis or ch.analysis.priority_level != priority:
                continue
        res.append(format_challenge_detail(ch, db, include_full_analysis=False, current_user=current_user))
    return res

def recalculate_challenge_priority(ch: Challenge, db: Session):
    if not ch.analysis:
        return None
    an = ch.analysis
    likes_c = db.query(ChallengeLike).filter(ChallengeLike.challenge_id == ch.id).count()
    reposts_c = db.query(ChallengeRepost).filter(ChallengeRepost.challenge_id == ch.id).count()
    shares_c = db.query(ChallengeShare).filter(ChallengeShare.challenge_id == ch.id).count()
    comments_c = db.query(ChallengeComment).filter(ChallengeComment.challenge_id == ch.id).count()

    prio = calculate_priority_score(
        severity=an.severity_score,
        urgency=an.urgency_score,
        impact=an.impact_score,
        submitter_type=ch.submitter_type or "CITIZEN_INDIVIDUAL",
        likes_count=likes_c,
        reposts_count=reposts_c,
        shares_count=shares_c,
        comments_count=comments_c
    )
    
    an.priority_score = prio["priority_score"]
    an.priority_level = prio["priority_level"]
    an.priority_reason = prio["priority_reason"]
    db.commit()
    db.refresh(an)
    return prio

@router.get("/feed", response_model=List[ChallengeDetailResponse])
def get_public_civic_feed(
    tab: str = Query("for_you", description="Feed tab: for_you, trending, nearby, recent"),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(Challenge)
    if category and category != "ALL":
        query = query.filter(Challenge.category == category)
    if district and district != "ALL":
        query = query.filter(Challenge.district.icontains(district))
    if search:
        query = query.filter(
            (Challenge.title.icontains(search)) |
            (Challenge.description.icontains(search)) |
            (Challenge.district.icontains(search))
        )

    all_ch = query.all()

    if tab == "trending":
        from datetime import datetime
        import math
        def compute_trending_score(ch: Challenge) -> float:
            likes = len(ch.likes)
            reposts = len(ch.reposts)
            shares = len(ch.shares)
            comments = len(ch.comments)
            age_hours = max(0.1, (datetime.utcnow() - ch.created_at).total_seconds() / 3600.0)
            social_weight = (0.20 * likes) + (0.60 * reposts) + (0.10 * shares) + (0.10 * comments)
            base_prio = ch.analysis.priority_score if ch.analysis else 50.0
            return (base_prio + (social_weight * 10.0)) / math.pow(age_hours + 2.0, 1.2)

        all_ch.sort(key=compute_trending_score, reverse=True)

    elif tab == "nearby" and latitude is not None and longitude is not None:
        import math
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371.0  # Earth radius in km
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
            c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
            return R * c

        all_ch.sort(key=lambda c: haversine(latitude, longitude, c.latitude, c.longitude))

    elif tab == "for_you":
        all_ch.sort(key=lambda c: (c.analysis.priority_score if c.analysis else 0.0, c.created_at), reverse=True)

    else:  # recent
        all_ch.sort(key=lambda c: c.created_at, reverse=True)

    res = []
    for ch in all_ch:
        res.append(format_challenge_detail(ch, db, include_full_analysis=False, current_user=current_user))
    return res

@router.get("/my-activity", response_model=UserActivityResponse)
def get_user_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    my_submitted = db.query(Challenge).filter(Challenge.citizen_id == current_user.id).order_by(Challenge.created_at.desc()).all()
    my_ch_res = [format_challenge_detail(c, db, include_full_analysis=False, current_user=current_user) for c in my_submitted]

    liked_records = db.query(ChallengeLike).filter(ChallengeLike.user_id == current_user.id).order_by(ChallengeLike.created_at.desc()).all()
    liked_ch_ids = [l.challenge_id for l in liked_records]
    liked_challenges = db.query(Challenge).filter(Challenge.id.in_(liked_ch_ids)).all() if liked_ch_ids else []
    liked_res = [format_challenge_detail(c, db, include_full_analysis=False, current_user=current_user) for c in liked_challenges]

    reposted_records = db.query(ChallengeRepost).filter(ChallengeRepost.user_id == current_user.id).order_by(ChallengeRepost.created_at.desc()).all()
    reposted_ch_ids = [r.challenge_id for r in reposted_records]
    reposted_challenges = db.query(Challenge).filter(Challenge.id.in_(reposted_ch_ids)).all() if reposted_ch_ids else []
    reposted_res = [format_challenge_detail(c, db, include_full_analysis=False, current_user=current_user) for c in reposted_challenges]

    my_comments_objs = db.query(ChallengeComment).filter(ChallengeComment.user_id == current_user.id).order_by(ChallengeComment.created_at.desc()).all()
    comments_res = []
    for comm in my_comments_objs:
        ch = db.query(Challenge).filter(Challenge.id == comm.challenge_id).first()
        comments_res.append({
            "id": comm.id,
            "challenge_id": comm.challenge_id,
            "challenge_title": ch.title if ch else "Challenge",
            "content": comm.content,
            "created_at": comm.created_at.isoformat()
        })

    return UserActivityResponse(
        my_challenges=my_ch_res,
        liked_challenges=liked_res,
        reposted_challenges=reposted_res,
        my_comments=comments_res
    )

@router.delete("/clear-all")
def clear_all_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["GOVERNMENT_ADMIN", "CITIZEN"]))
):
    """
    Clears all challenge records, similarities, matches, projects, and activities from SQLite.
    Provides a clean slate for inputting real civic challenge data.
    """
    db.query(ChallengeSimilarity).delete()
    db.query(ChallengeMatch).delete()
    db.query(ChallengeAnalysis).delete()
    db.query(ActivityLog).delete()
    db.query(ProjectComment).delete()
    db.query(Milestone).delete()
    db.query(Project).delete()
    db.query(Challenge).delete()
    db.commit()
    return {"message": "All challenge data successfully cleared. Workspace is ready for real data input!"}

@router.get("/{id}", response_model=ChallengeDetailResponse)
def get_challenge_by_id(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return format_challenge_detail(ch, db, current_user=current_user)

@router.post("/{id}/analyze", response_model=ChallengeAnalysisResponse)
def trigger_analysis(id: str, db: Session = Depends(get_db)):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    ai_out = analyze_challenge_text(ch.title, ch.description, ch.urgency_level)
    similar_list = find_similar_challenges(ch.id, f"{ch.title} {ch.description}", db)
    max_sim = (similar_list[0]["similarity_score"] / 100.0) if similar_list else 0.0
    
    prio = calculate_priority_score(
        severity=ai_out["severity_score"],
        urgency=ai_out["urgency_score"],
        impact=ai_out["impact_score"],
        similar_challenges_count=len(similar_list),
        max_similarity=max_sim
    )

    return ChallengeAnalysisResponse(
        predicted_category=ai_out["predicted_category"],
        subcategory=ai_out["subcategory"],
        keywords=ai_out["keywords"],
        affected_stakeholders=ai_out["affected_stakeholders"],
        severity_score=ai_out["severity_score"],
        urgency_score=ai_out["urgency_score"],
        impact_score=ai_out["impact_score"],
        recurrence_score=prio["recurrence_score"],
        priority_score=prio["priority_score"],
        priority_level=prio["priority_level"],
        priority_reason=prio["priority_reason"],
        suggested_impact_areas=ai_out["suggested_impact_areas"]
    )

@router.get("/{id}/similar", response_model=List[SimilarChallengeResponse])
def get_similar_challenges(id: str, db: Session = Depends(get_db)):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    similar_list = find_similar_challenges(ch.id, f"{ch.title} {ch.description}", db)
    return [SimilarChallengeResponse(**s) for s in similar_list]

@router.get("/{id}/matches", response_model=List[InstitutionMatchResponse])
def get_institution_matches(id: str, db: Session = Depends(get_db)):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return []

@router.post("/{id}/like")
def toggle_like_challenge(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    existing = db.query(ChallengeLike).filter(
        ChallengeLike.challenge_id == id,
        ChallengeLike.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        user_liked = False
    else:
        db.add(ChallengeLike(challenge_id=id, user_id=current_user.id))
        db.commit()
        user_liked = True

    prio = recalculate_challenge_priority(ch, db)
    likes_count = db.query(ChallengeLike).filter(ChallengeLike.challenge_id == id).count()

    return {
        "user_liked": user_liked,
        "likes_count": likes_count,
        "base_priority": prio["base_priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0),
        "community_boost": prio["community_boost"] if prio else 0.0,
        "priority_score": prio["priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0),
        "priority_level": prio["priority_level"] if prio else (ch.analysis.priority_level if ch.analysis else "MEDIUM")
    }

@router.post("/{id}/repost")
def repost_challenge(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    existing = db.query(ChallengeRepost).filter(
        ChallengeRepost.challenge_id == id,
        ChallengeRepost.user_id == current_user.id
    ).first()

    if existing:
        reposts_count = db.query(ChallengeRepost).filter(ChallengeRepost.challenge_id == id).count()
        return {
            "user_reposted": True,
            "reposts_count": reposts_count,
            "message": "Already reposted this challenge."
        }

    db.add(ChallengeRepost(
        challenge_id=id,
        user_id=current_user.id,
        user_name=current_user.name
    ))
    db.commit()

    prio = recalculate_challenge_priority(ch, db)
    reposts_count = db.query(ChallengeRepost).filter(ChallengeRepost.challenge_id == id).count()

    # Notify original submitter & Government if engagement thresholds reached
    from app.services.notification_service import create_notification
    likes_count = db.query(ChallengeLike).filter(ChallengeLike.challenge_id == id).count()
    if ch.citizen_id and ch.citizen_id != current_user.id:
        create_notification(
            db,
            user_id=ch.citizen_id,
            title="Your challenge is getting attention",
            message=f"Your challenge '{ch.title[:35]}' received {likes_count} likes and {reposts_count} reposts!",
            type="SOCIAL",
            related_entity_type="CHALLENGE",
            related_entity_id=id,
            link=f"/explorer?challenge={id}"
        )

    if reposts_count >= 3:
        create_notification(
            db,
            user_role="GOVERNMENT_ADMIN",
            title="Trending Civic Challenge Alert",
            message=f"Challenge '{ch.title[:35]}' in {ch.district} reached high community engagement ({reposts_count} reposts).",
            type="CHALLENGE",
            related_entity_type="CHALLENGE",
            related_entity_id=id,
            link="/admin"
        )
    db.commit()

    return {
        "user_reposted": True,
        "reposts_count": reposts_count,
        "base_priority": prio["base_priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0),
        "community_boost": prio["community_boost"] if prio else 0.0,
        "priority_score": prio["priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0),
        "priority_level": prio["priority_level"] if prio else (ch.analysis.priority_level if ch.analysis else "MEDIUM")
    }

@router.delete("/{id}/repost")
def undo_repost_challenge(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    existing = db.query(ChallengeRepost).filter(
        ChallengeRepost.challenge_id == id,
        ChallengeRepost.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    prio = recalculate_challenge_priority(ch, db)
    reposts_count = db.query(ChallengeRepost).filter(ChallengeRepost.challenge_id == id).count()

    return {
        "user_reposted": False,
        "reposts_count": reposts_count,
        "base_priority": prio["base_priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0),
        "community_boost": prio["community_boost"] if prio else 0.0,
        "priority_score": prio["priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0)
    }

@router.post("/{id}/share")
def record_share_challenge(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if current_user:
        existing = db.query(ChallengeShare).filter(
            ChallengeShare.challenge_id == id,
            ChallengeShare.user_id == current_user.id
        ).first()
        if not existing:
            db.add(ChallengeShare(challenge_id=id, user_id=current_user.id))
            db.commit()

    prio = recalculate_challenge_priority(ch, db)
    shares_count = db.query(ChallengeShare).filter(ChallengeShare.challenge_id == id).count()

    return {
        "user_shared": True if current_user else False,
        "shares_count": shares_count,
        "community_boost": prio["community_boost"] if prio else 0.0,
        "priority_score": prio["priority_score"] if prio else (ch.analysis.priority_score if ch.analysis else 0.0)
    }

@router.get("/{id}/comments", response_model=List[ChallengeCommentResponse])
def get_challenge_comments(
    id: str,
    db: Session = Depends(get_db)
):
    comments = db.query(ChallengeComment).filter(ChallengeComment.challenge_id == id).order_by(ChallengeComment.created_at.asc()).all()
    return [
        ChallengeCommentResponse(
            id=c.id,
            challenge_id=c.challenge_id,
            user_id=c.user_id,
            author_name=c.author_name,
            author_role=c.author_role,
            content=c.content,
            is_reported=c.is_reported or False,
            created_at=c.created_at
        )
        for c in comments
    ]

@router.post("/{id}/comments", response_model=ChallengeCommentResponse)
def add_challenge_comment(
    id: str,
    payload: SocialCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty.")

    comm = ChallengeComment(
        challenge_id=id,
        user_id=current_user.id,
        author_name=current_user.name,
        author_role=current_user.role,
        content=payload.content.strip()
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)

    recalculate_challenge_priority(ch, db)

    if ch.citizen_id and ch.citizen_id != current_user.id:
        from app.services.notification_service import create_notification
        create_notification(
            db,
            user_id=ch.citizen_id,
            title="New Comment on Your Challenge",
            message=f"{current_user.name} commented on '{ch.title[:30]}': '{payload.content[:40]}...'",
            type="SOCIAL",
            related_entity_type="CHALLENGE",
            related_entity_id=id,
            link=f"/explorer?challenge={id}"
        )
        db.commit()

    return ChallengeCommentResponse(
        id=comm.id,
        challenge_id=comm.challenge_id,
        user_id=comm.user_id,
        author_name=comm.author_name,
        author_role=comm.author_role,
        content=comm.content,
        is_reported=False,
        created_at=comm.created_at
    )

@router.delete("/{id}/comments/{comment_id}")
def delete_challenge_comment(
    id: str,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comm = db.query(ChallengeComment).filter(
        ChallengeComment.id == comment_id,
        ChallengeComment.challenge_id == id
    ).first()

    if not comm:
        raise HTTPException(status_code=404, detail="Comment not found.")

    if comm.user_id != current_user.id and current_user.role != "GOVERNMENT_ADMIN":
        raise HTTPException(status_code=403, detail="You can only delete your own comments.")

    db.delete(comm)
    db.commit()

    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if ch:
        recalculate_challenge_priority(ch, db)

    return {"message": "Comment deleted successfully."}

@router.post("/{id}/comments/{comment_id}/report")
def report_challenge_comment(
    id: str,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comm = db.query(ChallengeComment).filter(
        ChallengeComment.id == comment_id,
        ChallengeComment.challenge_id == id
    ).first()

    if not comm:
        raise HTTPException(status_code=404, detail="Comment not found.")

    comm.is_reported = True
    db.commit()

    return {"message": "Comment reported to platform moderators."}

def format_challenge_detail(
    ch: Challenge,
    db: Session,
    include_full_analysis: bool = True,
    current_user: Optional[User] = None
) -> ChallengeDetailResponse:
    import json
    import ast
    def safe_parse_list(val):
        if not val:
            return []
        try:
            return ast.literal_eval(val)
        except Exception:
            return [val]

    parsed_media = []
    if ch.media_files:
        try:
            parsed_media = json.loads(ch.media_files)
        except Exception:
            parsed_media = []

    likes_count = len(ch.likes)
    reposts_count = len(ch.reposts)
    shares_count = len(ch.shares)
    comments_count = len(ch.comments)

    user_liked = bool(current_user and any(l.user_id == current_user.id for l in ch.likes))
    user_reposted = bool(current_user and any(r.user_id == current_user.id for r in ch.reposts))
    user_shared = bool(current_user and any(s.user_id == current_user.id for s in ch.shares))

    formatted_comments = [
        ChallengeCommentResponse(
            id=c.id,
            challenge_id=c.challenge_id,
            user_id=c.user_id,
            author_name=c.author_name,
            author_role=c.author_role,
            content=c.content,
            is_reported=c.is_reported or False,
            created_at=c.created_at
        )
        for c in sorted(ch.comments, key=lambda x: x.created_at)
    ]

    analysis_resp = None
    if ch.analysis:
        an = ch.analysis
        from app.services.priority_service import ENTITY_WEIGHTS, calculate_priority_score
        w_ent = ENTITY_WEIGHTS.get(ch.submitter_type or "CITIZEN_INDIVIDUAL", 1.0)
        
        prio_calc = calculate_priority_score(
            severity=an.severity_score,
            urgency=an.urgency_score,
            impact=an.impact_score,
            submitter_type=ch.submitter_type or "CITIZEN_INDIVIDUAL",
            likes_count=likes_count,
            reposts_count=reposts_count,
            shares_count=shares_count,
            comments_count=comments_count
        )

        analysis_resp = ChallengeAnalysisResponse(
            predicted_category=an.predicted_category,
            subcategory=an.subcategory,
            keywords=safe_parse_list(an.keywords),
            affected_stakeholders=safe_parse_list(an.affected_stakeholders),
            severity_score=an.severity_score,
            urgency_score=an.urgency_score,
            impact_score=an.impact_score,
            entity_weight=w_ent,
            recurrence_score=an.recurrence_score or 0.0,
            base_priority_score=prio_calc["base_priority_score"],
            community_boost=prio_calc["community_boost"],
            priority_score=prio_calc["priority_score"],
            priority_level=prio_calc["priority_level"],
            priority_reason=prio_calc["priority_reason"],
            suggested_impact_areas=safe_parse_list(an.suggested_impact_areas)
        )

    match_res = []
    if ch.matches:
        for m in ch.matches:
            match_res.append(InstitutionMatchResponse(
                institution_id=m.institution_id,
                institution_name=m.institution.name if m.institution else f"Institution #{m.institution_id}",
                city=m.institution.city if m.institution else "",
                state=m.institution.state if m.institution else "",
                match_percentage=m.match_percentage or 85.0,
                relevant_expertise=safe_parse_list(m.relevant_expertise),
                explanation=m.explanation or "",
                status=m.status or "RECOMMENDED"
            ))

    if include_full_analysis:
        similar_objs = find_similar_challenges(ch.id, f"{ch.title} {ch.description}", db)
        similar_res = [SimilarChallengeResponse(**s) for s in similar_objs]
    else:
        similar_res = []
        if ch.similarities:
            for s in ch.similarities[:5]:
                target_ch = db.query(Challenge).filter(Challenge.id == s.similar_challenge_id).first()
                if target_ch:
                    similar_res.append(SimilarChallengeResponse(
                        id=target_ch.id,
                        title=target_ch.title,
                        category=target_ch.category,
                        district=target_ch.district,
                        similarity_score=s.similarity_score,
                        classification=s.classification,
                        status=target_ch.status
                    ))

    proj_id = ch.projects[0].id if ch.projects else None
    sub_name = ch.citizen.name if ch.citizen else ("Citizen" if not ch.submitter_org else ch.submitter_org)

    return ChallengeDetailResponse(
        id=ch.id,
        citizen_id=ch.citizen_id,
        submitter_name=sub_name,
        title=ch.title,
        description=ch.description,
        category=ch.category,
        subcategory=ch.subcategory,
        location=ch.location,
        district=ch.district,
        state=ch.state,
        latitude=ch.latitude,
        longitude=ch.longitude,
        urgency_level=ch.urgency_level,
        submitter_type=ch.submitter_type or "CITIZEN_INDIVIDUAL",
        submitter_org=ch.submitter_org,
        media_files=parsed_media,
        image_url=ch.image_url,
        language=getattr(ch, 'language', 'en') or 'en',
        status=ch.status,
        created_at=ch.created_at,
        analysis=analysis_resp,
        similar_challenges=similar_res,
        recommended_institutions=match_res,
        project_id=proj_id,
        likes_count=likes_count,
        reposts_count=reposts_count,
        shares_count=shares_count,
        comments_count=comments_count,
        user_liked=user_liked,
        user_reposted=user_reposted,
        user_shared=user_shared,
        comments=formatted_comments
    )


@router.post("/translate")
@router.get("/translate")
def translate_challenge_content(
    text: str = Query(...),
    target_lang: str = Query("en"),
    source_lang: str = Query("auto")
):
    """
    Optional translation service endpoint for public challenge viewing.
    Translates provided text while keeping original intact.
    """
    from app.services.multilingual_service import translate_text
    translated, detected = translate_text(text, target_lang=target_lang, source_lang=source_lang)
    return {
        "original": text,
        "translated": translated,
        "target_lang": target_lang,
        "source_lang": detected
    }



