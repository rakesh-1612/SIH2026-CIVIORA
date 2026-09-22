import re
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Try importing sentence_transformers lazily
_MODEL = None
_MODEL_INITIALIZED = False

def _get_model():
    global _MODEL, _MODEL_INITIALIZED
    if not _MODEL_INITIALIZED:
        _MODEL_INITIALIZED = True
        try:
            from sentence_transformers import SentenceTransformer
            # Load lightweight all-MiniLM-L6-v2
            _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}. AI service will use deterministic NLP fallback.")
    return _MODEL

def get_text_embedding(text: str) -> List[float]:
    """Generate dense embedding for text using sentence-transformers or TF-IDF fallback vector."""
    # Preprocess text to English if in another language for optimal embedding match
    try:
        from app.services.multilingual_service import translate_text, detect_language
        if detect_language(text) != "en":
            text_en, _ = translate_text(text, target_lang="en")
            if text_en:
                text = text_en
    except Exception:
        pass

    model = _get_model()
    if model is not None:
        try:
            embedding = model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as err:
            logger.warning(f"Embedding encoding failed: {err}")
    
    # Fallback pseudo-dense vector based on hash/character distribution + length
    import numpy as np
    words = text.lower().split()
    vec = np.zeros(384, dtype=float)
    for idx, w in enumerate(words):
        pos = sum(ord(c) for c in w) % 384
        vec[pos] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


