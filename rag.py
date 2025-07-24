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
from langchain.chains import RetrievalQA
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

def setup_rag_chain():
    """
    Sets up the LangChain RetrievalQA chain.
    """
    global rag_chain
    
    print("Setting up RAG chain...", flush=True)
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
    vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    
    rag_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectordb.as_retriever(),
        return_source_documents=True
    )
    print("RAG chain is ready.", flush=True)


def query_rag(question):
    """

    Queries the RAG system with a question.
    """
    if not rag_chain:
        return "RAG chain is not set up."
        
    result = rag_chain.invoke({"query": question})
    
    # --- Debugging: Print retrieved source documents ---
    if "source_documents" in result:
        print("\n--- Retrieved Sources ---", flush=True)
        for doc in result["source_documents"]:
            source = doc.metadata.get('source', 'Unknown source')
            content_preview = doc.page_content[:120].replace('\n', ' ') + "..."
            print(f"  - From: {source}\n    Preview: \"{content_preview}\"", flush=True)
        print("-------------------------\n", flush=True)
    # --- End Debugging ---

    # Check for source documents
    if result.get("source_documents"):
        return result['result']
    else:
        return "I don't have enough information to answer."


def main():
    """
    Main function to run the RAG CLI.
    """
    print("Starting the RAG system...", flush=True)
    
    # Ingest documents (incremental): process new or updated files
    process_documents()

    setup_rag_chain()
    
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