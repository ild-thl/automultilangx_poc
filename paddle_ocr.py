"""PaddleOCR helpers (optional dependency)."""

from __future__ import annotations

import os
import re
from threading import RLock
from time import perf_counter
from typing import Any

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

PADDLE_LANG_BY_UI: dict[str, str] = {
    "auto": "auto",
    "de": "german",
    "en": "en",
    "de+en": "german",
    "ar": "ar",
    "ru": "ru",
}

SUPPORTED_UI_LANGUAGES = frozenset(PADDLE_LANG_BY_UI)

_engines: dict[str, Any] = {}
_engine_lock = RLock()


def is_available() -> bool:
    try:
        import paddleocr  # noqa: F401

        return True
    except ImportError:
        return False


def get_engine(lang: str) -> Any:
    from paddleocr import PaddleOCR

    paddle_lang = PADDLE_LANG_BY_UI.get(lang, "german")
    with _engine_lock:
        engine = _engines.get(paddle_lang)
        if engine is None:
            engine = PaddleOCR(use_textline_orientation=True, lang=paddle_lang)
            _engines[paddle_lang] = engine
        return engine


def _sort_key_for_index(page: dict[str, Any], index: int) -> tuple[float, float]:
    boxes = page.get("rec_boxes")
    if boxes is not None and len(boxes) > index:
        box = boxes[index]
        return float(box[1]), float(box[0])

    polys = page.get("rec_polys") or []
    if index < len(polys):
        poly = polys[index]
        return float(poly[:, 1].min()), float(poly[:, 0].min())

    return float(index), 0.0


def text_from_pages(pages: list[dict[str, Any]]) -> str:
    lines: list[tuple[float, float, str]] = []
    for page in pages:
        for index, text in enumerate(page.get("rec_texts") or []):
            cleaned = text.strip()
            if cleaned:
                y, x = _sort_key_for_index(page, index)
                lines.append((y, x, cleaned))
    lines.sort(key=lambda item: (item[0], item[1]))
    return "\n".join(line[2] for line in lines)


def score_from_pages(pages: list[dict[str, Any]]) -> float:
    scores: list[float] = []
    for page in pages:
        for score in page.get("rec_scores") or []:
            try:
                scores.append(float(score))
            except (ValueError, TypeError):
                continue
    return sum(scores) / len(scores) if scores else 0.0


def detect_text_language(text: str) -> tuple[str, str]:
    if not text or not text.strip():
        return "Unbekannt", "unknown"

    has_arabic = bool(re.search(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]", text))
    has_cyrillic = bool(re.search(r"[\u0400-\u04FF]", text))
    has_latin = bool(re.search(r"[A-Za-z]", text))

    if has_arabic and has_latin:
        return "Arabisch / Englisch", "ar+en"
    if has_arabic:
        return "Arabisch", "ar"
    if has_cyrillic and has_latin:
        return "Russisch / Englisch", "ru+en"
    if has_cyrillic:
        return "Russisch", "ru"

    # Latin script: German vs. English
    text_lower = text.lower()
    if re.search(r"[äöüß]", text_lower):
        return "Deutsch", "de"

    de_words = {
        "der", "die", "das", "und", "ist", "in", "für", "mit", "auf", "nicht",
        "eine", "einer", "eines", "einem", "einen", "dem", "den", "von", "zu",
        "im", "sie", "es", "an", "er", "hat", "wir", "ihr", "oder", "aber", "auch"
    }
    en_words = {
        "the", "and", "of", "to", "in", "is", "you", "that", "it", "he", "was",
        "for", "on", "are", "as", "with", "his", "they", "at", "be", "this",
        "have", "from", "or", "one", "had", "by", "word", "but", "not", "what"
    }

    words = set(re.findall(r"\b[a-zäöüß]+\b", text_lower))
    de_matches = len(words & de_words)
    en_matches = len(words & en_words)

    if de_matches > en_matches:
        return "Deutsch", "de"
    elif en_matches > de_matches:
        return "Englisch", "en"
    elif de_matches > 0:
        return "Deutsch / Englisch", "de+en"
    return "Deutsch / Englisch", "de+en"


def recognize_image(path: str, lang: str = "auto") -> dict[str, Any]:
    started_at = perf_counter()

    if lang != "auto":
        engine = get_engine(lang)
        pages = engine.predict(path)
        text = text_from_pages(pages)
        score = score_from_pages(pages)
        lang_name, lang_code = detect_text_language(text)
        if lang == "de":
            lang_name, lang_code = "Deutsch", "de"
        elif lang == "en":
            lang_name, lang_code = "Englisch", "en"
        elif lang == "ru":
            lang_name, lang_code = "Russisch", "ru"
        elif lang == "ar":
            lang_name, lang_code = "Arabisch", "ar"
        elif lang == "de+en":
            lang_name, lang_code = "Deutsch + Englisch", "de+en"

        return {
            "text": text,
            "confidence": round(score, 3),
            "detectedLanguage": lang_name,
            "detectedLanguageCode": lang_code,
            "processingSeconds": perf_counter() - started_at,
            "engine": "paddleocr",
            "paddleLang": PADDLE_LANG_BY_UI.get(lang, "german"),
        }

    # Automatic language detection
    # 1. Try German / Latin first
    best_lang = "de"
    engine = get_engine("de")
    pages = engine.predict(path)
    text = text_from_pages(pages)
    score = score_from_pages(pages)

    # 2. Check if detection found text boxes that were dropped by the Latin recognizer
    dt_boxes = len(pages[0].get("dt_polys", [])) if pages else 0
    rec_boxes = len([t for t in (pages[0].get("rec_texts") or []) if t.strip()]) if pages else 0
    has_dropped_boxes = (dt_boxes - rec_boxes) >= 2
    latin_chars = len(re.findall(r"[A-Za-zäöüÄÖÜß]", text))

    if score < 0.70 or latin_chars < 3 or has_dropped_boxes:
        for candidate in ("ar", "ru"):
            try:
                cand_engine = get_engine(candidate)
                cand_pages = cand_engine.predict(path)
                cand_text = text_from_pages(cand_pages)
                cand_score = score_from_pages(cand_pages)
                # If candidate model recovered more text or has higher confidence
                if len(cand_text.strip()) > len(text.strip()) or cand_score > score:
                    best_lang = candidate
                    pages = cand_pages
                    text = cand_text
                    score = cand_score
                    if candidate == "ar" and re.search(r"[\u0600-\u06FF]", cand_text):
                        break
            except Exception:
                continue

    lang_name, lang_code = detect_text_language(text)
    return {
        "text": text,
        "confidence": round(score, 3),
        "detectedLanguage": lang_name,
        "detectedLanguageCode": lang_code,
        "processingSeconds": perf_counter() - started_at,
        "engine": "paddleocr",
        "paddleLang": PADDLE_LANG_BY_UI.get(best_lang, "german"),
    }