DOMAIN_KEYWORDS = {
    "Disaster Management": {
        "subcategories": ["Flood & Waterlogging", "Earthquake Mitigation", "Cyclone Preparedness", "Landslide Warning", "Fire Safety"],
        "keywords": ["flood", "flooding", "waterlogging", "subway", "cyclone", "storm", "tsunami", "fire", "earthquake", "landslide", "drainage", "overflow", "rescue", "evacuation", "disaster", "inundation"],
        "stakeholders": ["Local Residents", "Commuters", "Emergency Responders", "Disaster Response Force (NDRF)", "Municipal Workers"],
        "impact_areas": ["Public Safety", "Urban Drainage Infrastructure", "Emergency Transit Corridors", "Disaster Resilience"]
    },
    "Infrastructure": {
        "subcategories": ["Road & Bridge Safety", "Urban Transit", "Structural Health", "Power Grid", "Public Utilities"],
        "keywords": ["pothole", "bridge", "road", "highway", "subway", "overpass", "crack", "collapse", "traffic", "signal", "transit", "bus", "rail", "lighting", "street light", "electric", "power"],
        "stakeholders": ["Pedestrians", "Vehicle Drivers", "Public Transport Users", "City Engineers", "Local Merchants"],
        "impact_areas": ["Traffic Safety", "Urban Mobility", "Civic Asset Longevity", "Smart City Operations"]
    },
    "Environment": {
        "subcategories": ["Air Quality", "Water Body Pollution", "Urban Greening", "Noise Abatement", "Coastal Protection"],
        "keywords": ["pollution", "air", "smog", "lake", "river", "chemical", "toxic", "noise", "forest", "tree", "emissions", "factory", "industrial", "plastic", "biodiversity", "conservation"],
        "stakeholders": ["Urban Population", "Environmental Activists", "Local Wildlife", "Schools & Elderly", "Pollution Control Board"],
        "impact_areas": ["Public Health", "Ecosystem Preservation", "Carbon Footprint Reduction", "Environmental Compliance"]
    },
    "Water Management": {
        "subcategories": ["Drinking Water Supply", "Sewage & Pipeline Leaks", "Groundwater Recharge", "Wastewater Treatment"],
        "keywords": ["water", "sewage", "pipeline", "leakage", "drinking", "contamination", "drain", "borewell", "groundwater", "supply", "tap", "sanitation", "sewer", "sump"],
        "stakeholders": ["Household Residents", "Water Board Engineers", "Sanitation Workers", "Public Health Officials"],
        "impact_areas": ["Clean Water Access", "Sanitation Infrastructure", "Water Resource Conservation", "Disease Prevention"]
    },
    "Waste Management": {
        "subcategories": ["Solid Waste Dump Yards", "E-Waste Processing", "Plastic Waste", "Recycling & Segregation"],
        "keywords": ["garbage", "dump", "waste", "trash", "litter", "plastic", "recycling", "odor", "stench", "bins", "dumping", "compost", "e-waste"],
        "stakeholders": ["Neighborhood Residents", "Sanitation Workers", "Municipal Health Department", "Recycling Agencies"],
        "impact_areas": ["Civic Cleanliness", "Hygiene & Disease Mitigation", "Resource Recovery", "Soil & Air Hygiene"]
    },
    "Public Safety": {
        "subcategories": ["Surveillance & Lighting", "Crime Hotspots", "Pedestrian Protection", "Women Safety"],
        "keywords": ["crime", "dark", "street light", "safety", "women", "cctv", "camera", "police", "patrol", "harassment", "theft", "vandalism", "accident"],
        "stakeholders": ["Women & Children", "Night Commuters", "Local Police", "Community Watch", "Civic Authorities"],
        "impact_areas": ["Community Security", "Crime Prevention", "Safe Urban Spaces", "Civic Trust"]
    },
    "Healthcare": {
        "subcategories": ["Epidemic Warning", "Primary Health Center Access", "Medical Supply Chain", "Sanitation & Hygiene"],
        "keywords": ["disease", "dengue", "malaria", "hospital", "clinic", "doctor", "medicine", "outbreak", "fever", "mosquito", "sanitation", "ambulance", "health"],
        "stakeholders": ["Patients", "Medical Personnel", "Public Health Officers", "Economically Weaker Sections"],
        "impact_areas": ["Epidemic Prevention", "Healthcare Accessibility", "Community Well-being", "Emergency Medical Response"]
    },
    "Education": {
        "subcategories": ["School Infrastructure", "Digital Inclusion", "Skill Development", "Special Needs Support"],
        "keywords": ["school", "college", "education", "classroom", "student", "teacher", "bench", "blackboard", "computer", "internet", "skills", "youth", "library"],
        "stakeholders": ["Students", "Teachers", "Parents", "Youth Job Seekers", "Education Officers"],
        "impact_areas": ["Literacy Rate Improvement", "Youth Employability", "Digital Equity", "Educational Quality"]
    },
    "Transportation": {
        "subcategories": ["Public Transit Systems", "Traffic Flow Optimization", "Highway Safety", "Urban Freight Corridors"],
        "keywords": ["transit", "bus", "transportation", "traffic", "highway", "congestion", "freight", "vehicles", "commute", "overpass"],
        "stakeholders": ["Commuters", "Transit Authorities", "Commercial Transport Operators"],
        "impact_areas": ["Urban Mobility", "Traffic Congestion Reduction", "Transit Efficiency"]
    },
    "Energy": {
        "subcategories": ["Rural Electrification", "Grid Reliability", "Solar & Renewable Microgrids", "Power Outage Mitigation"],
        "keywords": ["power", "electricity", "grid", "solar", "microgrid", "energy", "outage", "transformer", "voltage"],
        "stakeholders": ["Rural Households", "Local Businesses", "Power Distribution Utilities"],
        "impact_areas": ["Energy Reliability", "Clean Energy Adoption", "Rural Power Quality"]
    },
    "Agriculture": {
        "subcategories": ["Irrigation Water Access", "Soil Health & Contamination", "Crop Protection", "Rural Agri-Infrastructure"],
        "keywords": ["agriculture", "crop", "irrigation", "soil", "farming", "paddy", "fields", "fertilizer", "harvest"],
        "stakeholders": ["Farmers", "Agricultural Officers", "Rural Communities"],
        "impact_areas": ["Agricultural Yield", "Food Security", "Soil Conservation"]
    }
}

