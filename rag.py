import os
import openai
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.chains import RetrievalQA

load_dotenv()

# Set up OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY not found in .env file")

# Global variables
DB_DIR = "chroma_db"
rag_chain = None

def process_documents(folder_path="uploads"):
    """
    Processes all PDF documents in the specified folder, chunks them,
    and stores their embeddings in a Chroma vector store.
    """
    print("Processing documents...", flush=True)
    
    documents = []
    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            file_path = os.path.join(folder_path, filename)
            print(f"  - Loading {filename}", flush=True)
            loader = PyPDFLoader(file_path)
            documents.extend(loader.load())

    if not documents:
        print("No new PDF documents to process.")
        return

    print("  - Splitting documents into chunks...", flush=True)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)

    print(f"  - Creating and persisting vector store with {len(texts)} chunks...", flush=True)
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
    vectordb = Chroma.from_documents(
        documents=texts,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    print("  - Done.", flush=True)

def setup_rag_chain():
    """
    Sets up the LangChain RetrievalQA chain.
    """
    global rag_chain
    
    print("Setting up RAG chain...", flush=True)
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
    vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    
    llm = ChatOpenAI(model="o4-mini", temperature=1)
    
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
    
    # Process documents only if the database doesn't exist
    if not os.path.exists(DB_DIR):
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