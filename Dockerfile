# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Install system deps (poppler-utils for pypdf images, tesseract if needed can be added later)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Leverage Docker cache for deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Cloud Run: listen on $PORT
ENV PORT=8080 \
    PYTHONUNBUFFERED=1 \
    ANONYMIZED_TELEMETRY=false \
    CHROMA_TELEMETRY_ENABLED=false \
    CHROMADB_ANONYMIZED_TELEMETRY=false \
    WHYMAKER_UPLOAD_DIR=/tmp/uploads \
    WHYMAKER_CHROMA_DIR=/tmp/chroma_db \
    WHYMAKER_MANIFEST_FILE=/tmp/processed_files.json

RUN mkdir -p /tmp/uploads /tmp/chroma_db

# Start via Gunicorn with Uvicorn worker
CMD exec gunicorn api:app \
    --bind 0.0.0.0:${PORT} \
    --workers 1 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120