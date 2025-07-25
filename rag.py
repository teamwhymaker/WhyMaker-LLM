import os
import openai
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, UnstructuredImageLoader
from docx import Document as DocxDocument
from pptx import Presentation
from langchain.schema import Document as TextDocument
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from typing import Optional
from langchain.chains import RetrievalQA, create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
import json

load_dotenv()

# Set up OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY not found in .env file")

# Global variables
DB_DIR = "chroma_db"
MANIFEST_FILE = "processed_files.json"
rag_chain = None

def process_documents(folder_path="uploads"):
    """
    Processes all PDF documents in the specified folder, chunks them,
    and stores their embeddings in a Chroma vector store.
    """
    print("Processing documents...", flush=True)
    
    documents = []
    # Load manifest of already processed files (filename -> mtime)
    if os.path.exists(MANIFEST_FILE):
        with open(MANIFEST_FILE, "r") as f:
            processed = json.load(f)
    else:
        processed = {}

    supported_exts = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".pptx": "pptx",
        ".jpg": "image",
        ".jpeg": "image",
        ".png": "image",
        ".svg": "image"
    }

    for filename in os.listdir(folder_path):
        if filename.startswith(('.', '~$')):
            continue  # skip hidden and temp files
        ext = os.path.splitext(filename.lower())[1]
        if ext not in supported_exts:
            continue  # skip unsupported files

        file_path = os.path.join(folder_path, filename)
        mtime = os.path.getmtime(file_path)

        # Skip files already processed and unchanged
        if processed.get(filename) == mtime:
            continue

        print(f"  - Loading {filename}", flush=True)

        # Load document based on extension
        if supported_exts[ext] == "pdf":
            loader = PyPDFLoader(file_path)
            docs = loader.load()
        elif supported_exts[ext] == "docx":
            # DOCX loader that handles paragraphs and tables
            docs = []
            doc = DocxDocument(file_path)
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    docs.append(TextDocument(page_content=text, metadata={"source": file_path}))
            for table in doc.tables:
                table_text = "\n".join([" | ".join([cell.text.strip() for cell in row.cells]) for row in table.rows])
                if table_text:
                    docs.append(TextDocument(page_content=table_text, metadata={"source": file_path, "type": "table"}))
        elif supported_exts[ext] == "pptx":
            # PPTX loader that extracts text and table content from each slide
            docs = []
            pres = Presentation(file_path)
            for i, slide in enumerate(pres.slides):
                for shape in slide.shapes:
                    if shape.has_table:
                        table = shape.table # type: ignore
                        table_text = "\n".join([" | ".join([cell.text.strip() for cell in row.cells]) for row in table.rows])
                        if table_text:
                            docs.append(TextDocument(page_content=table_text, metadata={"source": file_path, "slide": i, "type": "table"}))
                    elif shape.has_text_frame:
                        text = shape.text # type: ignore
                        if text:
                            docs.append(TextDocument(page_content=text, metadata={"source": file_path, "slide": i}))
        elif supported_exts[ext] == "image":
            loader = UnstructuredImageLoader(file_path)
            docs = loader.load()
        else:
            continue
        documents.extend(docs)
        # Update manifest entry
        processed[filename] = mtime

    if not documents:
        print("No new documents to process.")
        return

    print("  - Splitting documents into chunks...", flush=True)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)

    print(f"  - Creating and persisting vector store with {len(texts)} chunks...", flush=True)
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
    if os.path.exists(DB_DIR):
        vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        vectordb.add_documents(texts)
    else:
        Chroma.from_documents(
            documents=texts,
            embedding=embeddings,
            persist_directory=DB_DIR
        )
    # Save updated manifest
    with open(MANIFEST_FILE, "w") as f:
        json.dump(processed, f)
    print("  - Done.", flush=True)

def setup_rag_chain(model_name: str = "o4-mini"):
    """
    Sets up a conversational LangChain RAG chain for a given model.
    """
    print(f"Setting up RAG chain with model: {model_name}...", flush=True)
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
    vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    retriever = vectordb.as_retriever()
    
    llm = ChatOpenAI(model=model_name, temperature=0)

    # Contextualize question prompt
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, contextualize_q_prompt
    )

    # Answering prompt
    qa_system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, just say "
        "that you don't know. Use three sentences maximum and keep the "
        "answer concise."
        "\n\n"
        "{context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

    # Return the chain instead of setting a global variable
    return create_retrieval_chain(history_aware_retriever, question_answer_chain)


def query_rag(question: str, chat_history: Optional[list] = None, model_name: str = "o4-mini"):
    """
    Queries the RAG system with a question, history, and model name.
    """
    # Create a new chain for each query, configured with the selected model
    rag_chain = setup_rag_chain(model_name)

    if chat_history is None:
        chat_history = []
        
    converted_chat_history = []
    for message in chat_history:
        if message['role'] == 'user':
            converted_chat_history.append(HumanMessage(content=message['content']))
        elif message['role'] == 'assistant' and message['content']:
            converted_chat_history.append(AIMessage(content=message['content']))

    result = rag_chain.invoke({"input": question, "chat_history": converted_chat_history})
    
    answer = result.get("answer", "I don't have enough information to answer.")

    # --- Debugging: Print retrieved source documents ---
    if "context" in result and result["context"]:
        print("\n--- Retrieved Sources ---", flush=True)
        for doc in result["context"]:
            source = doc.metadata.get('source', 'Unknown source')
            content_preview = doc.page_content[:120].replace('\n', ' ') + "..."
            print(f"  - From: {source}\n    Preview: \"{content_preview}\"", flush=True)
        print("-------------------------\n", flush=True)
    
    return answer


def main():
    """
    Main function to run the RAG CLI.
    """
    print("Starting the RAG system...", flush=True)
    
    # Ingest documents (incremental): process new or updated files
    process_documents()

    # setup_rag_chain() # This line is removed as per the edit hint
    
    print("\nRAG system is ready. Ask your questions!", flush=True)
    print("Type 'exit' to quit.", flush=True)
    
    while True:
        user_question = input("\n> ")
        if user_question.lower() == 'exit':
            break
        
        answer = query_rag(user_question)
        print(f"\nAssistant: {answer}", flush=True)

if __name__ == "__main__":
    main() 