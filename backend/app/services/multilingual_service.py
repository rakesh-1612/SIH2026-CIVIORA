import re
import json
import urllib.request
import urllib.parse
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Script Regex Patterns for Language Identification
SCRIPT_PATTERNS = {
    "hi": r"[\u0900-\u097F]",  # Devanagari (Hindi)
    "bn": r"[\u0980-\u09FF]",  # Bengali / Assamese
    "pa": r"[\u0A00-\u0A7F]",  # Gurmukhi (Punjabi)
    "gu": r"[\u0A80-\u0AFF]",  # Gujarati
    "or": r"[\u0B00-\u0B7F]",  # Odia
    "ta": r"[\u0B80-\u0BFF]",  # Tamil
    "te": r"[\u0C00-\u0C7F]",  # Telugu
    "kn": r"[\u0C80-\u0CFF]",  # Kannada
    "ml": r"[\u0D00-\u0D7F]",  # Malayalam
    "ur": r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]",  # Perso-Arabic (Urdu)
}

SUPPORTED_LANGUAGES = {
    "auto": "Auto Detect",
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu"
}

def detect_language(text: str) -> str:
    """
    Detects language code based on unicode script patterns with fallback to 'en'.
    """
    if not text or len(text.strip()) == 0:
        return "en"
    
    # Check script patterns
    for lang_code, pattern in SCRIPT_PATTERNS.items():
        if re.search(pattern, text):
            return lang_code
            
    return "en"

def translate_text(text: str, target_lang: str = "en", source_lang: str = "auto") -> Tuple[str, str]:
    """
    Translates text to target language using Google Translate public GTX RPC endpoint.
    Returns tuple: (translated_text, detected_source_language)
    Fallback gracefully to original text on connection failure or timeout.
    """
    if not text or len(text.strip()) == 0:
        return text, source_lang if source_lang != "auto" else "en"

    # If already English and target is English
    detected_script_lang = detect_language(text)
    if source_lang == "auto":
        source_lang_query = "auto"
    else:
        source_lang_query = source_lang

    if detected_script_lang == "en" and target_lang == "en" and source_lang_query == "en":
        return text, "en"

    try:
        url = (
            f"https://translate.googleapis.com/translate_a/single?client=gtx"
            f"&sl={source_lang_query}&tl={target_lang}&dt=t&q="
            + urllib.parse.quote(text)
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            translated_chunks = [item[0] for item in data[0] if item and item[0]]
            translated_text = "".join(translated_chunks)
            
            detected = source_lang
            if source_lang == "auto":
                if len(data) > 2 and isinstance(data[2], str):
                    detected = data[2]
                else:
                    detected = detected_script_lang

            return translated_text if translated_text else text, detected
    except Exception as err:
        logger.warning(f"Translation API error: {err}. Falling back to original text.")
        return text, detected_script_lang if source_lang == "auto" else source_lang
