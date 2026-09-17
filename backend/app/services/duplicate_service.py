import numpy as np
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Challenge
from app.services.ai_service import get_text_embedding

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance in meters between two lat/lng coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 9999999.0
    R = 6371000.0  # Earth's radius in meters
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)
    a = np.sin(delta_phi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return float(R * c)

def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculates cosine similarity between two 384-dim sentence embeddings: Sc = (u . v) / (||u|| ||v||)."""
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def find_similar_challenges(
    target_challenge_id: str,
    target_text: str,
    db: Session,
    target_lat: float = None,
    target_lng: float = None,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Finds top_k similar challenges using Sentence-BERT embeddings (all-MiniLM-L6-v2, 384 dim).
    Duplicate Rule:
    IF Sc >= 0.82 (82.0%) AND distance <= 500 meters -> Potential Duplicate
    ELSE IF Sc >= 0.70 (70.0%) -> Related Challenge
    ELSE -> Different Challenge
    """
    # Fetch target challenge coordinates from DB if not provided
    if target_lat is None or target_lng is None:
        target_ch = db.query(Challenge).filter(Challenge.id == target_challenge_id).first()
        if target_ch:
            target_lat = target_ch.latitude
            target_lng = target_ch.longitude

    target_embedding = get_text_embedding(target_text)
    
    # Query existing challenges (excluding target challenge)
    existing_challenges = db.query(Challenge).filter(Challenge.id != target_challenge_id).all()
    
    results = []
    for ch in existing_challenges:
        ch_text = f"{ch.title} {ch.description}"
        ch_embedding = get_text_embedding(ch_text)
        
        sim_score = calculate_cosine_similarity(target_embedding, ch_embedding)
        sim_pct = round(sim_score * 100.0, 1)

        # Distance calculation in meters
        dist_m = haversine_distance_meters(target_lat, target_lng, ch.latitude, ch.longitude)

        # Exact Rule: Sc >= 0.82 AND distance <= 500 meters
        if sim_score >= 0.82 and dist_m <= 500.0:
            classification = "Potential Duplicate"
        elif sim_score >= 0.70:
            classification = "Related Challenge"
        else:
            classification = "Different Challenge"

        results.append({
            "id": ch.id,
            "title": ch.title,
            "category": ch.category,
            "district": ch.district,
            "similarity_score": sim_pct,
            "distance_meters": round(dist_m, 1),
            "classification": classification,
            "status": ch.status
        })

    # Sort descending by similarity score
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:top_k]
