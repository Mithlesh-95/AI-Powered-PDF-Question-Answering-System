import os
os.environ["TIKTOKEN_CACHE_DIR"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tiktoken_cache")
import time
from typing import List, Dict, Any, Tuple, Callable, Optional
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models

try:
    import google.api_core.exceptions
except ImportError:
    google.api_core = None

class QuotaExceededError(Exception):
    """Custom exception for Gemini API quota limits."""
    pass

# Load environment configurations
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "pdf_collection"

def get_qdrant_client() -> QdrantClient:
    """Initialize and return a Qdrant client."""
    return QdrantClient(url=QDRANT_URL)

def is_quota_error(e: Exception) -> bool:
    """Check if an exception is a quota exhaustion error."""
    err_str = str(e).lower()
    if google.api_core and isinstance(e, google.api_core.exceptions.ResourceExhausted):
        return True
    keywords = ["quota", "429", "resource_exhausted", "resourceexhausted", "rate limit", "rate_limit"]
    if any(kw in err_str for kw in keywords):
        return True
    return False

def ensure_collection(client: QdrantClient, embeddings: OpenAIEmbeddings):
    """Ensure the Qdrant collection exists with proper vector size once."""
    try:
        if not client.collection_exists(COLLECTION_NAME):
            print(f"Qdrant collection '{COLLECTION_NAME}' does not exist. Initializing dynamically...")
            sample = embeddings.embed_query("dimension_test")
            vector_size = len(sample)
            print(f"Dynamic vector size calculated: {vector_size}")
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
            print(f"Collection '{COLLECTION_NAME}' created successfully.")
        else:
            # Check dimension compatibility and recreate if mismatched
            collection_info = client.get_collection(COLLECTION_NAME)
            vectors = collection_info.config.params.vectors
            existing_size = None
            if isinstance(vectors, dict):
                val = vectors.get("") or (list(vectors.values())[0] if vectors else None)
                if val:
                    existing_size = getattr(val, "size", None) or (val.get("size") if isinstance(val, dict) else None)
            else:
                existing_size = getattr(vectors, "size", None) or (vectors.get("size") if isinstance(vectors, dict) else None)
                
            sample = embeddings.embed_query("dimension_test")
            vector_size = len(sample)
            if existing_size is not None and existing_size != vector_size:
                print(f"Dimension mismatch: existing collection size={existing_size}, new embedding size={vector_size}. Recreating collection...")
                client.delete_collection(COLLECTION_NAME)
                client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=models.VectorParams(
                        size=vector_size,
                        distance=models.Distance.COSINE
                    )
                )
                print(f"Collection '{COLLECTION_NAME}' recreated successfully with dimension {vector_size}.")
            else:
                print(f"Collection '{COLLECTION_NAME}' exists with matching/unknown dimension {existing_size}. Reusing.")
    except Exception as e:
        print(f"Error checking/creating Qdrant collection: {e}")
        raise RuntimeError(f"Could not connect to Qdrant or setup collection: {e}")

