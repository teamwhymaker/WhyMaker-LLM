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
from typing import Optional, List
from langchain.chains import RetrievalQA, create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
import json
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document

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

class CompositeRetriever(BaseRetriever):
    """
    A custom retriever that combines results from a base retriever
    with a list of extra, in-memory documents to make it LCEL-compatible.
    """
    base_retriever: BaseRetriever
    extra_docs: List[Document]

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        """
        Get documents from the base retriever and combine with extra docs.
        """
        base_docs = self.base_retriever.get_relevant_documents(query, callbacks=run_manager.get_child())
        return base_docs + self.extra_docs


def setup_rag_chain(model_name: str = "o4-mini", retriever: BaseRetriever = None):
    """
    Sets up a conversational LangChain RAG chain for a given model.
    """
    print(f"Setting up RAG chain with model: {model_name}...", flush=True)
    if not retriever:
      embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
      vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
      retriever = vectordb.as_retriever()
    
    llm = ChatOpenAI(model=model_name)

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
        "You are a world-class business and educational assistant, specifically tailored for the WhyMaker team. "
        "Your primary goal is to help WhyMaker staff create high-quality materials, including sales scripts, "
        "marketing collateral, lesson plans, and more.\\n\\n"
        "To answer the user's request, synthesize information from two sources: "
        "1. The provided internal WhyMaker documents (retrieved context below). "
        "2. Your general knowledge for broader context and information not available in the documents.\\n\\n"
        "CRITICAL INSTRUCTIONS:\\n"
        "- Provide comprehensive, well-structured, and clear responses. Do not be overly brief.\\n"
        "- Use Markdown formatting (like ### Headers, * Bullet Points, and **bold text**) to improve readability "
        "and ensure your answers are easy to interpret.\\n"
        "- If the provided context doesn't contain a specific answer, clearly state that the information isn't "
        "in WhyMaker's documents. Then, provide the best possible answer based on your general knowledge, "
        "while noting it may not be specific to WhyMaker.\\n\\n"
        "CONTEXT:\\n{context}"
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


def query_rag(
    question: str,
    chat_history: Optional[list] = None,
    model_name: str = "o4-mini",
    extra_docs: Optional[list] = None,
):
    """
    Queries the RAG system with a question, history, and model name.
    """
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
    vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    base_retriever = vectordb.as_retriever()

    if extra_docs:
        retriever = CompositeRetriever(base_retriever=base_retriever, extra_docs=extra_docs)
    else:
        retriever = base_retriever

    # Create a new chain for each query, configured with the selected model and retriever
    rag_chain = setup_rag_chain(model_name, retriever=retriever)

    if chat_history is None:
        chat_history = []
        
    result = rag_chain.invoke({"input": question, "chat_history": chat_history})
    
    answer = result.get("answer", "I don't have enough information to answer.")

    # --- Debugging: Print retrieved source documents ---
    # This part of the original code was not included in the new_code,
    # so it is removed to match the new_code's structure.
    # if result.get("source_documents"):
    #     print("\nRetrieved documents:", flush=True)
    #     for doc in result.get("source_documents"):
    #         source = doc.metadata.get("source")
    #         content_preview = doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
    #         print(f"  - From: {source}\n    Preview: \"{content_preview}\"", flush=True)
    # print("-------------------------\n", flush=True)
    
    return answer, None # No title generation for now


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