def analyze_challenge_text(title: str, description: str, raw_urgency: str = "MEDIUM") -> Dict[str, Any]:
    """
    Analyzes challenge title + description to dynamically output category, keywords, severity, etc.
    Supports multilingual input through safe translation preprocessing layer.
    """
    working_title = title
    working_desc = description

    try:
        from app.services.multilingual_service import translate_text, detect_language
        if detect_language(f"{title} {description}") != "en":
            tr_title, _ = translate_text(title, target_lang="en")
            tr_desc, _ = translate_text(description, target_lang="en")
            if tr_title:
                working_title = tr_title
            if tr_desc:
                working_desc = tr_desc
    except Exception as err:
        logger.warning(f"Multilingual AI preprocessing skipped: {err}")

    combined_text = f"{working_title} {working_desc}".strip().lower()

    # Fallback for insufficient text input
    if len(combined_text) < 10:
        return {
            "predicted_category": "Infrastructure",
            "subcategory": "Requires Review (Insufficient Text)",
            "keywords": ["Not provided"],
            "affected_stakeholders": ["Local Residents"],
            "severity_score": 5.0,
            "urgency_score": 5.0,
            "impact_score": 5.0,
            "suggested_impact_areas": ["Public Safety"]
        }

    # 1. Match Domain Category based on keyword counts & text features
    scores = {}
    extracted_kw_set = set()
    
    for category, info in DOMAIN_KEYWORDS.items():
        match_count = 0
        for kw in info["keywords"]:
            if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
                match_count += 2
                extracted_kw_set.add(kw.capitalize())
            elif kw in combined_text:
                match_count += 1
                extracted_kw_set.add(kw.capitalize())
        scores[category] = match_count

    # Determine highest matching category
    best_category = max(scores, key=scores.get) if max(scores.values()) > 0 else "Infrastructure"
    cat_info = DOMAIN_KEYWORDS[best_category]

    # Select subcategory dynamically based on text hash/match
    subcat_idx = sum(ord(c) for c in combined_text) % len(cat_info["subcategories"])
    subcategory = cat_info["subcategories"][subcat_idx]

    # Clean extracted keywords using stop-words filter
    STOP_WORDS = {"about", "above", "after", "again", "against", "all", "and", "any", "are", "because", "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having", "here", "how", "into", "itself", "just", "more", "most", "other", "our", "out", "over", "same", "should", "some", "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "through", "under", "until", "very", "was", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "your", "yours", "please", "broken", "clock"}
    
    words_in_text = [w.strip(",.!?\"'").lower() for w in combined_text.split() if len(w) > 3 and w.isalpha()]
    filtered_custom_words = [w.capitalize() for w in words_in_text if w not in STOP_WORDS]
    
    all_keywords = list(extracted_kw_set) + [w for w in filtered_custom_words if w not in extracted_kw_set]
    keywords = list(dict.fromkeys(all_keywords))[:6]
    if not keywords:
        keywords = ["Civic Issue"]

    # Stakeholders
    stakeholders = cat_info["stakeholders"]

    # 2. Dynamic Score Calculations (1.0 to 10.0 scale)
    # Urgency base from user or text signals
    urgency_map = {"LOW": 3.5, "MEDIUM": 6.0, "HIGH": 8.5, "CRITICAL": 9.8}
    base_urgency = urgency_map.get(raw_urgency.upper(), 6.0)

    urgent_triggers = ["severe", "critical", "emergency", "danger", "immediately", "hazard", "life-threatening", "blocked", "stranded", "flooding", "toxic", "overflow"]
    urgency_boost = sum(1.2 for trig in urgent_triggers if trig in combined_text)
    urgency_score = round(min(10.0, max(1.0, base_urgency + urgency_boost * 0.4)), 1)

    # Severity score derived from word length, text intensity, and category weight
    text_length = len(combined_text)
    intensity_words = ["destroy", "collapse", "stranding", "toxic", "massive", "death", "injury", "fatal", "outbreak", "epidemic", "stagnant", "dumping", "heavy"]
    intensity_count = sum(1.5 for w in intensity_words if w in combined_text)
    
    base_severity = 5.0 + intensity_count + (0.5 if text_length > 150 else 0.0)
    severity_score = round(min(10.0, max(1.0, base_severity)), 1)

    # Impact score derived from affected stakeholders and scope words
    scope_words = ["public", "subway", "community", "entire", "district", "city", "neighborhood", "school", "hospital", "thousands", "vehicles", "residents"]
    scope_count = sum(1.2 for w in scope_words if w in combined_text)
    impact_score = round(min(10.0, max(1.0, 4.5 + scope_count * 0.9)), 1)

    # Suggested Impact Areas
    suggested_impact_areas = cat_info["impact_areas"]

    return {
        "predicted_category": best_category,
        "subcategory": subcategory,
        "keywords": keywords,
        "affected_stakeholders": stakeholders,
        "severity_score": severity_score,
        "urgency_score": urgency_score,
        "impact_score": impact_score,
        "suggested_impact_areas": suggested_impact_areas
    }