def add_chunk_with_retry(
    vector_store: QdrantVectorStore,
    text: str,
    metadata: dict,
    chunk_index: int,
    total_chunks: int,
    filename: str,
    max_retries: int = 3,
    status_callback: Callable[[str, Optional[str]], None] = None
) -> bool:
    """Ingest a single chunk with retry, backoff, and throttling."""
    delay = 2.0
    for attempt in range(1, max_retries + 1):
        log_msg = f"Embedding chunk {chunk_index}/{total_chunks}"
        if attempt > 1:
            log_msg += f" (Attempt {attempt})"
            
        try:
            print(log_msg)
            if status_callback:
                status_callback("indexing", log_msg)
                
            vector_store.add_texts(texts=[text], metadatas=[metadata])
            
            success_msg = f"Embedding chunk {chunk_index}/{total_chunks} - SUCCESS"
            if status_callback:
                status_callback("indexing", success_msg)
            return True
        except Exception as e:
            # Mandated critical diagnostic formatting
            err_msg = f"Embedding chunk {chunk_index}/{total_chunks}\nERROR: {str(e)}"
            print(f"Embedding chunk {chunk_index}/{total_chunks}")
            print(f"ERROR: {str(e)}")
            
            if status_callback:
                status_callback("indexing", err_msg)
            
            if is_quota_error(e):
                processed = chunk_index - 1
                remaining = total_chunks - processed
                # Log detailed quota diagnostics
                print("--- QUOTA DIAGNOSTICS ---")
                print(f"Document: {filename}")
                print(f"Chunks Processed: {processed}")
                print(f"Chunks Remaining: {remaining}")
                print(f"Exact Quota Error: {str(e)}")
                print("-------------------------")
                
                err_msg = "Gemini embedding quota exceeded. Please wait and retry later or provide another API key."
                if status_callback:
                    status_callback("quota_exceeded", err_msg)
                raise QuotaExceededError(f"Gemini API quota exceeded: {str(e)}")
            
            if attempt == max_retries:
                return False
                
            sleep_time = delay
            retry_log = f"Timeout/Transient error. Retrying in {sleep_time}s..."
            print(retry_log)
            if status_callback:
                status_callback("indexing", f"Embedding chunk {chunk_index}/{total_chunks} - TIMEOUT. Retrying in {sleep_time}s...")
                
            time.sleep(sleep_time)
            delay *= 2
            
    return False

