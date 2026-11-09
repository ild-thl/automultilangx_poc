import logging
import os
import tempfile
from time import perf_counter
from pathlib import Path
from threading import RLock

from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from faster_whisper import WhisperModel
from faster_whisper.utils import available_models

import paddle_ocr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_SIZE = os.getenv("WHISPER_MODEL", "large-v3-turbo")
AVAILABLE_MODELS = frozenset(available_models())
if MODEL_SIZE not in AVAILABLE_MODELS:
    raise ValueError(f"Unbekanntes Whisper-Modell: {MODEL_SIZE}")
MAX_AUDIO_BYTES = 100 * 1024 * 1024
MAX_IMAGE_BYTES = 20 * 1024 * 1024
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
SUPPORTED_SUFFIXES = {
    ".aac",
    ".flac",
    ".m4a",
    ".mp3",
    ".mp4",
    ".mpeg",
    ".ogg",
    ".wav",
    ".webm",
    ".wma",
}
_model: WhisperModel | None = None
_model_name: str | None = None
_model_lock = RLock()

app = FastAPI(title="Leser OCR & Audio")


def get_model(model_size: str) -> WhisperModel:
    global _model, _model_name
    with _model_lock:
        if _model is None or _model_name != model_size:
            _model = None
            _model_name = None
            _model = WhisperModel(model_size, device="cpu", compute_type="int8")
            _model_name = model_size
    return _model


def transcribe_file(path: str, language: str, model_size: str) -> dict[str, Any]:
    with _model_lock:
        model = get_model(model_size)
        started_at = perf_counter()
        segments, info = model.transcribe(
            path,
            beam_size=5,
            language=None if language == "auto" else language,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        processing_seconds = perf_counter() - started_at
    prob = getattr(info, "language_probability", None)
    return {
        "text": text,
        "language": info.language,
        "languageProbability": round(float(prob), 3) if prob is not None else None,
        "duration": info.duration,
        "processingSeconds": processing_seconds,
        "model": model_size,
    }


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ready",
        "modelLoaded": _model is not None,
        "model": _model_name or MODEL_SIZE,
        "paddleOcrAvailable": paddle_ocr.is_available(),
    }


@app.post("/api/ocr")
async def ocr_image(
    file: UploadFile = File(...),
    language: str = Form("auto"),
) -> dict[str, Any]:
    if not paddle_ocr.is_available():
        raise HTTPException(
            status_code=503,
            detail="PaddleOCR ist nicht installiert. Bitte requirements.txt installieren.",
        )
    if language not in paddle_ocr.SUPPORTED_UI_LANGUAGES:
        raise HTTPException(status_code=422, detail="Bitte wähle eine unterstützte OCR-Sprache.")

    filename = Path(file.filename or "image").name
    suffix = Path(filename).suffix.lower()
    if suffix not in IMAGE_SUFFIXES:
        raise HTTPException(status_code=415, detail="Dieses Bildformat wird nicht unterstützt.")

    content = await file.read(MAX_IMAGE_BYTES + 1)
    await file.close()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Das Bild darf höchstens 20 MB groß sein.")

    temporary_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary_file:
            temporary_file.write(content)
            temporary_path = temporary_file.name
        return await run_in_threadpool(paddle_ocr.recognize_image, temporary_path, language)
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("PaddleOCR failed")
        raise HTTPException(status_code=500, detail="PaddleOCR konnte den Text nicht erkennen.") from error
    finally:
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)


@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    model: str = Form(MODEL_SIZE),
) -> dict[str, Any]:
    filename = Path(file.filename or "recording.webm").name
    suffix = Path(filename).suffix.lower()
    if not suffix and file.content_type:
        if "webm" in file.content_type:
            suffix = ".webm"
        elif "wav" in file.content_type:
            suffix = ".wav"
        elif "ogg" in file.content_type:
            suffix = ".ogg"
        elif "mp4" in file.content_type or "m4a" in file.content_type:
            suffix = ".m4a"
    if not suffix:
        suffix = ".webm"

    if suffix not in SUPPORTED_SUFFIXES:
        raise HTTPException(status_code=415, detail="Dieses Audioformat wird nicht unterstützt.")
    if language != "auto" and (len(language) > 10 or not language.replace("-", "").isalnum()):
        raise HTTPException(status_code=422, detail="Bitte wähle eine gültige Sprache.")
    if model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=422, detail="Dieses Whisper-Modell ist nicht verfügbar.")

    content = await file.read(MAX_AUDIO_BYTES + 1)
    await file.close()
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Die Audiodatei darf höchstens 100 MB groß sein.")

    temporary_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary_file:
            temporary_file.write(content)
            temporary_path = temporary_file.name
        return await run_in_threadpool(transcribe_file, temporary_path, language, model)
    except Exception as error:
        logger.exception("Audio transcription failed")
        raise HTTPException(status_code=500, detail="Die Audio-Datei konnte nicht transkribiert werden.") from error
    finally:
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)
