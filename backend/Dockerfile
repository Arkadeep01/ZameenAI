# ZameenAI backend — production-ready image for Render + local verification.
# Context: build from backend/ directory.
#   docker build -t zameenai-backend:test -f Dockerfile .
# Entrypoint: app.main:app (WORKDIR /app == backend/).
# NOTE: POST /api/upload writes to <repo-root>/data/uploads, i.e. /data/uploads
# inside this container. The digitization pipeline (app/ocr, APP_DIR anchor)
# writes originals + phase artifacts under /app/app/uploads/.
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

WORKDIR /app

# System deps:
# - Tesseract + eng/hin/ben/osd data (registry requires eng + hin verified,
#   ben verified; osd used for orientation/PSM fallback).
# - OpenCV/Pillow runtime libs (opencv-python wheel needs libGL/libglib;
#   libsm6/libxext6/libxrender1 are its X11 linkage on Debian slim).
# - libpq5 for psycopg2/PostGIS connectivity; curl for health/doc checks.
# No secrets, no DB credentials, no API keys baked in.
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-hin \
        tesseract-ocr-ben \
        tesseract-ocr-osd \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && tesseract --version \
    && ls -l "$TESSDATA_PREFIX" \
    && test -f "$TESSDATA_PREFIX/eng.traineddata" \
    && test -f "$TESSDATA_PREFIX/hin.traineddata" \
    && test -f "$TESSDATA_PREFIX/ben.traineddata" \
    && test -f "$TESSDATA_PREFIX/osd.traineddata"

# Python deps (includes Pillow, opencv-python, numpy, pydantic-settings,
# pytesseract, pymupdf required by the merged OCR pipeline).
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code + project-local tessdata fallback (see app/ocr/paths.py).
COPY app/ ./app/
COPY tessdata/ ./tessdata/

# Non-root runtime user + required writable upload/processing directories.
RUN useradd -m -u 10001 appuser \
    && mkdir -p /data/uploads /app/data/uploads \
    && mkdir -p /app/app/uploads/originals /app/app/uploads/processing \
    && chown -R appuser:appuser /app /data

USER appuser

EXPOSE 8000

# Render provides $PORT; default to 8000 for local `docker run`.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