def ingest_pdf(
    file_path: str,
    filename: str,
    document_id: str,
    api_key: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
    status_callback: Callable[[str, Optional[str]], None] = None
) -> int:
    """Load PDF, split into chunks, index in Qdrant with custom metadata."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # 1. Load document
    if status_callback:
        status_callback("processing", "Initializing PDF Loader and extracting content pages...")
        
    loader = PyPDFLoader(file_path=file_path)
    pages = loader.load()
    total_pages = len(pages)

    # 2. Split text
    if status_callback:
        status_callback("processing", f"Successfully extracted {total_pages} pages. Running text splitter...")
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    chunks = text_splitter.split_documents(pages)
    total_chunks = len(chunks)

    # 3. Formulate custom metadata
    client = get_qdrant_client()
    
    embeddings = OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1"
    )
    
    ensure_collection(client, embeddings)

    if status_callback:
        status_callback("embedding", f"Text chunking complete: generated {total_chunks} chunks. Preparing vectors...")

    texts = []
    metadatas = []
    
    upload_date = time.strftime("%Y-%m-%d %H:%M:%S")

    for i, chunk in enumerate(chunks):
        page_num = chunk.metadata.get("page", 0) + 1 
        
        chunk_metadata = {
            "document_id": document_id,
            "filename": filename,
            "upload_date": upload_date,
            "page_number": page_num,
            "chunk_id": f"{document_id}_{i}"
        }
        
        texts.append(chunk.page_content)
        metadatas.append(chunk_metadata)

    # 4. Insert into Qdrant VectorStore
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding=embeddings,
        validate_collection_config=False
    )
    
    total_chunks = len(texts)
    
    # Mandated critical diagnostics layout
    print("---")
    print(f"PDF: {filename}")
    print(f"Pages: {total_pages}")
    print(f"Chunks: {total_chunks}")
    print(f"Chunk Size: {chunk_size}")
    print(f"Chunk Overlap: {chunk_overlap}")
    print(f"Model: openai/text-embedding-3-small (via OpenRouter)")
    print("-------------------------")

    # Ingest chunks one-by-one (batch_size = 1) for debugging and reliability
    batch_size = 1
    
    for idx, i in enumerate(range(0, total_chunks, batch_size)):
        if status_callback:
            status_callback("indexing" if idx > 0 else "embedding")
            
        batch_texts = texts[i:i + batch_size]
        batch_metadatas = metadatas[i:i + batch_size]
        chunk_num = idx + 1
        
        success = add_chunk_with_retry(
            vector_store=vector_store,
            text=batch_texts[0],
            metadata=batch_metadatas[0],
            chunk_index=chunk_num,
            total_chunks=total_chunks,
            filename=filename,
            max_retries=3,
            status_callback=status_callback
        )
        
        if not success:
            fail_msg = f"CRITICAL failure: Skipping chunk {chunk_num}/{total_chunks} for document {filename}"
            print(fail_msg)
            if status_callback:
                status_callback("indexing", fail_msg)
            
        time.sleep(2.0)
        
    return total_pages

def delete_from_qdrant(document_id: str):
    """Delete all points associated with a specific document_id."""
    client = get_qdrant_client()
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(
                        key="metadata.document_id",
                        match=models.MatchValue(value=document_id)
                    )
                ]
            )
        )
    except Exception as e:
        print(f"Error deleting document {document_id} from Qdrant: {e}")

def map_model_name(model_name: str) -> str:
    """Map frontend/legacy model names to OpenRouter model IDs."""
    mapping = {
        "gemini-3.5-flash": "google/gemini-3.5-flash",
        "gemini-2.5-flash": "google/gemini-2.5-flash",
        "gemini-2.0-flash": "google/gemini-2.0-flash-exp",
        "gemini-2.5-pro": "google/gemini-2.5-pro"
    }
    return mapping.get(model_name, model_name)

def run_rag_query(
    query: str,
    api_key: str,
    model_name: str = "gemini-2.5-pro",
    retrieval_count: int = 4,
    temperature: float = 0.2,
    filter_document_ids: List[str] = None
) -> Dict[str, Any]:
    """Execute similarity search and generate a RAG response with citations."""
    client = get_qdrant_client()
    embeddings = OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1"
    )
    ensure_collection(client, embeddings)

    vector_store = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding=embeddings,
        validate_collection_config=False
    )

    # Formulate filter if document IDs are provided
    qdrant_filter = None
    if filter_document_ids:
        qdrant_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.document_id",
                    match=models.MatchAny(any=filter_document_ids)
                )
            ]
        )

    # Perform similarity search
    docs_with_scores = vector_store.similarity_search_with_score(
        query,
        k=retrieval_count,
        filter=qdrant_filter
    )

    # Assemble context and citations
    context_blocks = []
    citations = []
    
    for rank, (doc, score) in enumerate(docs_with_scores):
        context_blocks.append(f"[Source {rank+1} - File: {doc.metadata.get('filename')}, Page: {doc.metadata.get('page_number')}]\n{doc.page_content}")
        citations.append({
            "source_id": rank + 1,
            "filename": doc.metadata.get("filename"),
            "page_number": doc.metadata.get("page_number"),
            "text": doc.page_content,
            "score": float(score)
        })

    context = "\n\n".join(context_blocks)

    # Query LLM with instructions to cite pages
    mapped_model = map_model_name(model_name)
    llm = ChatOpenAI(
        model=mapped_model,
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        temperature=temperature
    )

    prompt = f"""
You are a research AI system analyzing document sources. Answer the user's question based ONLY on the provided context blocks. 
If the context does not contain the answer, state that you cannot find the answer in the provided documents.

For any statement you make that is derived from a source, you MUST cite it inline using the format [Source N] where N is the source rank.

Context:
{context}

Question:
{query}

Research Findings:
"""

    response = llm.invoke(prompt)
    answer = response.content

    # Estimate a simple confidence score based on vector match quality
    avg_score = sum(c["score"] for c in citations) / len(citations) if citations else 0.0
    confidence = min(max(int((avg_score + 1) * 50) if avg_score < 1.0 else int(avg_score * 100), 50), 99)
    if not citations:
        confidence = 0

    return {
        "findings": answer,
        "citations": citations,
        "confidence": confidence
    }
