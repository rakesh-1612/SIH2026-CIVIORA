import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Institution, Challenge
from app.services.ai_service import get_text_embedding
from app.services.duplicate_service import calculate_cosine_similarity

def match_institutions_for_challenge(
    challenge_title: str,
    challenge_description: str,
    challenge_category: str,
    db: Session,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Ranks top_k institutions based on semantic cosine similarity between challenge text
    and institution research/expertise profiles.
    Generates dynamic explanations referencing matching domain concepts.
    """
    challenge_text = f"{challenge_category} {challenge_title} {challenge_description}"
    challenge_embedding = get_text_embedding(challenge_text)
    
    institutions = db.query(Institution).all()
    results = []

    for inst in institutions:
        try:
            expertise_list = json.loads(inst.research_expertise)
            tech_list = json.loads(inst.technologies)
            domains_list = json.loads(inst.relevant_domains)
            caps_list = json.loads(inst.capabilities)
        except Exception:
            expertise_list, tech_list, domains_list, caps_list = [], [], [], []

        # Create combined profile text for embedding
        profile_text = f"{inst.name} {' '.join(expertise_list)} {' '.join(tech_list)} {' '.join(domains_list)} {' '.join(caps_list)}"
        inst_embedding = get_text_embedding(profile_text)

        sim_score = calculate_cosine_similarity(challenge_embedding, inst_embedding)
        
        # Calculate dynamic overlap of keywords/concepts
        combined_ch_words = set(challenge_text.lower().split())
        matched_topics = []
        for exp in expertise_list + tech_list + domains_list:
            exp_words = set(exp.lower().split())
            if exp_words.intersection(combined_ch_words) or any(w in challenge_text.lower() for w in exp_words if len(w) > 3):
                matched_topics.append(exp)
        
        # Ensure at least some top expertise is shown if exact string match is subtle
        if not matched_topics:
            matched_topics = expertise_list[:3]
        matched_topics = list(dict.fromkeys(matched_topics))[:4]

        # Base similarity score range 60% - 98% based on vector similarity
        match_pct = round(min(98.5, max(55.0, sim_score * 100.0 + 20.0)), 1)

        explanation = f"Matched with {match_pct:.0f}% confidence because {inst.name} holds specialized capabilities and active research in {', '.join(matched_topics[:3])} suitable for solving {challenge_category.lower()} challenges."

        results.append({
            "institution_id": inst.id,
            "institution_name": inst.name,
            "city": inst.city,
            "state": inst.state,
            "match_percentage": match_pct,
            "relevant_expertise": matched_topics,
            "explanation": explanation
        })

    # Sort descending by match percentage
    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return results[:top_k]
