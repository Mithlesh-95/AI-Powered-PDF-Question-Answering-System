import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Plus, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import GeometricCanvas from './GeometricCanvas';

export default function KnowledgeVault({ activeDocumentIds, onSelectDocument }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState({
    active: false,
    filename: '',
    progress: 0, // 0 to 100
    phase: 0, // 1 to 5
    error: null,
    currentLog: ''
  });
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchDocuments();
    // Poll for indexing files if any exist (reduced frequency to 6.5 seconds)
    const interval = setInterval(() => {
      fetchDocumentsSilently();
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error("Error loading knowledge sources:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentsSilently = async () => {
    try {
      const res = await api.get('/api/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this knowledge source from the index?")) return;
    try {
      await api.delete(`/api/documents/${id}`);
      fetchDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Failed to delete document.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const startUploadSimulation = async (file) => {
    setUploadState({
      active: true,
      filename: file.name,
      progress: 5,
      phase: 1, // 01 Extracting
      error: null,
      currentLog: 'Initializing connection to Processor Portal...'
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 1: Upload request initiates
      const response = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const docId = response.data.document_id;

      // Poll until ready, mapping backend phases directly
      let isFinished = false;
      let checkAttempts = 0;
      const maxAttempts = 120; // Allow ample time for large documents
      
      while (!isFinished && checkAttempts < maxAttempts) {
        checkAttempts++;
        
        // Wait 5 seconds between checks to reduce endpoint stress
        await new Promise(r => setTimeout(r, 5000));
        
        const checkRes = await api.get('/api/documents');
        const currentDoc = checkRes.data.find(d => d.document_id === docId);
        
        if (!currentDoc) {
          throw new Error("Document registry record not found.");
        }
        
        const status = currentDoc.status;
        const currentLog = currentDoc.current_log || "...";
        
        if (status === 'ready') {
          setUploadState(prev => ({ ...prev, phase: 5, progress: 100, currentLog: 'Ingestion completed successfully. Vector ready.' }));
          isFinished = true;
        } else if (status === 'quota_exceeded') {
          throw new Error("quota_exceeded");
        } else if (status === 'failed' || status.startsWith('error')) {
          throw new Error("Document indexing failed due to a processing error.");
        } else {
          // Map real-time statuses to progress phases
          if (status === 'uploading') {
            setUploadState(prev => ({ ...prev, phase: 1, progress: 15, currentLog }));
          } else if (status === 'processing') {
            setUploadState(prev => ({ ...prev, phase: 2, progress: 35, currentLog }));
          } else if (status === 'embedding') {
            setUploadState(prev => ({ ...prev, phase: 3, progress: 60, currentLog }));
          } else if (status === 'indexing') {
            setUploadState(prev => ({ ...prev, phase: 4, progress: 85, currentLog }));
          }
        }
      }

      if (!isFinished) {
        throw new Error("Ingestion timed out on the client.");
      }
      
      fetchDocuments();
      // Keep on success phase for 2s before dismissing modal
      await new Promise(r => setTimeout(r, 2000));
      setUploadState(prev => ({ ...prev, active: false }));

    } catch (err) {
      console.error(err);
      let detail = err.response?.data?.detail || err.message || "Failed to parse PDF.";
      if (detail === 'quota_exceeded') {
        detail = "OpenRouter API Quota Exceeded. Please configure a paid API key or try again later.";
      }
      setUploadState(prev => ({ ...prev, error: detail, currentLog: `ERROR: ${detail}` }));
      fetchDocuments();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      startUploadSimulation(files[0]);
    } else {
      alert("Please upload PDF documents only.");
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      startUploadSimulation(files[0]);
    }
  };

  const toggleDocumentSelect = (id) => {
    if (activeDocumentIds.includes(id)) {
      onSelectDocument(activeDocumentIds.filter(docId => docId !== id));
    } else {
      onSelectDocument([...activeDocumentIds, id]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brutalist-bg border-r-2 border-brutalist-ink">
      {/* Title */}
      <div className="p-6 border-b-2 border-brutalist-ink flex justify-between items-center bg-brutalist-bg">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-brutalist-muted uppercase">02 / INDEX</span>
          <h2 className="text-xl font-editorial font-extrabold tracking-tight mt-1">KNOWLEDGE VAULT</h2>
        </div>
        <button
          onClick={() => document.getElementById('vault-file-input').click()}
          className="p-2 border-2 border-brutalist-ink hover:bg-brutalist-ink hover:text-brutalist-bg transition-colors"
          title="Add Knowledge Source"
        >
          <Plus className="w-5 h-5" />
        </button>
        <input 
          id="vault-file-input"
          type="file" 
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden" 
        />
      </div>

      {/* Main Drag/List Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 overflow-y-auto p-6 transition-colors duration-200 ${
          dragOver ? 'bg-brutalist-ink/5' : ''
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-brutalist-muted">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="font-mono text-xs uppercase">Reading vault index...</span>
          </div>
        ) : documents.length === 0 ? (
          <div 
            onClick={() => document.getElementById('vault-file-input').click()}
            className="h-full border-2 border-dashed border-brutalist-ink/40 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-brutalist-ink hover:bg-brutalist-ink/[0.02] transition-all"
          >
            <Upload className="w-10 h-10 mb-4 text-brutalist-muted" />
            <h3 className="font-editorial font-bold text-lg mb-2">ADD KNOWLEDGE SOURCE</h3>
            <p className="text-xs font-mono text-brutalist-muted uppercase leading-relaxed max-w-xs">
              Drag & drop research PDF here or click to browse local directory files
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[10px] font-mono text-brutalist-muted uppercase tracking-wider pb-2 border-b border-brutalist-ink/20">
              Mounted Sources ({documents.length})
            </div>
            {documents.map((doc) => {
              const isSelected = activeDocumentIds.includes(doc.document_id);
              const isProcessing = ['uploading', 'processing', 'embedding', 'indexing'].includes(doc.status);
              const isError = doc.status === 'failed' || doc.status.startsWith('error');
              const isQuotaExceeded = doc.status === 'quota_exceeded';

              return (
                <div
                  key={doc.document_id}
                  onClick={() => !isProcessing && !isQuotaExceeded && toggleDocumentSelect(doc.document_id)}
                  className={`border-2 p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected 
                      ? 'border-brutalist-ink bg-brutalist-ink text-brutalist-bg shadow-[2px_2px_0px_rgba(5,8,22,0.15)]' 
                      : 'border-brutalist-ink hover:bg-brutalist-ink/5'
                  } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''} ${
                    isQuotaExceeded ? 'border-yellow-600 bg-yellow-50/20' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-brutalist-bg' : 'text-brutalist-ink'}`} />
                      <div className="min-w-0">
                        <h4 className="font-sans font-bold text-sm truncate uppercase tracking-tight">{doc.filename}</h4>
                        <span className="text-[9px] font-mono opacity-70 block mt-1 num-mono">
                          {doc.upload_date}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(doc.document_id, e)}
                      className={`p-1 border hover:bg-red-600 hover:text-white transition-colors shrink-0 ${
                        isSelected ? 'border-brutalist-bg hover:border-red-600' : 'border-brutalist-ink'
                      }`}
                      title="Delete Source"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-between items-center text-[10px] font-mono">
                    <span className="num-mono">
                      {isProcessing ? doc.status.toUpperCase() : isQuotaExceeded ? 'QUOTA LIMIT' : `${doc.total_pages} PAGES`}
                    </span>
                    
                    {isProcessing && (
                      <span className="flex items-center gap-1 font-bold text-brutalist-active">
                        <Loader2 className="w-3 h-3 animate-spin" /> {doc.status.toUpperCase()}
                      </span>
                    )}
                    
                    {isError && (
                      <span className="flex items-center gap-1 font-bold text-red-600" title={doc.status}>
                        <AlertCircle className="w-3 h-3" /> FAILED
                      </span>
                    )}

                    {isQuotaExceeded && (
                      <span className="flex items-center gap-1 font-bold text-yellow-600" title="API Quota Exceeded">
                        <AlertCircle className="w-3 h-3" /> QUOTA EXCEEDED
                      </span>
                    )}

                    {!isProcessing && !isError && !isQuotaExceeded && (
                      <span className={`px-2 py-0.5 border font-bold text-[9px] ${
                        isSelected 
                          ? 'border-brutalist-bg bg-brutalist-bg text-brutalist-ink' 
                          : 'border-green-600 bg-green-50 text-green-700'
                      }`}>
                        {isSelected ? 'MOUNTED' : 'READY'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Immersive AI Research Lab Processing Overlay */}
      {uploadState.active && (
        <div className="fixed inset-0 z-50 flex bg-brutalist-bg p-12 overflow-hidden">
          <div className="w-full h-full border-3 border-brutalist-ink flex flex-col lg:flex-row relative">
            
            {/* Left Header info */}
            <div className="w-full lg:w-1/3 p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-brutalist-ink flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-brutalist-muted">
                  PROCESSOR PORTAL
                </span>
                <h2 className="text-5xl font-editorial font-black leading-[1.05] tracking-tighter mt-6 uppercase">
                  ADD<br/>KNOWLEDGE<br/>SOURCE
                </h2>
                <div className="w-12 h-[3px] bg-brutalist-ink my-6"></div>
                <div className="text-sm font-mono uppercase text-brutalist-ink break-all">
                  LOG: {uploadState.filename}
                </div>
              </div>

              {uploadState.error ? (
                uploadState.error.toLowerCase().includes('quota') ? (
                  <div className="border-2 border-yellow-600 bg-yellow-50 text-yellow-900 p-4 font-mono text-xs flex gap-2 shadow-[2px_2px_0px_rgba(202,138,4,0.15)]">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold uppercase mb-1 text-yellow-700">QUOTA LIMIT EXCEEDED</div>
                      <div className="leading-relaxed">
                        OpenRouter embedding quota exceeded. Please wait and retry later or provide another API key.
                      </div>
                      <button 
                        onClick={() => setUploadState(prev => ({ ...prev, active: false }))}
                        className="mt-3 border-2 border-yellow-600 px-3 py-1 font-bold bg-yellow-600 text-white hover:bg-yellow-700 hover:border-yellow-700 transition-colors"
                      >
                        DISMISS PORTAL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-red-600 bg-red-50 text-red-800 p-4 font-mono text-xs flex gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-bold uppercase mb-1">INGESTION FAULT</div>
                      <div>{uploadState.error}</div>
                      <button 
                        onClick={() => setUploadState(prev => ({ ...prev, active: false }))}
                        className="mt-3 border border-red-600 px-3 py-1 font-bold hover:bg-red-600 hover:text-white transition-colors"
                      >
                        ABORT PORTAL
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="font-mono text-xs text-brutalist-muted uppercase">
                  INITIALIZED: {new Date().toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Center Canvas Ingestion Area */}
            <div className="flex-1 p-8 flex flex-col justify-between items-center bg-brutalist-bg">
              <div className="w-full text-center">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-brutalist-muted">
                  VIRTUAL EMBEDDING COORDINATOR
                </span>
              </div>

              <GeometricCanvas phase={uploadState.phase} width={280} height={280} />

              {/* Brutalist Console Log Box */}
              <div className="w-full max-w-sm border-2 border-brutalist-ink bg-black p-4 font-mono text-[10px] text-green-400 h-28 overflow-y-auto flex flex-col justify-end shadow-[2px_2px_0px_rgba(5,8,22,0.15)] mt-4">
                <div className="text-gray-500 mb-1 text-[8px] tracking-wider select-none font-bold uppercase">
                  Active Ingestion Feed
                </div>
                <div className="whitespace-pre-wrap leading-relaxed select-text">
                  {uploadState.currentLog || 'AWAITING LOGS FROM LAB COORDINATOR...'}
                </div>
              </div>

              <div className="w-full max-w-sm space-y-2 mt-4">
                <div className="flex justify-between font-mono text-xs">
                  <span>VECTOR CLUSTER BINDING</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="w-full border-2 border-brutalist-ink h-4 p-0.5 bg-brutalist-bg">
                  <div 
                    className="bg-brutalist-ink h-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Side Step Markers */}
            <div className="w-full lg:w-1/4 p-8 border-t-2 lg:border-t-0 lg:border-l-2 border-brutalist-ink flex flex-col justify-center space-y-6">
              <div className="text-[10px] font-mono text-brutalist-muted uppercase tracking-wider mb-2">
                INGESTION SEQUENCE
              </div>

              {[
                { step: '01', label: 'Extracting content' },
                { step: '02', label: 'Text chunking' },
                { step: '03', label: 'OpenRouter embedding' },
                { step: '04', label: 'Qdrant indexing' },
                { step: '05', label: 'Vector ready' }
              ].map((s, idx) => {
                const stepNum = idx + 1;
                const isActive = uploadState.phase === stepNum;
                const isCompleted = uploadState.phase > stepNum;

                return (
                  <div 
                    key={s.step} 
                    className={`flex items-center gap-4 border-2 p-3 transition-all ${
                      isActive 
                        ? 'border-brutalist-ink bg-brutalist-ink text-brutalist-bg scale-105 shadow-[4px_4px_0px_rgba(5,8,22,0.15)]' 
                        : isCompleted
                          ? 'border-brutalist-ink/30 text-brutalist-muted bg-brutalist-ink/5'
                          : 'border-brutalist-ink/10 text-brutalist-muted'
                    }`}
                  >
                    <span className="text-xl font-mono font-bold num-mono">{s.step}</span>
                    <div className="text-xs uppercase font-mono font-bold tracking-wider">
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
