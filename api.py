from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from rag import process_documents, query_rag
from dotenv import load_dotenv
import openai
from openai import OpenAI
from fastapi import File, UploadFile, Form
from typing import List
import tempfile
import json
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, UnstructuredImageLoader
from langchain.schema import HumanMessage, AIMessage, Document as TextDocument
from docx import Document as DocxDocument
from google.cloud import storage

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://whymaker.com",
        "https://www.whymaker.com",
        # Add your Vercel app URL below
        "https://why-maker-llm.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Paths and optional GCS ---
UPLOAD_DIR = os.getenv("WHYMAKER_UPLOAD_DIR", "/tmp/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
_bucket = None

# --- Optional ingest on startup (disabled by default for Cloud Run service) ---
@app.on_event("startup")
async def on_startup():
    # Optionally sync uploads from GCS at startup
    global _bucket
    if GCS_BUCKET_NAME:
        try:
            storage_client = storage.Client()
            _bucket = storage_client.bucket(GCS_BUCKET_NAME)
            for blob in _bucket.list_blobs():
                local_path = os.path.join(UPLOAD_DIR, blob.name)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                blob.download_to_filename(local_path)
        except Exception as e:
            print(f"GCS sync skipped/failed: {e}", flush=True)

    if os.getenv("WHYMAKER_INGEST_ON_STARTUP", "false").lower() in ("1", "true", "yes"):
        process_documents(folder_path=UPLOAD_DIR)

class Query(BaseModel):
    question: str
    chat_history: list = []
    model: str = "gpt-3.5-turbo"

@app.post("/api/chat")
async def chat(
    question: str = Form(...),
    chat_history: str = Form("[]"),
    model: str = Form("gpt-3.5-turbo"),
    files: List[UploadFile] = File([]),
):
    # 1) Parse and convert history
    history_list = json.loads(chat_history)
    converted_history = []
    for msg in history_list:
        if msg["role"] == "user":
            converted_history.append(HumanMessage(content=msg["content"]))
        else:
            converted_history.append(AIMessage(content=msg["content"]))

    # 2) Load & split all uploaded files in-memory
    ephemeral_chunks = []
    if files:
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        for upload in files:
            # write to temp file
            suffix = os.path.splitext(upload.filename)[1]
            tf = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
            tf.write(await upload.read())
            tf.flush()
            tf.close()

            # load docs just like in process_documents
            if suffix.lower() == ".pdf":
                docs = PyPDFLoader(tf.name).load()
            elif suffix.lower() in [".jpg", ".jpeg", ".png", ".svg"]:
                docs = UnstructuredImageLoader(tf.name).load()
            elif suffix.lower() == ".docx":
                # simplified in‐memory DOCX loader
                temp_doc = DocxDocument(tf.name)
                docs = [TextDocument(page_content=p.text, metadata={"source": upload.filename})
                        for p in temp_doc.paragraphs if p.text.strip()]
            else:
                # fallback: treat as plain text by reading from the saved temp file
                try:
                    with open(tf.name, "rb") as f:
                        text = f.read().decode("utf-8", errors="ignore")
                except Exception:
                    text = ""
                docs = [TextDocument(page_content=text, metadata={"source": upload.filename})]

            os.unlink(tf.name)
            ephemeral_chunks.extend(splitter.split_documents(docs))

    # 3) Run the RAG query, passing these ephemeral chunks
    answer, _ = query_rag(
        question,
        converted_history,
        model_name=model,
        extra_docs=ephemeral_chunks,
    )

    # 4) Generate a chat title on the first user message
    if len(history_list) == 0:
        try:
            title_prompt = (
                "Summarize the following user question into a 3-5 word title. "
                f"Be concise and representative of the main topic.\n\n"
                f"Question: '{question}'"
            )
            response = client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": "You are a title generator for WhyMaker."},
                    {"role": "user", "content": title_prompt},
                ],
                max_tokens=15,
                temperature=0.2,
            )
            if response and response.choices:
                title = response.choices[0].message.content.strip().replace('"', "")
            else:
                title = question[:30] + "..."
        except Exception as e:
            print(f"Title generation failed: {e}")
            title = question[:30] + "..."
    else:
        title = None

    return {"answer": answer, "title": title}

@app.post("/api/upload")
async def upload(files: List[UploadFile] = File(...)):
    """
    Save each uploaded file to both GCS and local disk,
    then re-run process_documents() to ingest them.
    """
    saved = []
    for upload in files:
        content = await upload.read()
        # Upload to GCS if configured
        if GCS_BUCKET_NAME:
            try:
                storage_client = storage.Client()
                bucket_obj = storage_client.bucket(GCS_BUCKET_NAME)
                blob = bucket_obj.blob(upload.filename)
                blob.upload_from_string(content, content_type=upload.content_type)
            except Exception as e:
                print(f"GCS upload failed for {upload.filename}: {e}", flush=True)
        saved.append(upload.filename)
        # Also write locally so process_documents can pick it up
        local_path = os.path.join(UPLOAD_DIR, upload.filename)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(content)

    # Re-process only the uploads folder so these docs become queryable
    process_documents(folder_path=UPLOAD_DIR)
    return {"status": "success", "uploaded": saved} 