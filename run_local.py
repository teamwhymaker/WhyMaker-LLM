#!/usr/bin/env python3
import os
import threading
import webbrowser
from pathlib import Path

import pytesseract
import uvicorn
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Patch tiktoken for frozen environment
from tiktoken_patch import patch_tiktoken
patch_tiktoken()

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = Path.home() / ".whymaker"
UPLOAD_DIR = DATA_DIR / "uploads"
CHROMA_DIR = DATA_DIR / "chroma_db"
MANIFEST_FILE = DATA_DIR / "processed_files.json"
ENV_FILE = DATA_DIR / ".env"
UI_DIR = APP_DIR / "frontend_build"

# App version (bump when releasing)
VERSION = os.getenv("WHYMAKER_VERSION", "0.1.0")

# Ensure per-user data dirs exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Ensure a per-user .env exists (user can edit later)
if not ENV_FILE.exists():
    ENV_FILE.write_text("OPENAI_API_KEY=\n", encoding="utf-8")
# Load the per-user env (allows changing key after install)
load_dotenv(dotenv_path=ENV_FILE, override=True)

# Mark desktop mode and point application to per-user data dirs
os.environ.setdefault("WHYMAKER_DESKTOP", "1")
os.environ.setdefault("WHYMAKER_UPLOAD_DIR", str(UPLOAD_DIR))
os.environ.setdefault("WHYMAKER_CHROMA_DIR", str(CHROMA_DIR))
os.environ.setdefault("WHYMAKER_MANIFEST_FILE", str(MANIFEST_FILE))
os.environ.setdefault("WHYMAKER_ENV_FILE", str(ENV_FILE))
os.environ.setdefault("WHYMAKER_DATA_DIR", str(DATA_DIR))
# Disable Chroma telemetry/network calls in desktop app
os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("CHROMA_TELEMETRY_ENABLED", "false")
os.environ.setdefault("CHROMADB_ANONYMIZED_TELEMETRY", "false")
# Expose version and update URL to the API
os.environ.setdefault("WHYMAKER_VERSION", VERSION)
os.environ.setdefault("WHYMAKER_UPDATE_URL", os.getenv("WHYMAKER_UPDATE_URL", ""))

# Configure Tesseract OCR if bundled
TESS_BIN_UNIX = APP_DIR / "packaging" / "macos" / "bin" / "tesseract"
TESSDATA_DIR = APP_DIR / "packaging" / "macos" / "tessdata"
if TESS_BIN_UNIX.exists():
    pytesseract.pytesseract.tesseract_cmd = str(TESS_BIN_UNIX)
if TESSDATA_DIR.exists():
    os.environ["TESSDATA_PREFIX"] = str(TESSDATA_DIR)

# Import the existing FastAPI app AFTER env is configured
from api import app  # noqa: E402

# Serve the static UI (exported Next.js) at root
if UI_DIR.exists():
    app.mount("/", StaticFiles(directory=str(UI_DIR), html=True), name="ui")


def open_browser() -> None:
    # If any required setting is missing, open setup
    needs_setup = not os.getenv("OPENAI_API_KEY") or not os.getenv("GCS_BUCKET_NAME") or not os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if needs_setup:
        webbrowser.open("http://127.0.0.1:8000/setup")
    else:
        webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    # Open the browser shortly after server starts
    threading.Timer(1.0, open_browser).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)