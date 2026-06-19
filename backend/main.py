import os
os.environ["TIKTOKEN_CACHE_DIR"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tiktoken_cache")
import uuid
import time
import json
import shutil
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag_engine import ingest_pdf, delete_from_qdrant, run_rag_query, get_qdrant_client, QuotaExceededError

# Load backend configurations
load_dotenv()

app = FastAPI(title="DOCMIND AI API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

REGISTRY_PATH = os.path.join(DATA_DIR, "registry.json")
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
OBSERVATORY_PATH = os.path.join(DATA_DIR, "observatory.json")

# Helpers to read/write JSON files
def read_json(path: str, default_val: Any) -> Any:
    if not os.path.exists(path):
        with open(path, "w") as f:
            json.dump(default_val, f, indent=2)
        return default_val
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return default_val

def write_json(path: str, data: Any):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

# Default configuration states (Server-side key configuration only)
DEFAULT_CONFIG = {
    "model_name": "gemini-2.5-pro",
    "chunk_size": 800,
    "chunk_overlap": 150,
    "retrieval_count": 4,
    "temperature": 0.2
}

DEFAULT_OBSERVATORY = {
    "total_queries": 0,
    "total_tokens_processed": 0,
    "total_response_time_ms": 0,
    "daily_usage": {},
    "questions_per_document": {}
}

# Dependency to check API key on backend environment
def get_effective_api_key() -> str:
    env_key = os.getenv("OPENROUTER_API_KEY")
    if env_key and env_key.strip():
        return env_key.strip()
        
    raise HTTPException(
        status_code=500, 
        detail="OpenRouter API Key is not set on the server. Please check backend/.env file."
    )

# Models
class QueryRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None

class SettingsUpdate(BaseModel):
    model_name: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    retrieval_count: Optional[int] = None
    temperature: Optional[float] = None

# ----------------- ENDPOINTS -----------------

@app.get("/api/health")
def health_check():
    """Verify backend, Qdrant connection, and OpenRouter API keys."""
    qdrant_status = "connected"
    openrouter_status = "connected"
    overall_status = "healthy"
    
    try:
        client = get_qdrant_client()
        client.get_collections()
    except Exception:
        qdrant_status = "disconnected"
        overall_status = "unhealthy"
        
    try:
        get_effective_api_key()
    except Exception:
        openrouter_status = "disconnected"
        overall_status = "unhealthy"
        
    return {
        "qdrant": qdrant_status,
        "openrouter": openrouter_status,
        "status": overall_status
    }

@app.get("/api/settings")
def get_settings():
    """Return configured settings."""
    return read_json(CONFIG_PATH, DEFAULT_CONFIG)

@app.put("/api/settings")
def update_settings(update: SettingsUpdate):
    """Save setting inputs to Laboratory parameters configuration."""
    config = read_json(CONFIG_PATH, DEFAULT_CONFIG)
    update_data = update.model_dump(exclude_unset=True)
    
    for k, v in update_data.items():
        config[k] = v
        
    write_json(CONFIG_PATH, config)
    return config

@app.get("/api/documents")
def get_documents():
    """List all Knowledge Sources in Knowledge Vault."""
    return read_json(REGISTRY_PATH, [])

# Background Ingestion Process
def background_pdf_ingester(
    file_path: str,
    filename: str,
    document_id: str,
    api_key: str,
    chunk_size: int,
    chunk_overlap: int
):
    def update_status(status: str, log_message: str = None):
        reg = read_json(REGISTRY_PATH, [])
        idx = next((i for i, d in enumerate(reg) if d["document_id"] == document_id), None)
        if idx is not None:
            reg[idx]["status"] = status
            if log_message is not None:
                reg[idx]["current_log"] = log_message
            write_json(REGISTRY_PATH, reg)

    try:
        update_status("processing")
        total_pages = ingest_pdf(
            file_path=file_path,
            filename=filename,
            document_id=document_id,
            api_key=api_key,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            status_callback=update_status
        )
        
        reg = read_json(REGISTRY_PATH, [])
        idx = next((i for i, d in enumerate(reg) if d["document_id"] == document_id), None)
        if idx is not None:
            reg[idx]["status"] = "ready"
            reg[idx]["total_pages"] = total_pages
            write_json(REGISTRY_PATH, reg)
            
    except QuotaExceededError as e:
        print(f"Background ingestion error (Quota Exceeded) for {filename}: {e}")
        update_status("quota_exceeded")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Background ingestion error for {filename}: {e}")
        update_status("failed")

@app.post("/api/upload")
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    api_key: str = Depends(get_effective_api_key)
):
    """Register PDF and spin up ingestion process."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    doc_id = str(uuid.uuid4())
    filename = file.filename
    safe_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Save file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get configuration parameters
    config = read_json(CONFIG_PATH, DEFAULT_CONFIG)
    chunk_size = config.get("chunk_size", 1200)
    chunk_overlap = config.get("chunk_overlap", 600)
    
    new_doc = {
        "document_id": doc_id,
        "filename": filename,
        "upload_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_pages": 0,
        "status": "uploading"
    }
    
    registry = read_json(REGISTRY_PATH, [])
    registry.append(new_doc)
    write_json(REGISTRY_PATH, registry)
    
    background_tasks.add_task(
        background_pdf_ingester,
        file_path=file_path,
        filename=filename,
        document_id=doc_id,
        api_key=api_key,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    
    return new_doc

@app.delete("/api/documents/{document_id}")
def delete_document(document_id: str):
    """Remove PDF records and delete point indices inside Qdrant."""
    registry = read_json(REGISTRY_PATH, [])
    doc = next((d for d in registry if d["document_id"] == document_id), None)
    
    if not doc:
        raise HTTPException(status_code=440, detail="Knowledge Source not found in registry.")
        
    delete_from_qdrant(document_id)
    
    safe_filename = f"{document_id}_{doc['filename']}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            
    updated_registry = [d for d in registry if d["document_id"] != document_id]
    write_json(REGISTRY_PATH, updated_registry)
    
    return {"message": f"Successfully deleted Knowledge Source: {doc['filename']}"}

@app.post("/api/query")
def query_knowledge(
    req: QueryRequest,
    api_key: str = Depends(get_effective_api_key)
):
    """Query knowledge base and retrieve structured findings."""
    config = read_json(CONFIG_PATH, DEFAULT_CONFIG)
    model_name = config.get("model_name", "gemini-2.5-pro")
    retrieval_count = config.get("retrieval_count", 4)
    temperature = config.get("temperature", 0.2)
    
    start_time = time.time()
    
    try:
        result = run_rag_query(
            query=req.query,
            api_key=api_key,
            model_name=model_name,
            retrieval_count=retrieval_count,
            temperature=temperature,
            filter_document_ids=req.document_ids
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "403" in error_msg or "401" in error_msg or "apikey" in error_msg.lower():
            raise HTTPException(status_code=500, detail=f"OpenRouter API error: The configured API key is invalid or unauthorized.")
        raise HTTPException(status_code=500, detail=f"RAG search error: {error_msg}")
        
    end_time = time.time()
    elapsed_ms = int((end_time - start_time) * 1000)
    
    observatory = read_json(OBSERVATORY_PATH, DEFAULT_OBSERVATORY)
    
    input_chars = len(req.query) + sum(len(c["text"]) for c in result["citations"])
    output_chars = len(result["findings"])
    estimated_tokens = int((input_chars + output_chars) / 4)
    
    observatory["total_queries"] += 1
    observatory["total_tokens_processed"] += estimated_tokens
    observatory["total_response_time_ms"] += elapsed_ms
    
    today_str = time.strftime("%Y-%m-%d")
    observatory["daily_usage"][today_str] = observatory["daily_usage"].get(today_str, 0) + 1
    
    for citation in result["citations"]:
        filename = citation["filename"]
        observatory["questions_per_document"][filename] = observatory["questions_per_document"].get(filename, 0) + 1
        
    write_json(OBSERVATORY_PATH, observatory)
    
    return {
        "findings": result["findings"],
        "citations": result["citations"],
        "confidence": result["confidence"],
        "response_time_ms": elapsed_ms
    }

@app.get("/api/analytics")
def get_analytics():
    """Retrieve usage analytics for Observatory metrics cards and charts."""
    observatory = read_json(OBSERVATORY_PATH, DEFAULT_OBSERVATORY)
    registry = read_json(REGISTRY_PATH, [])
    
    avg_response_time = 0
    if observatory["total_queries"] > 0:
        avg_response_time = round(observatory["total_response_time_ms"] / observatory["total_queries"])
        
    return {
        "pdfs_uploaded": len(registry),
        "questions_asked": observatory["total_queries"],
        "total_tokens_processed": observatory["total_tokens_processed"],
        "average_response_time_ms": avg_response_time,
        "daily_usage": observatory["daily_usage"],
        "questions_per_document": observatory["questions_per_document"]
    }
