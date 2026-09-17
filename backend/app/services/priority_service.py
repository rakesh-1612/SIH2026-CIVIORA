import math
from typing import Dict, Any

ENTITY_WEIGHTS: Dict[str, float] = {
    "CITIZEN_INDIVIDUAL": 1.0,
    "COMMUNITY_GROUP": 1.10,
    "URBAN_LOCAL_BODY": 1.25,
    "PANCHAYAT_RAJ": 1.25
}

def calculate_community_boost(
    likes_count: int = 0,
    reposts_count: int = 0,
    shares_count: int = 0,
    comments_count: int = 0
) -> float:
    """
    Bounded Community Engagement Signal (0 - 15 points max)
    Uses logarithmic diminishing returns to prevent viral manipulation.
    Reposts carry the strongest weight (0.60).
    """
    likes = max(0, int(likes_count or 0))
    reposts = max(0, int(reposts_count or 0))
    shares = max(0, int(shares_count or 0))
    comments = max(0, int(comments_count or 0))

    weighted_score = (0.20 * likes) + (0.60 * reposts) + (0.10 * shares) + (0.10 * comments)
    if weighted_score <= 0:
        return 0.0

    # Logarithmic scaling normalized to max 15 points (reaches 15 pts at ~30 weighted interactions)
    boost_raw = 15.0 * (math.log(1.0 + weighted_score) / math.log(1.0 + 30.0))
    return round(min(15.0, max(0.0, boost_raw)), 1)

def calculate_priority_score(
    severity: float,
    urgency: float,
    impact: float,
    submitter_type: str = "CITIZEN_INDIVIDUAL",
    similar_challenges_count: int = 0,
    max_similarity: float = 0.0,
    likes_count: int = 0,
    reposts_count: int = 0,
    shares_count: int = 0,
    comments_count: int = 0
) -> Dict[str, Any]:
    """
    Authoritative single-source priority score calculation:
    Base P = 0.35 * S + 0.35 * (U * W_entity) + 0.30 * I_norm
    Final P = min(100.0, Base P + Community Boost)
    """
    try:
        severity = max(1.0, min(10.0, float(severity) if severity is not None else 5.0))
    except Exception:
        severity = 5.0
    try:
        urgency = max(1.0, min(10.0, float(urgency) if urgency is not None else 5.0))
    except Exception:
        urgency = 5.0
    try:
        impact = max(1.0, min(10.0, float(impact) if impact is not None else 5.0))
    except Exception:
        impact = 5.0

    w_entity = ENTITY_WEIGHTS.get(submitter_type, 1.0)

    s_100 = severity * 10.0
    u_100 = urgency * 10.0
    i_100 = impact * 10.0

    raw_base = (0.35 * s_100) + (0.35 * (u_100 * w_entity)) + (0.30 * i_100)
    base_priority = round(min(100.0, max(0.0, raw_base)), 1)

    community_boost = calculate_community_boost(likes_count, reposts_count, shares_count, comments_count)
    final_priority = round(min(100.0, base_priority + community_boost), 1)

    if final_priority >= 85.0:
        level = "CRITICAL"
    elif final_priority >= 65.0:
        level = "HIGH"
    elif final_priority >= 40.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    reasons = []
    if severity >= 7.5:
        reasons.append("severe hazard potential")
    if urgency >= 7.5:
        reasons.append("immediate emergency urgency")
    if impact >= 7.5:
        reasons.append("high multi-stakeholder impact")
    if community_boost > 0:
        reasons.append(f"community engagement boost (+{community_boost:.1f} pts)")

    reason_str = f"Base Priority: {base_priority:.1f} | Community Boost: +{community_boost:.1f} → Final Priority: {final_priority:.1f}/100 ({level})."

    return {
        "base_priority_score": base_priority,
        "community_boost": community_boost,
        "priority_score": final_priority,
        "priority_level": level,
        "entity_weight": w_entity,
        "recurrence_score": 0.0,
        "priority_reason": reason_str,
        "factor_breakdown": {
            "severity": round(severity, 1),
            "urgency": round(urgency, 1),
            "impact": round(impact, 1),
            "entity_weight": w_entity,
            "base_priority": base_priority,
            "community_boost": community_boost
        }
    }
