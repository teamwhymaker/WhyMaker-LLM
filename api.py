from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from rag import process_documents, setup_rag_chain, query_rag
from dotenv import load_dotenv
import openai
from openai import OpenAI

# Initialize RAG chain and database
if not os.path.exists("chroma_db") or not os.path.exists("processed_files.json"):
    process_documents()
setup_rag_chain()

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    question: str
    chat_history: list = []
    model: str = "gpt-3.5-turbo"

@app.post("/api/chat")
async def chat(query: Query):
    # Get the answer from the RAG chain
    answer = query_rag(query.question, query.chat_history, query.model)

    # If this is the first real message, generate a title
    if len(query.chat_history) == 0:
        try:
            # Build a concise prompt for the title
            title_prompt = (
                "Summarize the following user question into a 3-5 word title. "
                f"Be concise and representative of the main topic.\n\nQuestion: '{query.question}'"
            )
            
            response = client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": "You are a title generator."},
                    {"role": "user", "content": title_prompt},
                ],
                max_tokens=15,
                temperature=0.2,
            )
            if response and response.choices:
                title_text = response.choices[0].message.content or ""
                title = title_text.strip().replace('"', "")
            else:
                title = query.question[:30] + "..."
        except Exception as e:
            print(f"Title generation failed: {e}")
            title = query.question[:30] + "..."
    else:
        # For subsequent messages, we don't need to regenerate the title
        title = None

    return {"answer": answer, "title": title} 